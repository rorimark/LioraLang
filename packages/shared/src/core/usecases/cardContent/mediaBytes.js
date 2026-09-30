// Bytes of a stored picture, and the checks every picture passes before it
// is kept. Runs the same in the browser and in the desktop main process.

// Pictures are recompressed when they are added (see lib/media), so one is
// rarely over a few hundred kilobytes. A file from elsewhere may be larger,
// but not without limit.
export const MAX_MEDIA_ASSET_BYTES = 3 * 1024 * 1024;

export const MEDIA_MIME_TYPES = Object.freeze({
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
});

const startsWith = (bytes, signature, offset = 0) =>
  signature.every((value, index) => bytes[offset + index] === value);

// The format a file really is, read from its first bytes rather than taken
// from its name or a declared type. SVG and anything else that can carry
// script is not a picture here.
export const sniffImageMimeType = (bytes) => {
  if (!bytes || bytes.length < 12) {
    return "";
  }

  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return MEDIA_MIME_TYPES.jpeg;
  }

  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return MEDIA_MIME_TYPES.png;
  }

  if (startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) && startsWith(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return MEDIA_MIME_TYPES.webp;
  }

  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return MEDIA_MIME_TYPES.gif;
  }

  return "";
};

const CHUNK_SIZE = 0x8000;

export const bytesToBase64 = (bytes) => {
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK_SIZE));
  }

  return btoa(binary);
};

export const base64ToBytes = (value) => {
  const clean = typeof value === "string" ? value.replace(/^data:[^,]*,/, "").replace(/\s+/g, "") : "";

  if (!clean || !/^[A-Za-z0-9+/]+={0,2}$/.test(clean)) {
    return null;
  }

  try {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return bytes;
  } catch {
    return null;
  }
};
