// What a vocabulary entry holds, and how one entry becomes the two sides of
// a card.
//
// A deck has two sides. Each is either text in a language (English,
// Polish…) or a picture. A picture is a content type, never a language: a
// deck "Picture → Polish" has no source language at all, and its words
// carry a picture ({ assetId, alt }) where other decks carry a word.
//
// One entry, one SRS card. The direction only decides which side goes on
// the front, so in a picture deck "source → target" is picture → word and
// "target → source" is word → picture, with nothing new to schedule.

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
  mixed: "mixed",
});

// Which side of a deck, if any, is a picture. At most one: a deck needs
// text on the other side to be a vocabulary deck.
export const PICTURE_SIDES = Object.freeze({
  none: "",
  source: "source",
  target: "target",
});

export const normalizePictureSide = (value) =>
  value === PICTURE_SIDES.source || value === PICTURE_SIDES.target ? value : PICTURE_SIDES.none;

// Which side of a deck holds the language being learned. The source, unless
// the deck says otherwise: examples are written in the source language and
// the target is its translation, but some people fill a deck the other way
// round. Only "target" is ever stored, so a deck that keeps the default
// reads, exports and hashes exactly as before.
export const LEARNED_SIDES = Object.freeze({
  source: "source",
  target: "target",
});

export const normalizeLearnedSide = (value) =>
  value === LEARNED_SIDES.target ? LEARNED_SIDES.target : LEARNED_SIDES.source;

// What a deck stores for its learned side: "target", or nothing.
export const storedLearnedSide = (value) =>
  normalizeLearnedSide(value) === LEARNED_SIDES.target ? LEARNED_SIDES.target : "";

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

// An entry is worth keeping when its first side has something on it: the
// word, or in a picture deck, the picture.
export const hasWordContent = (word) =>
  Boolean((typeof word?.source === "string" && word.source.trim()) || hasWordImage(word));

const hashValue = (value) => {
  const source = String(value || "");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash;
};

// The direction one entry is actually shown in. "Mixed" alternates between
// the two, the same way for the same entry every time.
export const resolveCardDirection = (direction = CARD_DIRECTIONS.sourceToTarget, word = {}) => {
  if (direction === CARD_DIRECTIONS.mixed) {
    const mixedSeed =
      word?.wordId ?? word?.id ?? word?.externalId ?? word?.source ?? word?.target ?? "";

    return hashValue(mixedSeed) % 2 === 0
      ? CARD_DIRECTIONS.sourceToTarget
      : CARD_DIRECTIONS.targetToSource;
  }

  return direction === CARD_DIRECTIONS.targetToSource
    ? CARD_DIRECTIONS.targetToSource
    : CARD_DIRECTIONS.sourceToTarget;
};

const TRANSLATION_SEPARATOR = " • ";

const buildTranslationText = (word) =>
  [word?.target, word?.tertiary]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean)
    .join(TRANSLATION_SEPARATOR);

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

// What one side of the deck shows for an entry. A picture side whose
// picture is missing falls back to the picture's description, so the card
// still has something to ask.
export const buildSideContent = (side, word = {}, deck = {}) => {
  const isPictureSide = normalizePictureSide(deck?.pictureSide) === side;
  const image = normalizeWordImage(word?.image);

  if (isPictureSide && image) {
    return { type: CONTENT_TYPES.image, ...image };
  }

  const text = side === PICTURE_SIDES.source ? cleanText(word?.source) : buildTranslationText(word);

  return {
    type: CONTENT_TYPES.text,
    role: side === PICTURE_SIDES.source ? TEXT_ROLES.source : TEXT_ROLES.translation,
    text: text || (isPictureSide ? image?.alt || "" : ""),
  };
};

// Both sides of the card one entry makes in a direction.
export const resolveCardFaces = (word, direction, deck = {}) => {
  const resolvedDirection = resolveCardDirection(direction, word);
  const [frontSide, backSide] = resolvedDirection === CARD_DIRECTIONS.targetToSource
    ? [PICTURE_SIDES.target, PICTURE_SIDES.source]
    : [PICTURE_SIDES.source, PICTURE_SIDES.target];

  return {
    direction: resolvedDirection,
    front: buildSideContent(frontSide, word, deck),
    back: buildSideContent(backSide, word, deck),
  };
};
