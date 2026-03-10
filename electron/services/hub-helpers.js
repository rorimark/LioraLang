const MAX_DECK_TAGS = 10;
const MAX_TARGET_LANGUAGES = 2;
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeTextArray = (value, maxItems = 100, maxLength = 120) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = [];
  const seen = new Set();

  value.forEach((item) => {
    const text = toCleanString(item).slice(0, maxLength);
    const key = text.toLowerCase();

    if (!text || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalized.push(text);
  });

  return normalized.slice(0, maxItems);
};

const parseTags = (value) => {
  if (Array.isArray(value)) {
    return normalizeTextArray(value, MAX_DECK_TAGS, 64);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeTextArray(parsed, MAX_DECK_TAGS, 64);
  } catch {
    return [];
  }
};

const toLanguageKey = (value) => toCleanString(value).toLowerCase();

const toTitleKey = (value) =>
  toCleanString(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const normalizeTargetLanguages = (value, sourceLanguage = "") => {
  const sourceKey = toLanguageKey(sourceLanguage);
  const targets = normalizeTextArray(value, MAX_TARGET_LANGUAGES, 64);

  return targets
    .filter((item) => toLanguageKey(item) !== sourceKey)
    .slice(0, MAX_TARGET_LANGUAGES);
};

const toPublishableDeck = (value = {}) => {
  const title = toCleanString(value?.name || value?.title).slice(0, MAX_TITLE_LENGTH);
  const sourceLanguage = toCleanString(value?.sourceLanguage).slice(0, 64);
  const targetLanguage = toCleanString(value?.targetLanguage).slice(0, 64);
  const tertiaryLanguage = toCleanString(value?.tertiaryLanguage).slice(0, 64);
  const targetLanguages = normalizeTargetLanguages(
    [targetLanguage, tertiaryLanguage],
    sourceLanguage,
  );

  return {
    title,
    titleKey: toTitleKey(title),
    description: toCleanString(value?.description).slice(0, MAX_DESCRIPTION_LENGTH),
    sourceLanguage,
    targetLanguages,
    targetLanguageKeys: targetLanguages.map(toLanguageKey),
    tags: parseTags(value?.tags ?? value?.tagsJson),
    wordsCount: Number.isFinite(Number(value?.wordsCount))
      ? Math.max(0, Math.trunc(Number(value.wordsCount)))
      : 0,
  };
};

const validatePublishableDeck = (publishableDeck) => {
  if (!publishableDeck?.title) {
    throw new Error("Deck title is required for publish");
  }

  if (!publishableDeck?.sourceLanguage) {
    throw new Error("Deck source language is required for publish");
  }

  if (!Array.isArray(publishableDeck?.targetLanguages) || publishableDeck.targetLanguages.length === 0) {
    throw new Error("Deck target language is required for publish");
  }
};

const resolveExistingDeckByTitle = (decks = [], publishableDeck = {}) => {
  const expectedTitleKey = toTitleKey(publishableDeck.title);

  if (!expectedTitleKey) {
    return null;
  }

  return decks.find((deck) => {
    const deckTitle = toCleanString(deck?.title);

    if (toTitleKey(deckTitle) !== expectedTitleKey) {
      return false;
    }

    return true;
  }) || null;
};

export {
  normalizeTextArray,
  parseTags,
  toLanguageKey,
  toTitleKey,
  toPublishableDeck,
  validatePublishableDeck,
  resolveExistingDeckByTitle,
};
