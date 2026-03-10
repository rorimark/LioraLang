import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
} from "@shared/config/languages";
import {
  WEB_DB_STORES,
  idbRequest,
  runReadonlyTransaction,
  runReadwriteTransaction,
} from "@shared/platform/web/db";
import {
  buildExportDeckPackage,
  getDeckImportMetadata,
  normalizeWordsForImport,
  parseDeckPackageFileText,
  resolveImportConfig,
  validateDeckPackageObject,
  validateImportLanguages,
} from "@shared/platform/web/lib";

const MAX_DECK_TAGS = 10;
const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;
const IMPORT_REQUEST_TIMEOUT_MS = 35_000;
const EMPTY_UNSUBSCRIBE = () => {};

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const parseNumericId = (value) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const toLanguageKey = (value) => toCleanString(value).toLowerCase();

const toCleanArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
};

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

const parseTagsFromDeck = (deck) => {
  if (!deck) {
    return [];
  }

  if (Array.isArray(deck.tags)) {
    return normalizeTags(deck.tags);
  }

  if (typeof deck.tagsJson !== "string" || !deck.tagsJson.trim()) {
    return [];
  }

  try {
    const parsedTags = JSON.parse(deck.tagsJson);
    return normalizeTags(parsedTags);
  } catch {
    return [];
  }
};

const toIsoTimestamp = (value = Date.now()) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const resolveUniqueDeckName = (desiredName, existingDecks = []) => {
  const baseName = toCleanString(desiredName) || "Imported Deck";
  const existingNameKeys = new Set(
    existingDecks
      .map((deck) => toLanguageKey(deck?.name))
      .filter(Boolean),
  );

  if (!existingNameKeys.has(toLanguageKey(baseName))) {
    return baseName;
  }

  let counter = 2;

  while (existingNameKeys.has(toLanguageKey(`${baseName} (${counter})`))) {
    counter += 1;
  }

  return `${baseName} (${counter})`;
};

const normalizeEditableWord = (word, index) => {
  const source = toCleanString(word?.source);

  if (!source) {
    return null;
  }

  const level = toCleanString(word?.level).toUpperCase();
  const examples = (() => {
    const list = [];

    const singleExample = toCleanString(word?.example);

    if (singleExample) {
      list.push(singleExample);
    }

    if (Array.isArray(word?.examples)) {
      toCleanArray(word.examples).forEach((item) => {
        if (!list.includes(item)) {
          list.push(item);
        }
      });
    }

    return list;
  })();

  return {
    id: parseNumericId(word?.id),
    externalId: toCleanString(String(word?.externalId ?? `manual-${index + 1}`)),
    source,
    target: toCleanString(word?.target),
    tertiary: toCleanString(word?.tertiary),
    level: ALLOWED_LEVELS.has(level) ? level : null,
    part_of_speech: toCleanString(word?.part_of_speech),
    tags: normalizeTags(word?.tags),
    examples,
  };
};

const toDeckListRow = (deck, wordsCountByDeckId = new Map()) => {
  const tags = parseTagsFromDeck(deck);

  return {
    id: deck.id,
    name: deck.name,
    description: deck.description || "",
    sourceLanguage: deck.sourceLanguage || "",
    targetLanguage: deck.targetLanguage || "",
    tertiaryLanguage: deck.tertiaryLanguage || "",
    tagsJson: JSON.stringify(tags),
    createdAt: deck.createdAt || null,
    wordsCount: Number(wordsCountByDeckId.get(deck.id) || 0),
  };
};

const toDeckWordRow = (word) => ({
  id: word.id,
  externalId: word.externalId || "",
  source: word.source || "",
  target: word.target || "",
  tertiary: word.tertiary || "",
  level: word.level || null,
  part_of_speech: word.part_of_speech || "",
  tags: Array.isArray(word.tags) ? word.tags : [],
  examples: Array.isArray(word.examples) ? word.examples : [],
});

const buildWordsCountByDeckId = (words = []) => {
  const counts = new Map();

  words.forEach((word) => {
    const deckId = parseNumericId(word?.deckId);

    if (!deckId) {
      return;
    }

    counts.set(deckId, Number(counts.get(deckId) || 0) + 1);
  });

  return counts;
};

const createWordRecord = ({
  deckId,
  existingWord,
  nextWord,
  nowMs,
}) => {
  const normalizedTarget = toCleanString(nextWord.target);
  const normalizedTertiary = toCleanString(nextWord.tertiary);

  return {
    ...(existingWord && parseNumericId(existingWord.id) ? { id: existingWord.id } : {}),
    deckId,
    externalId: nextWord.externalId || "",
    source: nextWord.source,
    target: normalizedTarget,
    tertiary: normalizedTertiary,
    level: nextWord.level,
    part_of_speech: toCleanString(nextWord.part_of_speech) || "other",
    tags: normalizeTags(nextWord.tags),
    examples: toCleanArray(nextWord.examples),
    sourceKey: toLanguageKey(nextWord.source),
    createdAt: existingWord?.createdAt || toIsoTimestamp(nowMs),
    createdAtMs: Number.isFinite(existingWord?.createdAtMs)
      ? existingWord.createdAtMs
      : nowMs,
    updatedAt: toIsoTimestamp(nowMs),
    updatedAtMs: nowMs,
  };
};

const triggerDeckPackageDownload = ({
  fileName,
  payloadText,
  format = "lioradeck",
}) => {
  if (typeof document === "undefined" || typeof window === "undefined") {
    throw new Error("File download is not available in this environment");
  }

  const contentType = format === "json"
    ? "application/json;charset=utf-8"
    : "application/octet-stream";
  const blob = new Blob([payloadText], {
    type: contentType,
  });
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};

const resolveImportUrl = (value) => {
  const raw = toCleanString(value);

  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);

    if (!["https:", "http:"].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
};

const downloadDeckPackageTextFromUrl = async (downloadUrl) => {
  const normalizedUrl = resolveImportUrl(downloadUrl);

  if (!normalizedUrl) {
    throw new Error("Invalid Hub deck URL");
  }

  const abortController = new AbortController();
  const timeoutId = window.setTimeout(() => {
    abortController.abort();
  }, IMPORT_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(normalizedUrl, {
      method: "GET",
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to download deck package (${response.status})`);
    }

    const contentLength = Number(response.headers.get("content-length"));

    if (Number.isFinite(contentLength) && contentLength > MAX_IMPORT_FILE_BYTES) {
      throw new Error("Downloaded deck file is too large");
    }

    const fileText = await response.text();
    const fileByteLength = new TextEncoder().encode(fileText).byteLength;

    if (fileByteLength === 0) {
      throw new Error("Downloaded deck file is empty");
    }

    if (fileByteLength > MAX_IMPORT_FILE_BYTES) {
      throw new Error("Downloaded deck file is too large");
    }

    return fileText;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const pickDeckFileInBrowser = () => {
  return new Promise((resolve, reject) => {
    if (typeof document === "undefined") {
      reject(new Error("Deck file import is unavailable in this environment"));
      return;
    }

    const isIOS = () => {
      if (typeof navigator === "undefined") {
        return false;
      }

      const userAgent = navigator.userAgent || "";
      return /iPhone|iPad|iPod/i.test(userAgent);
    };

    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json,.lioradeck,.lioralang,application/json,application/octet-stream,text/plain";
    input.removeAttribute("capture");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.top = "-9999px";
    let settled = false;
    let didReceiveChange = false;

    let iosCancelTimeoutId = null;

    const cleanup = () => {
      window.removeEventListener("focus", handleWindowFocus);
      if (iosCancelTimeoutId) {
        window.clearTimeout(iosCancelTimeoutId);
      }
      input.remove();
    };

    const safeResolve = (value) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve(value);
    };

    const safeReject = (error) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    const handleWindowFocus = () => {
      window.setTimeout(() => {
        if (didReceiveChange || settled) {
          return;
        }

        const selectedFiles = Array.from(input.files || []);

        if (selectedFiles.length === 0) {
          safeResolve({ canceled: true });
        }
      }, 600);
    };

    input.addEventListener("change", async () => {
      didReceiveChange = true;
      const [selectedFile] = Array.from(input.files || []);

      if (!selectedFile) {
        safeResolve({ canceled: true });
        return;
      }

      if (selectedFile.size > MAX_IMPORT_FILE_BYTES) {
        safeReject(new Error("Selected file is too large"));
        return;
      }

      try {
        const text = await selectedFile.text();

        if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_FILE_BYTES) {
          safeReject(new Error("Selected file is too large"));
          return;
        }

        safeResolve({
          canceled: false,
          file: selectedFile,
          text,
        });
      } catch {
        safeReject(new Error("Failed to read selected file"));
      }
    });

    input.addEventListener("cancel", () => {
      safeResolve({ canceled: true });
    });

    document.body.appendChild(input);
    if (!isIOS()) {
      window.addEventListener("focus", handleWindowFocus, { once: true });
    } else {
      iosCancelTimeoutId = window.setTimeout(() => {
        if (!didReceiveChange && !settled) {
          safeResolve({ canceled: true });
        }
      }, 60_000);
    }
    input.click();
  });
};

const generateImportToken = () => {
  return `web-import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const getDeckByIdInternal = async (deckId) => {
  const normalizedDeckId = parseNumericId(deckId);

  if (!normalizedDeckId) {
    return null;
  }

  return runReadonlyTransaction(
    [WEB_DB_STORES.decks, WEB_DB_STORES.words],
    async ({ getStore }) => {
      const deck = await idbRequest(getStore(WEB_DB_STORES.decks).get(normalizedDeckId));

      if (!deck) {
        return null;
      }

      const words = await idbRequest(
        getStore(WEB_DB_STORES.words).index("deckId").getAll(normalizedDeckId),
      );

      return toDeckListRow(deck, buildWordsCountByDeckId(words));
    },
  );
};

const getDeckWordsInternal = async (deckId) => {
  const normalizedDeckId = parseNumericId(deckId);

  if (!normalizedDeckId) {
    return [];
  }

  return runReadonlyTransaction(WEB_DB_STORES.words, async ({ getStore }) => {
    const words = await idbRequest(
      getStore(WEB_DB_STORES.words).index("deckId").getAll(normalizedDeckId),
    );

    return words
      .slice()
      .sort((firstWord, secondWord) => {
        return String(firstWord?.source || "").localeCompare(
          String(secondWord?.source || ""),
          undefined,
          { sensitivity: "base" },
        );
      })
      .map((word) => toDeckWordRow(word));
  });
};

export const createWebDeckRepository = () => {
  const subscribers = new Set();
  const pendingImports = new Map();

  const notifyDecksUpdated = () => {
    subscribers.forEach((listener) => {
      listener();
    });
  };

  const importParsedPackage = async ({
    parsedPackage,
    payload = {},
    fallbackFileName = "Imported Deck",
  }) => {
    const fallbackDeckName = toCleanString(fallbackFileName).replace(/\.[^/.]+$/, "") || "Imported Deck";
    const importConfig = resolveImportConfig({
      payload,
      parsedPackage,
      fallbackDeckName,
    });

    validateImportLanguages(importConfig);

    const normalizedDeckDescription =
      toCleanString(importConfig.description) ||
      `Imported from ${toCleanString(fallbackFileName) || "file"}`;

    const normalizedWordsResult = normalizeWordsForImport({
      parsedPackage,
      sourceLanguage: importConfig.sourceLanguage,
      targetLanguage: importConfig.targetLanguage,
      tertiaryLanguage: importConfig.tertiaryLanguage,
      duplicateStrategy: importConfig.duplicateStrategy,
      includeTags: importConfig.includeTags,
      includeExamples: importConfig.includeExamples,
    });

    const nowMs = Date.now();

    const importResult = await runReadwriteTransaction(
      [WEB_DB_STORES.decks, WEB_DB_STORES.words],
      async ({ getStore }) => {
        const decksStore = getStore(WEB_DB_STORES.decks);
        const wordsStore = getStore(WEB_DB_STORES.words);
        const existingDecks = await idbRequest(decksStore.getAll());
        const uniqueDeckName = resolveUniqueDeckName(importConfig.deckName, existingDecks);

        const deckRecord = {
          name: uniqueDeckName,
          nameKey: toLanguageKey(uniqueDeckName),
          description: normalizedDeckDescription,
          sourceLanguage: importConfig.sourceLanguage,
          targetLanguage: importConfig.targetLanguage,
          tertiaryLanguage: importConfig.tertiaryLanguage || "",
          tags: normalizeTags(importConfig.tags),
          createdAt: toIsoTimestamp(nowMs),
          createdAtMs: nowMs,
          updatedAt: toIsoTimestamp(nowMs),
          updatedAtMs: nowMs,
        };

        const deckId = await idbRequest(decksStore.add(deckRecord));

        normalizedWordsResult.words.forEach((word) => {
          const nextWordRecord = createWordRecord({
            deckId,
            existingWord: null,
            nextWord: word,
            nowMs,
          });

          wordsStore.add(nextWordRecord);
        });

        return {
          deckId: Number(deckId),
          deckName: uniqueDeckName,
          importedCount: normalizedWordsResult.words.length,
          skippedCount: normalizedWordsResult.skippedCount,
        };
      },
    );

    notifyDecksUpdated();
    return importResult;
  };

  const exportDeckPackage = async (deckId, settings = {}) => {
    const normalizedDeckId = parseNumericId(deckId);

    if (!normalizedDeckId) {
      throw new Error("Invalid deck id");
    }

    const [deck, words] = await Promise.all([
      getDeckByIdInternal(normalizedDeckId),
      getDeckWordsInternal(normalizedDeckId),
    ]);

    if (!deck) {
      throw new Error("Deck not found");
    }

    const includeExamples =
      typeof settings?.includeExamples === "boolean" ? settings.includeExamples : true;
    const includeTags =
      typeof settings?.includeTags === "boolean" ? settings.includeTags : true;

    const deckPackage = buildExportDeckPackage({
      deck: {
        ...deck,
        tags: parseTagsFromDeck(deck),
      },
      words,
      includeExamples,
      includeTags,
    });

    return {
      deckId: normalizedDeckId,
      deckName: deck.name,
      exportedCount: words.length,
      package: deckPackage,
    };
  };

  return {
    async listDecks() {
      return runReadonlyTransaction(
        [WEB_DB_STORES.decks, WEB_DB_STORES.words],
        async ({ getStore }) => {
          const [decks, words] = await Promise.all([
            idbRequest(getStore(WEB_DB_STORES.decks).getAll()),
            idbRequest(getStore(WEB_DB_STORES.words).getAll()),
          ]);

          const wordsCountByDeckId = buildWordsCountByDeckId(words);

          return decks
            .slice()
            .sort((firstDeck, secondDeck) => {
              const firstDate = Number(firstDeck?.createdAtMs) || 0;
              const secondDate = Number(secondDeck?.createdAtMs) || 0;

              if (secondDate !== firstDate) {
                return secondDate - firstDate;
              }

              return String(firstDeck?.name || "").localeCompare(
                String(secondDeck?.name || ""),
                undefined,
                { sensitivity: "base" },
              );
            })
            .map((deck) => toDeckListRow(deck, wordsCountByDeckId));
        },
      );
    },

    async getDeckById(deckId) {
      return getDeckByIdInternal(deckId);
    },

    async getDeckWords(deckId) {
      return getDeckWordsInternal(deckId);
    },

    async pickImportDeckJson() {
      const picked = await pickDeckFileInBrowser();

      if (picked?.canceled) {
        return { canceled: true };
      }

      const parsedPackage = parseDeckPackageFileText(picked.text);
      validateDeckPackageObject(parsedPackage);
      const metadata = getDeckImportMetadata({
        parsedPackage,
        fileName: picked.file?.name || "",
      });
      const token = generateImportToken();

      pendingImports.set(token, {
        parsedPackage,
        fileName: picked.file?.name || "",
      });

      return {
        canceled: false,
        filePath: token,
        fileName: picked.file?.name || "",
        suggestedDeckName: metadata.suggestedDeckName,
        sourceLanguage: metadata.sourceLanguage,
        targetLanguage: metadata.targetLanguage,
        tertiaryLanguage: metadata.tertiaryLanguage,
        tags: metadata.tags,
        description: metadata.description,
        wordsCount: metadata.wordsCount,
        packageFormat: metadata.format,
        packageVersion: metadata.version,
      };
    },

    async importDeckFromJson(payloadOrDeckName = "") {
      const payload = typeof payloadOrDeckName === "string"
        ? { deckName: payloadOrDeckName }
        : payloadOrDeckName || {};
      const token = toCleanString(payload.filePath);
      const fileText = toCleanString(payload.fileText);

      if (fileText) {
        const parsedPackage = parseDeckPackageFileText(fileText);
        validateDeckPackageObject(parsedPackage);
        const fallbackFileName = toCleanString(payload?.fileName) || "pasted-deck.lioradeck";

        return importParsedPackage({
          parsedPackage,
          payload,
          fallbackFileName,
        });
      }

      if (!token) {
        throw new Error("Import file is not selected");
      }

      const pendingImport = pendingImports.get(token);

      if (!pendingImport) {
        throw new Error("Selected import file is unavailable. Pick the file again.");
      }

      const result = await importParsedPackage({
        parsedPackage: pendingImport.parsedPackage,
        payload,
        fallbackFileName: pendingImport.fileName,
      });

      pendingImports.delete(token);
      return result;
    },

    async importDeckFromUrl(payload = {}) {
      const downloadUrl = toCleanString(payload?.downloadUrl);

      if (!downloadUrl) {
        throw new Error("Hub deck URL is required");
      }

      const fileText = await downloadDeckPackageTextFromUrl(downloadUrl);
      const parsedPackage = parseDeckPackageFileText(fileText);
      validateDeckPackageObject(parsedPackage);
      const fallbackFileName = toCleanString(payload?.fileName) || "hub-deck.lioradeck";

      return importParsedPackage({
        parsedPackage,
        payload,
        fallbackFileName,
      });
    },

    exportDeckPackage,

    async exportDeckToJson(deckId, settings = {}) {
      const exportResult = await exportDeckPackage(deckId, settings);
      const format = settings?.exportFormat === "json" ? "json" : "lioradeck";
      const fileName = `${exportResult.deckName}.${format}`;

      triggerDeckPackageDownload({
        fileName,
        payloadText: JSON.stringify(exportResult.package, null, 2),
        format,
      });

      return {
        canceled: false,
        deckId: exportResult.deckId,
        deckName: exportResult.deckName,
        exportedCount: exportResult.exportedCount,
        filePath: fileName,
      };
    },

    async renameDeck(deckId, nextName) {
      const normalizedDeckId = parseNumericId(deckId);
      const cleanedName = toCleanString(nextName);

      if (!normalizedDeckId) {
        throw new Error("Invalid deck id");
      }

      if (!cleanedName) {
        throw new Error("Deck name cannot be empty");
      }

      await runReadwriteTransaction(WEB_DB_STORES.decks, async ({ getStore }) => {
        const decksStore = getStore(WEB_DB_STORES.decks);
        const [deck, decks] = await Promise.all([
          idbRequest(decksStore.get(normalizedDeckId)),
          idbRequest(decksStore.getAll()),
        ]);

        if (!deck) {
          throw new Error("Deck not found");
        }

        const duplicateDeck = decks.find((item) => {
          return (
            Number(item?.id) !== normalizedDeckId &&
            toLanguageKey(item?.name) === toLanguageKey(cleanedName)
          );
        });

        if (duplicateDeck) {
          throw new Error("Deck with this name already exists");
        }

        decksStore.put({
          ...deck,
          name: cleanedName,
          nameKey: toLanguageKey(cleanedName),
          updatedAt: toIsoTimestamp(),
          updatedAtMs: Date.now(),
        });
      });

      notifyDecksUpdated();
      return getDeckByIdInternal(normalizedDeckId);
    },

    async deleteDeck(deckId) {
      const normalizedDeckId = parseNumericId(deckId);

      if (!normalizedDeckId) {
        throw new Error("Invalid deck id");
      }

      await runReadwriteTransaction(
        [
          WEB_DB_STORES.decks,
          WEB_DB_STORES.words,
          WEB_DB_STORES.reviewCards,
          WEB_DB_STORES.reviewLogs,
        ],
        async ({ getStore }) => {
          const decksStore = getStore(WEB_DB_STORES.decks);
          const wordsStore = getStore(WEB_DB_STORES.words);
          const reviewCardsStore = getStore(WEB_DB_STORES.reviewCards);
          const reviewLogsStore = getStore(WEB_DB_STORES.reviewLogs);
          const deck = await idbRequest(decksStore.get(normalizedDeckId));

          if (!deck) {
            throw new Error("Deck not found");
          }

          const [words, logKeys] = await Promise.all([
            idbRequest(wordsStore.index("deckId").getAll(normalizedDeckId)),
            idbRequest(reviewLogsStore.index("deckId").getAllKeys(normalizedDeckId)),
          ]);

          words.forEach((word) => {
            if (parseNumericId(word?.id)) {
              wordsStore.delete(word.id);
              reviewCardsStore.delete(word.id);
            }
          });

          logKeys.forEach((key) => {
            reviewLogsStore.delete(key);
          });

          decksStore.delete(normalizedDeckId);
        },
      );

      notifyDecksUpdated();

      return {
        deckId: normalizedDeckId,
      };
    },

    async saveDeck(payload = {}) {
      const providedDeckId = parseNumericId(payload?.deckId);
      const deckName = toCleanString(payload?.name);
      const sourceLanguage = toCleanString(payload?.sourceLanguage);
      const targetLanguage = toCleanString(payload?.targetLanguage);
      const tertiaryLanguage = toCleanString(payload?.tertiaryLanguage);
      const description = toCleanString(payload?.description);
      const tags = normalizeTags(payload?.tags);
      const sourceKey = toLanguageKey(sourceLanguage);
      const targetKey = toLanguageKey(targetLanguage);
      const tertiaryKey = toLanguageKey(tertiaryLanguage);

      if (!deckName) {
        throw new Error("Deck name cannot be empty");
      }

      if (!sourceLanguage || !targetLanguage) {
        throw new Error("Source and target languages are required");
      }

      if (sourceKey === targetKey) {
        throw new Error("Source and target languages should be different");
      }

      if (tertiaryKey && (tertiaryKey === sourceKey || tertiaryKey === targetKey)) {
        throw new Error("Optional language should be different from source and target");
      }

      const normalizedWords = Array.isArray(payload?.words)
        ? payload.words
            .map((word, index) => normalizeEditableWord(word, index))
            .filter(Boolean)
        : [];

      const nowMs = Date.now();

      const savedDeckId = await runReadwriteTransaction(
        [WEB_DB_STORES.decks, WEB_DB_STORES.words, WEB_DB_STORES.reviewCards],
        async ({ getStore }) => {
          const decksStore = getStore(WEB_DB_STORES.decks);
          const wordsStore = getStore(WEB_DB_STORES.words);
          const reviewCardsStore = getStore(WEB_DB_STORES.reviewCards);
          const [decks, existingDeck] = await Promise.all([
            idbRequest(decksStore.getAll()),
            providedDeckId ? idbRequest(decksStore.get(providedDeckId)) : Promise.resolve(null),
          ]);

          if (providedDeckId && !existingDeck) {
            throw new Error("Deck not found");
          }

          const duplicateDeck = decks.find((deck) => {
            return (
              Number(deck?.id) !== Number(providedDeckId || 0) &&
              toLanguageKey(deck?.name) === toLanguageKey(deckName)
            );
          });

          if (duplicateDeck) {
            throw new Error("Deck with this name already exists");
          }

          let resolvedDeckId = providedDeckId;

          if (resolvedDeckId) {
            decksStore.put({
              ...existingDeck,
              name: deckName,
              nameKey: toLanguageKey(deckName),
              description,
              sourceLanguage,
              targetLanguage,
              tertiaryLanguage,
              tags,
              updatedAt: toIsoTimestamp(nowMs),
              updatedAtMs: nowMs,
            });
          } else {
            resolvedDeckId = Number(
              await idbRequest(
                decksStore.add({
                  name: deckName,
                  nameKey: toLanguageKey(deckName),
                  description,
                  sourceLanguage,
                  targetLanguage,
                  tertiaryLanguage,
                  tags,
                  createdAt: toIsoTimestamp(nowMs),
                  createdAtMs: nowMs,
                  updatedAt: toIsoTimestamp(nowMs),
                  updatedAtMs: nowMs,
                }),
              ),
            );
          }

          const existingWords = await idbRequest(
            wordsStore.index("deckId").getAll(resolvedDeckId),
          );
          const existingWordsById = new Map(
            existingWords
              .filter((word) => parseNumericId(word?.id))
              .map((word) => [Number(word.id), word]),
          );
          const keptWordIds = new Set();

          for (const nextWord of normalizedWords) {
            const existingWord = nextWord.id ? existingWordsById.get(nextWord.id) : null;
            const nextWordRecord = createWordRecord({
              deckId: resolvedDeckId,
              existingWord,
              nextWord,
              nowMs,
            });

            if (existingWord) {
              wordsStore.put(nextWordRecord);
              keptWordIds.add(existingWord.id);
              continue;
            }

            const insertedWordId = await idbRequest(wordsStore.add(nextWordRecord));
            keptWordIds.add(Number(insertedWordId));
          }

          existingWords.forEach((existingWord) => {
            const existingWordId = parseNumericId(existingWord?.id);

            if (!existingWordId || keptWordIds.has(existingWordId)) {
              return;
            }

            wordsStore.delete(existingWordId);
            reviewCardsStore.delete(existingWordId);
          });

          return resolvedDeckId;
        },
      );

      notifyDecksUpdated();

      const [deck, words] = await Promise.all([
        getDeckByIdInternal(savedDeckId),
        getDeckWordsInternal(savedDeckId),
      ]);

      return {
        deck,
        words,
      };
    },

    subscribeDecksUpdated(callback) {
      if (typeof callback !== "function") {
        return EMPTY_UNSUBSCRIBE;
      }

      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    },
  };
};
