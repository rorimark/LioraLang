const DECK_PACKAGE_FORMAT = "lioralang.deck";
const LEGACY_DECK_PACKAGE_FORMATS = ["lioradeck", "lioralang"];
const SUPPORTED_DECK_PACKAGE_FORMATS = new Set([
  "",
  DECK_PACKAGE_FORMAT,
  ...LEGACY_DECK_PACKAGE_FORMATS,
]);
const WORD_LIST_KEYS = ["words", "cards", "items", "entries", "data"];
const MAX_WORDS_PER_PACKAGE = 50_000;

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const parseDeckPackagePayload = (value) => {
  if (Array.isArray(value)) {
    if (value.length > MAX_WORDS_PER_PACKAGE) {
      throw new Error(`Deck package contains too many words (max ${MAX_WORDS_PER_PACKAGE})`);
    }

    return {
      format: "",
      version: null,
      words: value,
    };
  }

  if (!value || typeof value !== "object") {
    throw new Error("JSON must contain an array of words or a deck package object");
  }

  const words = WORD_LIST_KEYS.reduce((resolvedWords, key) => {
    if (resolvedWords) {
      return resolvedWords;
    }

    return Array.isArray(value[key]) ? value[key] : null;
  }, null);

  if (!Array.isArray(words)) {
    throw new Error("Deck package must include a words array");
  }

  if (words.length > MAX_WORDS_PER_PACKAGE) {
    throw new Error(`Deck package contains too many words (max ${MAX_WORDS_PER_PACKAGE})`);
  }

  const format = toCleanString(value.format);

  if (!SUPPORTED_DECK_PACKAGE_FORMATS.has(format)) {
    throw new Error(`Unsupported deck package format: ${format}`);
  }

  return {
    format,
    version: value.version ?? null,
    words,
  };
};

const validateDeckPackageObject = (value) => {
  const parsedPackage = parseDeckPackagePayload(value);

  return {
    format: parsedPackage.format,
    version: parsedPackage.version,
    wordsCount: Array.isArray(parsedPackage.words) ? parsedPackage.words.length : 0,
  };
};

export { validateDeckPackageObject };
