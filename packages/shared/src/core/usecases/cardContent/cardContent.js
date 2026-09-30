// What a vocabulary entry holds, and how one entry becomes the two sides of
// a card.
//
// An entry has content of different types. Text is written in one of the
// deck's languages (the word, its translation); an image shows the thing
// itself. An image is a content type, never a language: it has no language
// code, only an asset it points to.
//
// One entry, one SRS card. A direction only decides which content goes on
// the front and which on the back, so "picture → word" and "word → picture"
// are ways of showing the same entry, not extra cards to schedule.

export const CONTENT_TYPES = Object.freeze({
  text: "text",
  image: "image",
});

// The text an entry carries: the word itself and its translation(s).
export const TEXT_ROLES = Object.freeze({
  source: "source",
  translation: "translation",
});

export const CARD_DIRECTIONS = Object.freeze({
  sourceToTarget: "source_to_target",
  targetToSource: "target_to_source",
  imageToSource: "image_to_source",
  sourceToImage: "source_to_image",
  mixed: "mixed",
});

export const MAX_IMAGE_ALT_LENGTH = 200;

// Assets are named by the SHA-256 of their bytes, so the same picture is
// stored once however many words, decks or devices use it.
const ASSET_ID_PATTERN = /^[a-f0-9]{64}$/;

export const isMediaAssetId = (value) =>
  typeof value === "string" && ASSET_ID_PATTERN.test(value);

const parseMaybeJson = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

// An entry's picture as stored: the asset it points to and a description
// for people who cannot see it. Anything else is no picture.
export const normalizeWordImage = (value) => {
  const parsed = parseMaybeJson(value);

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const assetId = String(parsed.assetId ?? "").trim().toLowerCase();

  if (!isMediaAssetId(assetId)) {
    return null;
  }

  const alt = typeof parsed.alt === "string"
    ? parsed.alt.replace(/\s+/g, " ").trim().slice(0, MAX_IMAGE_ALT_LENGTH)
    : "";

  return { assetId, alt };
};

export const hasWordImage = (word) => Boolean(normalizeWordImage(word?.image));

export const isImageDirection = (direction) =>
  direction === CARD_DIRECTIONS.imageToSource || direction === CARD_DIRECTIONS.sourceToImage;

const SIDES = Object.freeze({
  source: Object.freeze({ type: CONTENT_TYPES.text, role: TEXT_ROLES.source }),
  translation: Object.freeze({ type: CONTENT_TYPES.text, role: TEXT_ROLES.translation }),
  image: Object.freeze({ type: CONTENT_TYPES.image }),
});

// Each direction as a pair of sides. `detail` is shown under the answer:
// naming a picture asks for the word, and the translation follows it.
export const CARD_PRESENTATIONS = Object.freeze({
  [CARD_DIRECTIONS.sourceToTarget]: Object.freeze({ front: SIDES.source, back: SIDES.translation }),
  [CARD_DIRECTIONS.targetToSource]: Object.freeze({ front: SIDES.translation, back: SIDES.source }),
  [CARD_DIRECTIONS.imageToSource]: Object.freeze({
    front: SIDES.image,
    back: SIDES.source,
    detail: SIDES.translation,
  }),
  [CARD_DIRECTIONS.sourceToImage]: Object.freeze({ front: SIDES.source, back: SIDES.image }),
});

const hashValue = (value) => {
  const source = String(value || "");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash;
};

// The direction one entry is actually shown in. "Mixed" alternates between
// the two text directions, the same way for the same entry every time. A
// picture direction needs a picture: an entry without one is shown as text,
// word first, so a deck with a few pictures still studies every word.
export const resolveCardDirection = (direction = CARD_DIRECTIONS.sourceToTarget, word = {}) => {
  if (direction === CARD_DIRECTIONS.mixed) {
    const mixedSeed =
      word?.wordId ?? word?.id ?? word?.externalId ?? word?.source ?? word?.target ?? "";

    return hashValue(mixedSeed) % 2 === 0
      ? CARD_DIRECTIONS.sourceToTarget
      : CARD_DIRECTIONS.targetToSource;
  }

  if (isImageDirection(direction)) {
    return hasWordImage(word) ? direction : CARD_DIRECTIONS.sourceToTarget;
  }

  return CARD_PRESENTATIONS[direction] ? direction : CARD_DIRECTIONS.sourceToTarget;
};

const TRANSLATION_SEPARATOR = " • ";

const buildTranslationText = (word) =>
  [word?.target, word?.tertiary]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(TRANSLATION_SEPARATOR);

export const buildSideContent = (side, word = {}) => {
  if (!side) {
    return null;
  }

  if (side.type === CONTENT_TYPES.image) {
    const image = normalizeWordImage(word?.image);
    return image ? { type: CONTENT_TYPES.image, ...image } : null;
  }

  const text = side.role === TEXT_ROLES.source
    ? (typeof word?.source === "string" ? word.source.trim() : "")
    : buildTranslationText(word);

  return { type: CONTENT_TYPES.text, role: side.role, text };
};

// Both sides of the card one entry makes in a direction.
export const resolveCardFaces = (word, direction) => {
  const resolvedDirection = resolveCardDirection(direction, word);
  const presentation = CARD_PRESENTATIONS[resolvedDirection];

  return {
    direction: resolvedDirection,
    front: buildSideContent(presentation.front, word),
    back: buildSideContent(presentation.back, word),
    detail: buildSideContent(presentation.detail, word),
  };
};
