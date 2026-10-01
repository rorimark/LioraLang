import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from "../../../config/languages.js";
import {
  buildDeckContentHash,
  normalizeDeckOriginKind,
  normalizeDeckOriginRef,
  normalizeDeckSyncId,
} from "../sync/deckIdentity.js";
import {
  base64ToBytes,
  isMediaAssetId,
  MAX_MEDIA_ASSET_BYTES,
  normalizePictureSide,
  normalizeWordImage,
  PICTURE_SIDES,
  sniffImageMimeType,
  storedLearnedSide,
} from "../cardContent/index.js";

const DECK_PACKAGE_FORMAT = "lioralang.deck";
const DECK_PACKAGE_VERSION = 1;
const MAX_DECK_TAGS = 10;
const MAX_WORD_TAGS = 10;
const MAX_WORD_EXAMPLES = 1000;
const MAX_WORDS_PER_PACKAGE = 50_000;
const MAX_TEXT_LENGTH = 500;
const MAX_DESCRIPTION_LENGTH = 2_000;
const LEGACY_DECK_PACKAGE_FORMATS = ["lioradeck", "lioralang"];
const SUPPORTED_DECK_PACKAGE_FORMATS = new Set([
  "",
  DECK_PACKAGE_FORMAT,
  ...LEGACY_DECK_PACKAGE_FORMATS,
]);
const WORD_LIST_KEYS = ["words", "cards", "items", "entries", "data"];
const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const DUPLICATE_STRATEGIES = new Set(["skip", "update", "keep_both"]);
// Pictures travel inside the package as `media`, each named by the SHA-256
// of its bytes; a word points at one with `image.assetId`. Both are
// optional, so a package without pictures is exactly what it always was,
// and an older app reading a package with pictures keeps the words.
const MAX_MEDIA_PER_PACKAGE = 10_000;

const LANGUAGE_VALUE_ALIASES = {
  english: ["en", "eng", "english"],
  ukrainian: ["uk", "ua", "ukr", "ukrainian"],
  russian: ["ru", "rus", "russian"],
  polish: ["pl", "pol", "polish"],
  german: ["de", "ger", "deu", "german"],
  spanish: ["es", "spa", "spanish"],
  french: ["fr", "fre", "fra", "french"],
  italian: ["it", "ita", "italian"],
  portuguese: ["pt", "por", "portuguese"],
  turkish: ["tr", "tur", "turkish"],
  czech: ["cs", "cze", "ces", "czech"],
  japanese: ["ja", "jp", "jpn", "japanese"],
};

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toSafeString = (value, maxLength = MAX_TEXT_LENGTH) =>
  toCleanString(value).slice(0, maxLength);

const toCleanArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toCleanArrayFromMaybeString = (value) => {
  if (Array.isArray(value)) {
    return toCleanArray(value);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const toCleanArrayLimited = (value, maxItems, maxTextLength = MAX_TEXT_LENGTH) =>
  toCleanArray(value)
    .map((item) => item.slice(0, maxTextLength))
    .slice(0, maxItems);

const toUniqueArray = (value) => {
  const uniqueValues = [];
  const seen = new Set();

  toCleanArray(value).forEach((item) => {
    const key = item.toLowerCase();

    if (!key || seen.has(key)) {
      return;
    }

    seen.add(key);
    uniqueValues.push(item);
  });

  return uniqueValues;
};

const normalizeTags = (value) => toUniqueArray(value).slice(0, MAX_DECK_TAGS);

const parseTagsValue = (value) => {
  if (Array.isArray(value)) {
    return normalizeTags(value);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeTags(parsed);
  } catch {
    return [];
  }
};

const toLanguageKey = (value) => toCleanString(value).toLowerCase();

const sanitizeFieldKey = (value) => {
  return value.replace(/\s+/g, "_");
};

const normalizeLookupKey = (value) =>
  toCleanString(value)
    .toLowerCase()
    .replace(/[\s_-]+/g, "")
    .replace(/[^a-z0-9]/g, "");

const buildLanguageAliases = (language, fallbackAliases = []) => {
  const normalizedLanguage = toLanguageKey(language);
  const configuredAliases = LANGUAGE_VALUE_ALIASES[normalizedLanguage] || [];
  const languageAliases = normalizedLanguage
    ? [
        normalizedLanguage,
        sanitizeFieldKey(normalizedLanguage),
        normalizeLookupKey(normalizedLanguage),
      ]
    : [];

  return [...new Set([...configuredAliases, ...languageAliases, ...fallbackAliases])];
};

const resolveWordValueByAliases = (word, aliases = []) => {
  if (!word || typeof word !== "object" || Array.isArray(word)) {
    return "";
  }

  const sourceMap = new Map();

  Object.entries(word).forEach(([key, value]) => {
    const normalizedKey = toCleanString(key).toLowerCase();
    const normalizedLookupKey = normalizeLookupKey(key);

    if (normalizedKey) {
      sourceMap.set(normalizedKey, value);
    }

    if (normalizedLookupKey) {
      sourceMap.set(normalizedLookupKey, value);
    }
  });

  for (const alias of aliases) {
    const aliasKey = toCleanString(alias).toLowerCase();
    const aliasLookupKey = normalizeLookupKey(alias);
    const resolvedValue = toCleanString(
      sourceMap.get(aliasKey) ?? sourceMap.get(aliasLookupKey),
    );

    if (resolvedValue) {
      return resolvedValue;
    }
  }

  return "";
};

const parseDeckPackagePayload = (value) => {
  if (Array.isArray(value)) {
    if (value.length > MAX_WORDS_PER_PACKAGE) {
      throw new Error(`Deck package contains too many words (max ${MAX_WORDS_PER_PACKAGE})`);
    }

    return {
      format: "",
      version: null,
      deck: null,
      words: value,
      media: [],
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

  const rawDeck = value.deck && typeof value.deck === "object"
    ? value.deck
    : value;
  const deckName = toSafeString(rawDeck?.name || rawDeck?.title);
  const deckDescription = toSafeString(
    rawDeck?.description || rawDeck?.deckDescription,
    MAX_DESCRIPTION_LENGTH,
  );
  const deckSourceLanguage = toSafeString(
    rawDeck?.sourceLanguage || rawDeck?.source_language,
  );
  const deckTargetLanguage = toSafeString(
    rawDeck?.targetLanguage || rawDeck?.target_language,
  );
  const deckTertiaryLanguage = toSafeString(
    rawDeck?.tertiaryLanguage || rawDeck?.tertiary_language,
  );
  const deckTags = normalizeTags(rawDeck?.tags ?? rawDeck?.tagsJson);
  const deckSyncId = normalizeDeckSyncId(rawDeck?.syncId ?? rawDeck?.sync_id);
  const deckOriginKind = normalizeDeckOriginKind(
    rawDeck?.originKind ?? rawDeck?.origin_kind,
  );
  const deckOriginRef = normalizeDeckOriginRef(
    rawDeck?.originRef ?? rawDeck?.origin_ref,
  );
  const deckContentHash = toSafeString(
    rawDeck?.contentHash ?? rawDeck?.content_hash,
  );
  const deckPictureSide = normalizePictureSide(rawDeck?.pictureSide ?? rawDeck?.picture_side);
  const deckLearnedSide = storedLearnedSide(rawDeck?.learnedSide ?? rawDeck?.learned_side);
  const hasDeckMetadata = Boolean(
    deckName ||
    deckDescription ||
    deckSourceLanguage ||
    deckTargetLanguage ||
    deckTertiaryLanguage ||
    deckTags.length > 0 ||
    deckSyncId ||
    deckOriginRef ||
    deckContentHash ||
    deckPictureSide ||
    deckLearnedSide,
  );
  const deck = hasDeckMetadata
    ? {
        name: deckName,
        description: deckDescription,
        sourceLanguage: deckSourceLanguage,
        targetLanguage: deckTargetLanguage,
        tertiaryLanguage: deckTertiaryLanguage,
        tags: deckTags,
        syncId: deckSyncId,
        originKind: deckOriginKind,
        originRef: deckOriginRef,
        contentHash: deckContentHash,
        pictureSide: deckPictureSide,
        learnedSide: deckLearnedSide,
      }
    : null;

  const parsedVersion = Number(value.version);
  const normalizedVersion = Number.isFinite(parsedVersion) ? parsedVersion : null;

  if (
    format === DECK_PACKAGE_FORMAT &&
    Number.isFinite(normalizedVersion) &&
    normalizedVersion > DECK_PACKAGE_VERSION
  ) {
    throw new Error(
      `Deck package version ${normalizedVersion} is not supported by this app version`,
    );
  }

  return {
    format,
    version: normalizedVersion,
    deck,
    words,
    media: Array.isArray(value.media) ? value.media.slice(0, MAX_MEDIA_PER_PACKAGE) : [],
  };
};

const resolveImportLanguageConfig = (value = {}, pictureSide = "") => {
  const sourceLanguage = pictureSide === PICTURE_SIDES.source
    ? ""
    : toCleanString(value?.sourceLanguage) || DEFAULT_SOURCE_LANGUAGE;
  const targetLanguage = pictureSide === PICTURE_SIDES.target
    ? ""
    : toCleanString(value?.targetLanguage) || DEFAULT_TARGET_LANGUAGE;
  const tertiaryLanguage = toCleanString(value?.tertiaryLanguage);

  return {
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage,
    duplicateStrategy: DUPLICATE_STRATEGIES.has(value?.duplicateStrategy)
      ? value.duplicateStrategy
      : "skip",
    includeExamples:
      typeof value?.includeExamples === "boolean" ? value.includeExamples : true,
    includeTags:
      typeof value?.includeTags === "boolean" ? value.includeTags : true,
  };
};

const normalizeWordLevel = (value) => {
  const normalizedValue = toCleanString(value).toUpperCase();

  if (!ALLOWED_LEVELS.has(normalizedValue)) {
    return null;
  }

  return normalizedValue;
};

const normalizeImportedWord = (
  word,
  index,
  {
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage,
  },
) => {
  const normalizedTags = toCleanArrayLimited(
    toCleanArrayFromMaybeString(word?.tags ?? word?.tag),
    MAX_WORD_TAGS,
  );
  const normalizedExamples = toCleanArrayLimited(
    Array.isArray(word?.examples) ? word.examples : [word?.example],
    MAX_WORD_EXAMPLES,
    1_000,
  );
  const source = resolveWordValueByAliases(
    word,
    buildLanguageAliases(sourceLanguage, [
      "source",
      "source_text",
      "term",
      "word",
      "front",
      "question",
      "eng",
      "en",
    ]),
  );

  const image = normalizeWordImage(word?.image);

  // A word in a picture deck may have its picture where the word would be.
  if (!source && !image) {
    return null;
  }

  const target = resolveWordValueByAliases(
    word,
    buildLanguageAliases(targetLanguage, [
      "target",
      "target_text",
      "translation",
      "meaning",
      "back",
      "answer",
      "ru",
      "rus",
    ]),
  );

  const tertiary = tertiaryLanguage
    ? resolveWordValueByAliases(
        word,
        buildLanguageAliases(tertiaryLanguage, [
          "tertiary",
          "tertiary_text",
          "optional",
          "alt",
          "translation_2",
          "pl",
          "pol",
        ]),
      )
    : "";

  return {
    externalId: toSafeString(String(word?.id ?? `imported-${index + 1}`)),
    source: toSafeString(source),
    target: toSafeString(target),
    tertiary: toSafeString(tertiary),
    level: normalizeWordLevel(word?.level),
    part_of_speech: toSafeString(
      word?.part_of_speech || word?.partOfSpeech || word?.part || word?.pos,
    ),
    tags: normalizedTags,
    examples: normalizedExamples,
    image,
  };
};

export const parseDeckPackageFileText = (text) => {
  const normalizedText = typeof text === "string"
    ? text.replace(/^\uFEFF/, "").trim()
    : "";

  if (!normalizedText) {
    throw new Error("Deck file is empty");
  }

  let parsed;

  try {
    parsed = JSON.parse(normalizedText);
  } catch {
    throw new Error("Deck file is not a valid JSON payload");
  }

  return parseDeckPackagePayload(parsed);
};

export const validateDeckPackageObject = (value) => {
  const parsedPackage = parseDeckPackagePayload(value);

  return {
    format: parsedPackage.format,
    version: parsedPackage.version,
    wordsCount: Array.isArray(parsedPackage.words) ? parsedPackage.words.length : 0,
  };
};

export const getDeckImportMetadata = ({
  parsedPackage,
  fileName = "",
} = {}) => {
  if (!parsedPackage || typeof parsedPackage !== "object") {
    return {
      suggestedDeckName: "Imported Deck",
      wordsCount: 0,
      sourceLanguage: "",
      targetLanguage: "",
      tertiaryLanguage: "",
      tags: [],
      description: "",
      syncId: "",
      originKind: "local",
      originRef: "",
      contentHash: "",
      pictureSide: "",
      learnedSide: "",
      format: "",
      version: null,
    };
  }

  const fallbackDeckName = toCleanString(fileName).replace(/\.[^/.]+$/, "") || "Imported Deck";

  return {
    suggestedDeckName: parsedPackage?.deck?.name || fallbackDeckName,
    wordsCount: Array.isArray(parsedPackage.words) ? parsedPackage.words.length : 0,
    sourceLanguage: parsedPackage?.deck?.sourceLanguage || "",
    targetLanguage: parsedPackage?.deck?.targetLanguage || "",
    tertiaryLanguage: parsedPackage?.deck?.tertiaryLanguage || "",
    tags: normalizeTags(parsedPackage?.deck?.tags),
    description: toSafeString(parsedPackage?.deck?.description, MAX_DESCRIPTION_LENGTH),
    syncId: normalizeDeckSyncId(parsedPackage?.deck?.syncId),
    originKind: normalizeDeckOriginKind(parsedPackage?.deck?.originKind),
    originRef: normalizeDeckOriginRef(parsedPackage?.deck?.originRef),
    contentHash: toSafeString(parsedPackage?.deck?.contentHash),
    pictureSide: normalizePictureSide(parsedPackage?.deck?.pictureSide),
    learnedSide: storedLearnedSide(parsedPackage?.deck?.learnedSide),
    format: toCleanString(parsedPackage?.format),
    version: parsedPackage?.version ?? null,
  };
};

export const normalizeWordsForImport = ({
  parsedPackage,
  sourceLanguage,
  targetLanguage,
  tertiaryLanguage,
  duplicateStrategy,
  includeTags,
  includeExamples,
} = {}) => {
  const words = Array.isArray(parsedPackage?.words) ? parsedPackage.words : [];

  const normalizedWords = words
    .map((word, index) =>
      normalizeImportedWord(word, index, {
        sourceLanguage,
        targetLanguage,
        tertiaryLanguage,
      }),
    )
    .filter(Boolean)
    .map((word) => ({
      ...word,
      tags: includeTags ? word.tags : [],
      examples: includeExamples ? word.examples : [],
    }));

  let skippedCount = words.length - normalizedWords.length;

  if (duplicateStrategy === "keep_both") {
    return {
      words: normalizedWords,
      skippedCount,
    };
  }

  const keyToIndex = new Map();
  const dedupedWords = [];

  normalizedWords.forEach((word) => {
    const dedupeKey = [
      toLanguageKey(word.source),
      toLanguageKey(word.target),
      toLanguageKey(word.tertiary),
      // Two pictures with the same translation are two words.
      ...(word.image ? [word.image.assetId] : []),
    ].join("\u0000");

    if (!dedupeKey.replaceAll("\u0000", "")) {
      dedupedWords.push(word);
      return;
    }

    if (!keyToIndex.has(dedupeKey)) {
      keyToIndex.set(dedupeKey, dedupedWords.length);
      dedupedWords.push(word);
      return;
    }

    skippedCount += 1;

    if (duplicateStrategy === "update") {
      const existingIndex = keyToIndex.get(dedupeKey);

      if (typeof existingIndex === "number") {
        dedupedWords[existingIndex] = word;
      }
    }
  });

  return {
    words: dedupedWords,
    skippedCount,
  };
};

export const resolveImportConfig = ({
  payload = {},
  parsedPackage = {},
  fallbackDeckName = "Imported Deck",
} = {}) => {
  // A picture side has no language; the other side keeps its own.
  const pictureSide = normalizePictureSide(payload?.pictureSide ?? parsedPackage?.deck?.pictureSide);
  const settings = resolveImportLanguageConfig(payload?.settings || {}, pictureSide);
  const sourceLanguage = pictureSide === PICTURE_SIDES.source
    ? ""
    : toSafeString(payload?.sourceLanguage) ||
      toSafeString(parsedPackage?.deck?.sourceLanguage) ||
      settings.sourceLanguage ||
      DEFAULT_SOURCE_LANGUAGE;
  const targetLanguage = pictureSide === PICTURE_SIDES.target
    ? ""
    : toSafeString(payload?.targetLanguage) ||
      toSafeString(parsedPackage?.deck?.targetLanguage) ||
      settings.targetLanguage ||
      DEFAULT_TARGET_LANGUAGE;
  const tertiaryLanguage =
    toSafeString(payload?.tertiaryLanguage) ||
    toSafeString(parsedPackage?.deck?.tertiaryLanguage) ||
    settings.tertiaryLanguage;
  const deckName =
    toSafeString(payload?.deckName) ||
    toSafeString(parsedPackage?.deck?.name) ||
    fallbackDeckName ||
    "Imported Deck";

  return {
    deckName,
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage,
    duplicateStrategy: settings.duplicateStrategy,
    includeExamples: settings.includeExamples,
    includeTags: settings.includeTags,
    description: toSafeString(parsedPackage?.deck?.description, MAX_DESCRIPTION_LENGTH),
    tags: settings.includeTags ? normalizeTags(parsedPackage?.deck?.tags) : [],
    syncId:
      normalizeDeckSyncId(payload?.syncId) ||
      normalizeDeckSyncId(parsedPackage?.deck?.syncId),
    originKind: normalizeDeckOriginKind(
      payload?.originKind || parsedPackage?.deck?.originKind,
    ),
    originRef:
      normalizeDeckOriginRef(payload?.originRef) ||
      normalizeDeckOriginRef(parsedPackage?.deck?.originRef),
    contentHash:
      toSafeString(payload?.contentHash) ||
      toSafeString(parsedPackage?.deck?.contentHash),
    pictureSide,
    learnedSide: storedLearnedSide(payload?.learnedSide ?? parsedPackage?.deck?.learnedSide),
  };
};

// Each text side needs a language, and no two sides share one. A picture
// side has none.
export const validateImportLanguages = ({
  sourceLanguage,
  targetLanguage,
  tertiaryLanguage,
  pictureSide = "",
} = {}) => {
  const side = normalizePictureSide(pictureSide);
  const sourceKey = toLanguageKey(sourceLanguage);
  const targetKey = toLanguageKey(targetLanguage);
  const tertiaryKey = toLanguageKey(tertiaryLanguage);

  if ((side !== PICTURE_SIDES.source && !sourceKey) || (side !== PICTURE_SIDES.target && !targetKey)) {
    throw new Error("Source and target languages are required for import");
  }

  if (sourceKey && sourceKey === targetKey) {
    throw new Error("Source and target languages should be different");
  }

  if (tertiaryKey && (tertiaryKey === sourceKey || tertiaryKey === targetKey)) {
    throw new Error("Optional language should be different from source and target");
  }
};

const toMediaPayload = (item) => {
  const id = toCleanString(item?.id).toLowerCase();

  if (!isMediaAssetId(id)) {
    return null;
  }

  const payload = {
    id,
    mimeType: toCleanString(item?.mimeType),
    width: Math.max(0, Math.round(Number(item?.width) || 0)),
    height: Math.max(0, Math.round(Number(item?.height) || 0)),
    byteSize: Math.max(0, Math.round(Number(item?.byteSize) || 0)),
  };

  if (typeof item?.data === "string" && item.data) {
    payload.data = item.data;
  }

  return payload;
};

// Every picture the words point at.
export const collectWordImageAssetIds = (words = []) =>
  new Set(
    (Array.isArray(words) ? words : [])
      .map((word) => normalizeWordImage(word?.image)?.assetId)
      .filter(Boolean),
  );

// The pictures a package carries, each checked: a known picture format read
// from its bytes (never trusted from the declared type), and a sane size.
// Anything else is dropped, and the words that pointed at it simply have no
// picture. `declaredId` is what the words use; the importer stores the bytes
// under the hash it computes itself and remaps the words if the two differ.
export const parseDeckPackageMedia = (parsedPackage) => {
  const entries = Array.isArray(parsedPackage?.media) ? parsedPackage.media : [];
  const seen = new Set();

  return entries.reduce((result, entry) => {
    const declaredId = toCleanString(entry?.id).toLowerCase();

    if (!isMediaAssetId(declaredId) || seen.has(declaredId)) {
      return result;
    }

    const bytes = base64ToBytes(entry?.data);

    if (!bytes || bytes.length === 0 || bytes.length > MAX_MEDIA_ASSET_BYTES) {
      return result;
    }

    const mimeType = sniffImageMimeType(bytes);

    if (!mimeType) {
      return result;
    }

    seen.add(declaredId);
    result.push({
      declaredId,
      bytes,
      mimeType,
      width: Math.max(0, Math.round(Number(entry?.width) || 0)),
      height: Math.max(0, Math.round(Number(entry?.height) || 0)),
    });
    return result;
  }, []);
};

// Points words at the ids their pictures were actually stored under, and
// drops a picture whose bytes did not arrive (`available`, when given).
export const remapWordImages = (words = [], idMap = new Map(), available = null) =>
  (Array.isArray(words) ? words : []).map((word) => {
    const image = normalizeWordImage(word?.image);

    if (!image) {
      return word?.image ? { ...word, image: null } : word;
    }

    const assetId = idMap.get(image.assetId) || image.assetId;

    if (available && !available.has(assetId)) {
      return { ...word, image: null };
    }

    return { ...word, image: { ...image, assetId } };
  });

export const buildExportDeckPackage = ({
  deck,
  words,
  includeTags = true,
  includeExamples = true,
  media = [],
} = {}) => {
  const safeDeck = deck || {};
  const safeWords = Array.isArray(words) ? words : [];
  const hasTertiaryLanguage = Boolean(toCleanString(safeDeck.tertiaryLanguage));
  const normalizedDeckTags = parseTagsValue(
    Array.isArray(safeDeck.tags) ? safeDeck.tags : safeDeck.tagsJson,
  );
  const contentHash = buildDeckContentHash({
    deck: {
      ...safeDeck,
      tags: normalizedDeckTags,
    },
    words: safeWords,
  });

  const wordsPayload = safeWords.map((word, index) => {
    const payload = {
      id: toSafeString(word?.externalId) || `w${index + 1}`,
      source: toSafeString(word?.source),
      target: toSafeString(word?.target),
      ...(hasTertiaryLanguage ? { tertiary: toSafeString(word?.tertiary) } : {}),
      level: normalizeWordLevel(word?.level),
      part_of_speech: toSafeString(word?.part_of_speech),
    };

    if (includeTags) {
      payload.tags = toCleanArrayLimited(word?.tags, MAX_WORD_TAGS);
    }

    if (includeExamples) {
      payload.examples = toCleanArrayLimited(word?.examples, MAX_WORD_EXAMPLES, 1_000);
    }

    const image = normalizeWordImage(word?.image);

    if (image) {
      payload.image = image;
    }

    return payload;
  });
  const referencedAssetIds = collectWordImageAssetIds(safeWords);
  const mediaPayload = (Array.isArray(media) ? media : [])
    .map(toMediaPayload)
    .filter((item) => item && referencedAssetIds.has(item.id));

  return {
    format: DECK_PACKAGE_FORMAT,
    version: DECK_PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    deck: {
      name: toSafeString(safeDeck.name),
      description: toSafeString(safeDeck.description, MAX_DESCRIPTION_LENGTH),
      sourceLanguage: toSafeString(safeDeck.sourceLanguage),
      targetLanguage: toSafeString(safeDeck.targetLanguage),
      tertiaryLanguage: toSafeString(safeDeck.tertiaryLanguage),
      syncId: normalizeDeckSyncId(safeDeck.syncId),
      originKind: normalizeDeckOriginKind(safeDeck.originKind),
      originRef: normalizeDeckOriginRef(safeDeck.originRef),
      contentHash,
      ...(normalizePictureSide(safeDeck.pictureSide)
        ? { pictureSide: normalizePictureSide(safeDeck.pictureSide) }
        : {}),
      ...(storedLearnedSide(safeDeck.learnedSide) ? { learnedSide: storedLearnedSide(safeDeck.learnedSide) } : {}),
      ...(includeTags
        ? {
            tags: normalizedDeckTags,
          }
        : {}),
    },
    words: wordsPayload,
    ...(mediaPayload.length > 0 ? { media: mediaPayload } : {}),
  };
};
