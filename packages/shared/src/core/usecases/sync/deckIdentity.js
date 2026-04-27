const DECK_ORIGIN_KIND_VALUES = ["local", "hub", "account"];
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DECK_ORIGIN_KINDS = Object.freeze({
  local: "local",
  hub: "hub",
  account: "account",
});

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toUniqueCleanArray = (value = []) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const result = [];
  const seen = new Set();

  value.forEach((item) => {
    const normalizedValue = toCleanString(item);
    const key = normalizedValue.toLowerCase();

    if (!normalizedValue || seen.has(key)) {
      return;
    }

    seen.add(key);
    result.push(normalizedValue);
  });

  return result;
};

const sortWordsForHash = (words = []) => {
  return [...words].sort((left, right) => {
    const leftExternalId = toCleanString(left?.externalId).toLowerCase();
    const rightExternalId = toCleanString(right?.externalId).toLowerCase();

    if (leftExternalId !== rightExternalId) {
      return leftExternalId.localeCompare(rightExternalId);
    }

    const leftSource = toCleanString(left?.source).toLowerCase();
    const rightSource = toCleanString(right?.source).toLowerCase();

    if (leftSource !== rightSource) {
      return leftSource.localeCompare(rightSource);
    }

    const leftTarget = toCleanString(left?.target).toLowerCase();
    const rightTarget = toCleanString(right?.target).toLowerCase();

    return leftTarget.localeCompare(rightTarget);
  });
};

const encodeUtf8 = (value) => {
  if (typeof TextEncoder === "function") {
    return Array.from(new TextEncoder().encode(value));
  }

  const encodedValue = unescape(encodeURIComponent(value));
  return Array.from(encodedValue, (character) => character.charCodeAt(0));
};

const hashFnv1a32 = (value) => {
  let hash = 0x811c9dc5;

  encodeUtf8(value).forEach((byteValue) => {
    hash ^= byteValue;
    hash = Math.imul(hash, 0x01000193);
  });

  return (hash >>> 0).toString(16).padStart(8, "0");
};

const createRandomBytes = (size) => {
  if (globalThis?.crypto?.getRandomValues) {
    return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(size)));
  }

  return Array.from({ length: size }, () => Math.floor(Math.random() * 256));
};

const bytesToUuid = (bytes) => {
  const normalizedBytes = [...bytes];

  normalizedBytes[6] = (normalizedBytes[6] & 0x0f) | 0x40;
  normalizedBytes[8] = (normalizedBytes[8] & 0x3f) | 0x80;

  const hex = normalizedBytes.map((value) => value.toString(16).padStart(2, "0"));

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-");
};

export const normalizeDeckSyncId = (value) => {
  const normalizedValue = toCleanString(value).toLowerCase();
  return UUID_PATTERN.test(normalizedValue) ? normalizedValue : "";
};

export const normalizeDeckOriginKind = (
  value,
  fallback = DECK_ORIGIN_KINDS.local,
) => {
  const normalizedValue = toCleanString(value).toLowerCase();
  return DECK_ORIGIN_KIND_VALUES.includes(normalizedValue)
    ? normalizedValue
    : fallback;
};

export const normalizeDeckOriginRef = (value) => {
  return toCleanString(value);
};

export const createDeckSyncId = () => {
  if (globalThis?.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID().toLowerCase();
  }

  return bytesToUuid(createRandomBytes(16));
};

export const resolveDeckSyncId = ({
  currentSyncId = "",
  existingSyncIds = [],
} = {}) => {
  const normalizedCurrentSyncId = normalizeDeckSyncId(currentSyncId);
  const blockedSyncIds = new Set(
    (Array.isArray(existingSyncIds) ? existingSyncIds : [])
      .map((syncId) => normalizeDeckSyncId(syncId))
      .filter(Boolean),
  );

  if (normalizedCurrentSyncId && !blockedSyncIds.has(normalizedCurrentSyncId)) {
    return normalizedCurrentSyncId;
  }

  let nextSyncId = createDeckSyncId();

  while (blockedSyncIds.has(nextSyncId)) {
    nextSyncId = createDeckSyncId();
  }

  return nextSyncId;
};

export const buildDeckContentHash = ({
  deck = {},
  words = [],
} = {}) => {
  const normalizedWords = sortWordsForHash(Array.isArray(words) ? words : []).map((word) => ({
    externalId: toCleanString(word?.externalId),
    source: toCleanString(word?.source),
    target: toCleanString(word?.target),
    tertiary: toCleanString(word?.tertiary),
    level: toCleanString(word?.level).toUpperCase(),
    partOfSpeech: toCleanString(word?.part_of_speech || word?.partOfSpeech),
    tags: toUniqueCleanArray(word?.tags),
    examples: toUniqueCleanArray(word?.examples),
  }));

  const payload = {
    name: toCleanString(deck?.name),
    description: toCleanString(deck?.description),
    sourceLanguage: toCleanString(deck?.sourceLanguage),
    targetLanguage: toCleanString(deck?.targetLanguage),
    tertiaryLanguage: toCleanString(deck?.tertiaryLanguage),
    usesWordLevels: Boolean(deck?.usesWordLevels),
    tags: toUniqueCleanArray(deck?.tags),
    words: normalizedWords,
  };

  return `deckh_${hashFnv1a32(JSON.stringify(payload))}`;
};
