const HUB_DOWNLOADS_RPC_NAME = "increment_hub_deck_downloads";

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toShortId = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/-/g, "").slice(0, 6);
};

const toSlug = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const buildDeckSlug = (title, id) => {
  const base = toSlug(typeof title === "string" ? title : "");
  const suffix = toShortId(typeof id === "string" ? id : String(id || ""));

  if (base && suffix) {
    return `${base}-${suffix}`;
  }

  return base || suffix;
};

const sanitizeFileName = (value) => {
  const normalizedName = toCleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedName || "deck";
};

const toCountNumber = (value, fallback = 0) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(numberValue));
};

const isRpcMissingError = (error, rpcName = HUB_DOWNLOADS_RPC_NAME) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (error.code === "PGRST202") {
    return true;
  }

  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";

  return message.includes("does not exist") && message.includes(rpcName);
};

const resolveDownloadsCountFromRpcData = (
  data,
  fallback = 0,
  rpcName = HUB_DOWNLOADS_RPC_NAME,
) => {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return toCountNumber(fallback, 0);
    }

    const firstRow = data[0];

    if (firstRow && typeof firstRow === "object") {
      if (Object.hasOwn(firstRow, "downloads_count")) {
        return toCountNumber(firstRow.downloads_count, fallback);
      }

      if (Object.hasOwn(firstRow, rpcName)) {
        return toCountNumber(firstRow[rpcName], fallback);
      }
    }

    return toCountNumber(firstRow, fallback);
  }

  if (data && typeof data === "object") {
    if (Object.hasOwn(data, "downloads_count")) {
      return toCountNumber(data.downloads_count, fallback);
    }

    if (Object.hasOwn(data, rpcName)) {
      return toCountNumber(data[rpcName], fallback);
    }
  }

  return toCountNumber(data, fallback);
};

const isInvalidHubFilePath = (value) => {
  const normalizedPath = toCleanString(value);

  if (!normalizedPath) {
    return true;
  }

  return (
    normalizedPath.includes("..") ||
    normalizedPath.startsWith("/") ||
    normalizedPath.includes("\0")
  );
};

const toHubDeck = (deck, latestVersion, normalizeTextArray) => {
  const targetLanguages = normalizeTextArray(deck?.target_languages);
  const languages = [deck?.source_language, ...targetLanguages]
    .map((item) => toCleanString(item))
    .filter(Boolean);
  const uniqueLanguageKeys = new Set();
  const uniqueLanguages = [];

  languages.forEach((language) => {
    const key = language.toLowerCase();

    if (!key || uniqueLanguageKeys.has(key)) {
      return;
    }

    uniqueLanguageKeys.add(key);
    uniqueLanguages.push(language);
  });

  const slug = toCleanString(deck?.slug || "") || buildDeckSlug(deck?.title, deck?.id);

  return {
    id: toCleanString(deck?.id ? String(deck.id) : ""),
    slug,
    title: toCleanString(deck?.title),
    description: toCleanString(deck?.description),
    sourceLanguage: toCleanString(deck?.source_language),
    targetLanguages,
    languages: uniqueLanguages,
    tags: normalizeTextArray(deck?.tags),
    wordsCount: Number.isFinite(Number(deck?.words_count)) ? Number(deck.words_count) : 0,
    downloadsCount: Number.isFinite(Number(deck?.downloads_count))
      ? Number(deck.downloads_count)
      : 0,
    createdAt: toCleanString(deck?.created_at),
    latestVersion: latestVersion
      ? {
          version: Number.isFinite(Number(latestVersion?.version))
            ? Number(latestVersion.version)
            : 1,
          filePath: toCleanString(latestVersion?.file_path),
          fileFormat: toCleanString(latestVersion?.file_format) || "lioradeck",
          fileSizeBytes: Number.isFinite(Number(latestVersion?.file_size_bytes))
            ? Number(latestVersion.file_size_bytes)
            : 0,
          createdAt: toCleanString(latestVersion?.created_at),
        }
      : null,
  };
};

export {
  HUB_DOWNLOADS_RPC_NAME,
  buildDeckSlug,
  isInvalidHubFilePath,
  isRpcMissingError,
  resolveDownloadsCountFromRpcData,
  sanitizeFileName,
  toCleanString,
  toCountNumber,
  toHubDeck,
};
