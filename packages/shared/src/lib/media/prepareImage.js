// Turns a picture someone chose into what a card keeps: redrawn at a size a
// card can use, recompressed, and with a small copy for lists. Redrawing
// also drops whatever the file carried besides pixels (camera, location).
//
// A card is at most ~600 CSS px wide, so 1280 px on the long side is sharp on
// a 2x screen; a phone photo of 12 MB becomes roughly 150–400 KB.

export const IMAGE_MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const IMAGE_FULL_MAX_SIDE = 1280;
export const IMAGE_THUMB_MAX_SIDE = 320;
export const IMAGE_TARGET_BYTES = 450 * 1024;
const QUALITY_STEPS = [0.86, 0.78, 0.7, 0.62];
const THUMB_QUALITY = 0.8;

export const IMAGE_ERROR_KEYS = Object.freeze({
  notImage: "media.errors.notImage",
  tooLarge: "media.errors.tooLarge",
  unreadable: "media.errors.unreadable",
});

const imageError = (i18nKey) => {
  const error = new Error(i18nKey);
  error.i18nKey = i18nKey;
  return error;
};

// Vector files can carry script, and a card has no use for one.
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp"]);
export const IMAGE_ACCEPT_ATTRIBUTE = [...ACCEPTED_TYPES].join(",");

export const validateImageFile = (file) => {
  if (!file || typeof file !== "object") {
    throw imageError(IMAGE_ERROR_KEYS.notImage);
  }

  if (!ACCEPTED_TYPES.has(String(file.type || "").toLowerCase())) {
    throw imageError(IMAGE_ERROR_KEYS.notImage);
  }

  if (Number(file.size) > IMAGE_MAX_INPUT_BYTES) {
    throw imageError(IMAGE_ERROR_KEYS.tooLarge);
  }
};

// The size a picture is drawn at: never enlarged, the long side capped.
export const fitWithin = (width, height, maxSide) => {
  const safeWidth = Math.max(1, Math.round(Number(width) || 1));
  const safeHeight = Math.max(1, Math.round(Number(height) || 1));
  const scale = Math.min(1, maxSide / Math.max(safeWidth, safeHeight));

  return {
    width: Math.max(1, Math.round(safeWidth * scale)),
    height: Math.max(1, Math.round(safeHeight * scale)),
  };
};

const decodeImage = async (file) => {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Some browsers refuse the options bag; the element path below works.
    }
  }

  const url = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.decoding = "async";
    image.src = url;
    await image.decode();
    return image;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });

const draw = (source, { width, height }, background = "") => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, width, height);
  return canvas;
};

// WebP where the browser can write it (it keeps transparency and is small);
// JPEG on a white ground where it cannot (older Safari writes PNG instead).
const encode = async (source, size, qualitySteps, targetBytes) => {
  let canvas = draw(source, size);
  let type = "image/webp";
  let blob = await canvasToBlob(canvas, type, qualitySteps[0]);

  if (!blob || blob.type !== type) {
    type = "image/jpeg";
    canvas = draw(source, size, "#ffffff");
    blob = await canvasToBlob(canvas, type, qualitySteps[0]);
  }

  for (const quality of qualitySteps.slice(1)) {
    if (!blob || blob.size <= targetBytes) {
      break;
    }

    blob = await canvasToBlob(canvas, type, quality);
  }

  if (!blob) {
    throw imageError(IMAGE_ERROR_KEYS.unreadable);
  }

  return { blob, mimeType: type, width: size.width, height: size.height };
};

export const prepareCardImage = async (file) => {
  validateImageFile(file);

  let source;

  try {
    source = await decodeImage(file);
  } catch {
    throw imageError(IMAGE_ERROR_KEYS.unreadable);
  }

  try {
    const naturalWidth = source.width || source.naturalWidth;
    const naturalHeight = source.height || source.naturalHeight;

    if (!naturalWidth || !naturalHeight) {
      throw imageError(IMAGE_ERROR_KEYS.unreadable);
    }

    const full = await encode(
      source,
      fitWithin(naturalWidth, naturalHeight, IMAGE_FULL_MAX_SIDE),
      QUALITY_STEPS,
      IMAGE_TARGET_BYTES,
    );
    const thumb = await encode(
      source,
      fitWithin(naturalWidth, naturalHeight, IMAGE_THUMB_MAX_SIDE),
      [THUMB_QUALITY],
      Infinity,
    );

    return { full, thumb };
  } finally {
    source.close?.();
  }
};

// A small copy made later, for a picture that arrived without one (from a
// file or another device).
export const makeThumbnail = async (blob) => {
  const source = await decodeImage(blob);

  try {
    return await encode(
      source,
      fitWithin(source.width || source.naturalWidth, source.height || source.naturalHeight, IMAGE_THUMB_MAX_SIDE),
      [THUMB_QUALITY],
      Infinity,
    );
  } finally {
    source.close?.();
  }
};
