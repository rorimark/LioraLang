import fs from "node:fs";
import path from "node:path";
import { getDatabase } from "../db.js";

const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const DECK_PACKAGE_FORMAT = "lioralang.deck";
const DECK_PACKAGE_VERSION = 1;
const MAX_DECK_TAGS = 10;
const DUPLICATE_IMPORT_STRATEGIES = new Set(["skip", "update", "keep_both"]);
const LANGUAGE_VALUE_ALIASES = {
  english: ["en", "english"],
  ukrainian: ["uk", "ua", "ukrainian"],
  russian: ["ru", "russian"],
  polish: ["pl", "polish"],
  german: ["de", "german"],
  spanish: ["es", "spanish"],
  french: ["fr", "french"],
  italian: ["it", "italian"],
  portuguese: ["pt", "portuguese"],
  turkish: ["tr", "turkish"],
  czech: ["cs", "czech"],
  japanese: ["ja", "japanese"],
};
const DEFAULT_IMPORT_SOURCE_LANGUAGE = "English";
const DEFAULT_IMPORT_TARGET_LANGUAGE = "Ukrainian";
const DEFAULT_IMPORT_TERTIARY_LANGUAGE = "";

const parseArray = (value) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toCleanArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string" && item.trim().length > 0);
};

const toUniqueArray = (value) => {
  const uniqueValues = [];
  const seen = new Set();

  toCleanArray(value).forEach((item) => {
    const normalizedKey = item.trim().toLowerCase();

    if (!normalizedKey || seen.has(normalizedKey)) {
      return;
    }

    seen.add(normalizedKey);
    uniqueValues.push(item.trim());
  });

  return uniqueValues;
};

const normalizeDeckTags = (value) => {
  return toUniqueArray(value).slice(0, MAX_DECK_TAGS);
};

const getWordSchemaCompatibility = (db) => {
  const wordColumns = db.prepare("PRAGMA table_info(words)").all();

  return {
    hasLegacySource: wordColumns.some((column) => column.name === "eng"),
    hasLegacyTarget: wordColumns.some((column) => column.name === "ru"),
    hasLegacyTertiary: wordColumns.some((column) => column.name === "pl"),
  };
};

const buildInsertWordStatement = (db, schemaCompatibility) => {
  const columns = [
    "external_id",
    "deck_id",
    "source_text",
    "target_text",
    "tertiary_text",
    "level",
    "part_of_speech",
    "tags_json",
    "examples_json",
  ];

  if (schemaCompatibility.hasLegacySource) {
    columns.push("eng");
  }

  if (schemaCompatibility.hasLegacyTarget) {
    columns.push("ru");
  }

  if (schemaCompatibility.hasLegacyTertiary) {
    columns.push("pl");
  }

  const placeholders = columns.map(() => "?").join(", ");

  return db.prepare(`
      INSERT INTO words (
        ${columns.join(", ")}
      ) VALUES (${placeholders})
    `);
};

const buildUpdateWordStatement = (db, schemaCompatibility) => {
  const updates = [
    "external_id = ?",
    "source_text = ?",
    "target_text = ?",
    "tertiary_text = ?",
    "level = ?",
    "part_of_speech = ?",
    "tags_json = ?",
    "examples_json = ?",
  ];

  if (schemaCompatibility.hasLegacySource) {
    updates.push("eng = ?");
  }

  if (schemaCompatibility.hasLegacyTarget) {
    updates.push("ru = ?");
  }

  if (schemaCompatibility.hasLegacyTertiary) {
    updates.push("pl = ?");
  }

  return db.prepare(`
      UPDATE words
      SET
        ${updates.join(", ")}
      WHERE id = ? AND deck_id = ?
    `);
};

const buildWordMutationParams = (
  schemaCompatibility,
  {
    externalId,
    source,
    target,
    tertiary,
    level,
    partOfSpeech,
    tagsJson,
    examplesJson,
  },
) => {
  const params = [
    externalId || null,
    source,
    target || null,
    tertiary || null,
    level,
    partOfSpeech || null,
    tagsJson,
    examplesJson,
  ];

  if (schemaCompatibility.hasLegacySource) {
    params.push(source);
  }

  if (schemaCompatibility.hasLegacyTarget) {
    params.push(target || null);
  }

  if (schemaCompatibility.hasLegacyTertiary) {
    params.push(tertiary || null);
  }

  return params;
};

const buildInsertWordRunParams = (
  schemaCompatibility,
  {
    deckId,
    externalId,
    source,
    target,
    tertiary,
    level,
    partOfSpeech,
    tagsJson,
    examplesJson,
  },
) => {
  return [
    externalId || null,
    deckId,
    source,
    target || null,
    tertiary || null,
    level,
    partOfSpeech || null,
    tagsJson,
    examplesJson,
    ...(schemaCompatibility.hasLegacySource ? [source] : []),
    ...(schemaCompatibility.hasLegacyTarget ? [target || null] : []),
    ...(schemaCompatibility.hasLegacyTertiary ? [tertiary || null] : []),
  ];
};

const buildUpdateWordRunParams = (
  schemaCompatibility,
  {
    wordId,
    deckId,
    externalId,
    source,
    target,
    tertiary,
    level,
    partOfSpeech,
    tagsJson,
    examplesJson,
  },
) => {
  return [
    ...buildWordMutationParams(schemaCompatibility, {
      externalId,
      source,
      target,
      tertiary,
      level,
      partOfSpeech,
      tagsJson,
      examplesJson,
    }),
    wordId,
    deckId,
  ];
};

const normalizeLanguageName = (value) => {
  return toCleanString(value).toLowerCase();
};

const sanitizeFieldKey = (value) => {
  return value.replace(/\s+/g, "_");
};

const resolveValueByAliases = (word, aliases) => {
  if (!word || typeof word !== "object" || Array.isArray(word)) {
    return "";
  }

  const normalizedWord = new Map(
    Object.entries(word).map(([key, value]) => [key.toLowerCase(), value]),
  );

  for (const alias of aliases) {
    const aliasKey = alias.toLowerCase();

    if (!normalizedWord.has(aliasKey)) {
      continue;
    }

    const resolved = toCleanString(normalizedWord.get(aliasKey));

    if (resolved) {
      return resolved;
    }
  }

  return "";
};

const buildLanguageAliases = (language, fallbackAliases = []) => {
  const normalizedLanguage = normalizeLanguageName(language);
  const configuredAliases = LANGUAGE_VALUE_ALIASES[normalizedLanguage] || [];
  const languageDerivedAliases = normalizedLanguage
    ? [
        normalizedLanguage,
        sanitizeFieldKey(normalizedLanguage),
      ]
    : [];

  return [...new Set([...configuredAliases, ...languageDerivedAliases, ...fallbackAliases])];
};

const resolveImportLanguageConfig = (importOptions = {}) => {
  if (typeof importOptions === "string") {
    return {
      deckName: toCleanString(importOptions),
      sourceLanguage: "",
      targetLanguage: "",
      tertiaryLanguage: "",
      duplicateStrategy: "skip",
      includeExamples: true,
      includeTags: true,
    };
  }

  return {
    deckName: toCleanString(importOptions?.deckName),
    sourceLanguage: toCleanString(importOptions?.sourceLanguage),
    targetLanguage: toCleanString(importOptions?.targetLanguage),
    tertiaryLanguage: toCleanString(importOptions?.tertiaryLanguage),
    duplicateStrategy: DUPLICATE_IMPORT_STRATEGIES.has(importOptions?.duplicateStrategy)
      ? importOptions.duplicateStrategy
      : "skip",
    includeExamples:
      typeof importOptions?.includeExamples === "boolean"
        ? importOptions.includeExamples
        : true,
    includeTags:
      typeof importOptions?.includeTags === "boolean"
        ? importOptions.includeTags
        : true,
  };
};

const parseDeckImportPayload = (value) => {
  if (Array.isArray(value)) {
    return {
      words: value,
      deck: null,
      format: "",
      version: null,
    };
  }

  if (!value || typeof value !== "object") {
    throw new Error("JSON must contain an array of words or a deck package object");
  }

  if (!Array.isArray(value.words)) {
    throw new Error("Deck package must include a words array");
  }

  const deck = value.deck && typeof value.deck === "object"
    ? {
        name: toCleanString(value.deck.name),
        description: toCleanString(value.deck.description),
        sourceLanguage: toCleanString(value.deck.sourceLanguage),
        targetLanguage: toCleanString(value.deck.targetLanguage),
        tertiaryLanguage: toCleanString(value.deck.tertiaryLanguage),
        tags: normalizeDeckTags(value.deck.tags),
      }
    : null;

  const version = Number(value.version);

  return {
    words: value.words,
    deck,
    format: toCleanString(value.format),
    version: Number.isFinite(version) ? version : null,
  };
};

const buildDeckDescription = ({
  sourceLanguage,
  targetLanguage,
  tertiaryLanguage,
}) => {
  const source = toCleanString(sourceLanguage);
  const target = toCleanString(targetLanguage);
  const tertiary = toCleanString(tertiaryLanguage);

  if (!source || !target) {
    return "";
  }

  return tertiary ? `${source} -> ${target} -> ${tertiary}` : `${source} -> ${target}`;
};

const normalizeEditableWord = (word, index) => {
  const source = toCleanString(word?.source);

  if (!source) {
    return null;
  }

  const level = toCleanString(word?.level).toUpperCase();
  const parsedId = Number(word?.id);
  const resolvedExamples = toCleanArray(word?.examples);
  const singleExample = toCleanString(word?.example);
  const examples = singleExample ? [singleExample] : resolvedExamples;

  return {
    id: Number.isInteger(parsedId) && parsedId > 0 ? parsedId : null,
    externalId: toCleanString(String(word?.externalId ?? `manual-${index + 1}`)),
    source,
    target: toCleanString(word?.target),
    tertiary: toCleanString(word?.tertiary),
    level: ALLOWED_LEVELS.has(level) ? level : null,
    partOfSpeech: toCleanString(word?.part_of_speech),
    tags: toCleanArray(word?.tags),
    examples,
  };
};

const normalizeWord = (
  word,
  index,
  {
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage,
  },
) => {
  const sourceValue = resolveValueByAliases(
    word,
    buildLanguageAliases(sourceLanguage, ["source"]),
  );

  if (!sourceValue) {
    return null;
  }

  const targetValue = resolveValueByAliases(
    word,
    buildLanguageAliases(targetLanguage, ["target"]),
  );
  const tertiaryValue = tertiaryLanguage
    ? resolveValueByAliases(
        word,
        buildLanguageAliases(tertiaryLanguage, ["tertiary"]),
      )
    : "";
  const level = toCleanString(word?.level).toUpperCase();

  return {
    externalId: toCleanString(String(word?.id ?? `imported-${index + 1}`)),
    source: sourceValue,
    target: targetValue,
    tertiary: tertiaryValue,
    level: ALLOWED_LEVELS.has(level) ? level : null,
    partOfSpeech: toCleanString(word?.part_of_speech),
    tags: toCleanArray(word?.tags),
    examples: toCleanArray(word?.examples),
  };
};

const getUniqueDeckName = (initialName) => {
  const db = getDatabase();
  const baseName = initialName || "Imported Deck";
  const statement = db.prepare("SELECT id FROM decks WHERE name = ?");

  if (!statement.get(baseName)) {
    return baseName;
  }

  let counter = 2;

  while (statement.get(`${baseName} (${counter})`)) {
    counter += 1;
  }

  return `${baseName} (${counter})`;
};

export const renameDeck = (deckId, nextName) => {
  const db = getDatabase();
  const normalizedDeckId = Number(deckId);
  const cleanedName = toCleanString(nextName);

  if (!Number.isInteger(normalizedDeckId) || normalizedDeckId <= 0) {
    throw new Error("Invalid deck id");
  }

  if (!cleanedName) {
    throw new Error("Deck name cannot be empty");
  }

  const duplicateDeck = db
    .prepare("SELECT id FROM decks WHERE name = ? AND id <> ?")
    .get(cleanedName, normalizedDeckId);

  if (duplicateDeck) {
    throw new Error("Deck with this name already exists");
  }

  const updateResult = db
    .prepare(
      "UPDATE decks SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    )
    .run(cleanedName, normalizedDeckId);

  if (updateResult.changes === 0) {
    throw new Error("Deck not found");
  }

  return getDeckById(normalizedDeckId);
};

export const deleteDeck = (deckId) => {
  const db = getDatabase();
  const normalizedDeckId = Number(deckId);

  if (!Number.isInteger(normalizedDeckId) || normalizedDeckId <= 0) {
    throw new Error("Invalid deck id");
  }

  const deleteResult = db.prepare("DELETE FROM decks WHERE id = ?").run(normalizedDeckId);

  if (deleteResult.changes === 0) {
    throw new Error("Deck not found");
  }

  return {
    deckId: normalizedDeckId,
  };
};

export const listDecks = () => {
  const db = getDatabase();

  return db
    .prepare(
      `
        SELECT
          decks.id,
          decks.name,
          decks.description,
          decks.source_language AS sourceLanguage,
          decks.target_language AS targetLanguage,
          decks.tertiary_language AS tertiaryLanguage,
          decks.tags_json AS tagsJson,
          decks.created_at AS createdAt,
          COUNT(words.id) AS wordsCount
        FROM decks
        LEFT JOIN words ON words.deck_id = decks.id
        GROUP BY decks.id
        ORDER BY decks.created_at DESC
      `,
    )
    .all();
};

export const getDeckById = (deckId) => {
  const db = getDatabase();

  return (
    db
      .prepare(
        `
          SELECT
            decks.id,
            decks.name,
            decks.description,
            decks.source_language AS sourceLanguage,
            decks.target_language AS targetLanguage,
            decks.tertiary_language AS tertiaryLanguage,
            decks.tags_json AS tagsJson,
            decks.created_at AS createdAt,
            COUNT(words.id) AS wordsCount
          FROM decks
          LEFT JOIN words ON words.deck_id = decks.id
          WHERE decks.id = ?
          GROUP BY decks.id
        `,
      )
      .get(deckId) || null
  );
};

export const getDeckWords = (deckId) => {
  const db = getDatabase();

  const rows = db
    .prepare(
      `
        SELECT
          id,
          external_id AS externalId,
          source_text AS source,
          target_text AS target,
          tertiary_text AS tertiary,
          level,
          part_of_speech,
          tags_json AS tagsJson,
          examples_json AS examplesJson
        FROM words
        WHERE deck_id = ?
        ORDER BY source_text COLLATE NOCASE ASC
      `,
    )
    .all(deckId);

  return rows.map((row) => ({
    id: row.id,
    externalId: row.externalId,
    source: row.source,
    target: row.target,
    tertiary: row.tertiary,
    level: row.level,
    part_of_speech: row.part_of_speech,
    tags: parseArray(row.tagsJson),
    examples: parseArray(row.examplesJson),
  }));
};

export const readDeckImportMetadataFromJsonFile = (filePath) => {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const payload = parseDeckImportPayload(parsed);

  if (!payload.deck) {
    return {
      format: payload.format,
      version: payload.version,
      wordsCount: payload.words.length,
    };
  }

  return {
    format: payload.format,
    version: payload.version,
    wordsCount: payload.words.length,
    ...payload.deck,
  };
};

export const importDeckFromJsonFile = (filePath, importOptions = {}) => {
  const db = getDatabase();
  const wordSchemaCompatibility = getWordSchemaCompatibility(db);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  const parsedPayload = parseDeckImportPayload(parsed);
  const importConfig = resolveImportLanguageConfig(importOptions);
  const sourceLanguage = toCleanString(
    importConfig.sourceLanguage ||
      parsedPayload.deck?.sourceLanguage ||
      DEFAULT_IMPORT_SOURCE_LANGUAGE,
  );
  const targetLanguage = toCleanString(
    importConfig.targetLanguage ||
      parsedPayload.deck?.targetLanguage ||
      DEFAULT_IMPORT_TARGET_LANGUAGE,
  );
  const tertiaryLanguage = toCleanString(importConfig.tertiaryLanguage);
  const resolvedTertiaryLanguage = toCleanString(
    tertiaryLanguage || parsedPayload.deck?.tertiaryLanguage || DEFAULT_IMPORT_TERTIARY_LANGUAGE,
  );
  const sourceLanguageKey = normalizeLanguageName(sourceLanguage);
  const targetLanguageKey = normalizeLanguageName(targetLanguage);
  const tertiaryLanguageKey = normalizeLanguageName(resolvedTertiaryLanguage);
  const importedDeckDescription = toCleanString(parsedPayload.deck?.description);
  const importedDeckTags = normalizeDeckTags(parsedPayload.deck?.tags);
  const duplicateStrategy = importConfig.duplicateStrategy;
  const includeExamples = importConfig.includeExamples;
  const includeTags = importConfig.includeTags;

  if (!sourceLanguage || !targetLanguage) {
    throw new Error("Source and target languages are required for import");
  }

  if (sourceLanguageKey === targetLanguageKey) {
    throw new Error("Source and target languages should be different");
  }

  if (
    tertiaryLanguageKey &&
    (tertiaryLanguageKey === sourceLanguageKey || tertiaryLanguageKey === targetLanguageKey)
  ) {
    throw new Error("Optional language should be different from source and target");
  }

  const fileName = path.basename(filePath, path.extname(filePath));
  const normalizedWords = parsedPayload.words
    .map((word, index) =>
      normalizeWord(word, index, {
        sourceLanguage,
        targetLanguage,
        tertiaryLanguage: resolvedTertiaryLanguage,
      }),
    )
    .filter(Boolean)
    .map((word) => ({
      ...word,
      tags: includeTags ? word.tags : [],
      examples: includeExamples ? word.examples : [],
    }));
  let skippedCount = parsedPayload.words.length - normalizedWords.length;
  let persistedWords = normalizedWords;

  if (duplicateStrategy === "skip" || duplicateStrategy === "update") {
    const keyToIndex = new Map();
    const dedupedWords = [];

    normalizedWords.forEach((word) => {
      const dedupeKey = [
        toCleanString(word?.source).toLowerCase(),
        toCleanString(word?.target).toLowerCase(),
        toCleanString(word?.tertiary).toLowerCase(),
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

    persistedWords = dedupedWords;
  }

  const deckName = getUniqueDeckName(
    importConfig.deckName || parsedPayload.deck?.name || fileName || "Imported Deck",
  );
  const deckDescription = importedDeckDescription || `Imported from ${path.basename(filePath)}`;

  const insertDeck = db.prepare(
    `
      INSERT INTO decks (
        name,
        description,
        source_language,
        target_language,
        tertiary_language,
        tags_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
  );
  const insertWord = buildInsertWordStatement(db, wordSchemaCompatibility);

  const insertMany = db.transaction(() => {
    const deckResult = insertDeck.run(
      deckName,
      deckDescription,
      sourceLanguage,
      targetLanguage,
      resolvedTertiaryLanguage || null,
      JSON.stringify(includeTags ? importedDeckTags : []),
    );

    const deckId = Number(deckResult.lastInsertRowid);

    persistedWords.forEach((word) => {
      insertWord.run(
        ...buildInsertWordRunParams(wordSchemaCompatibility, {
          deckId,
          externalId: word.externalId,
          source: word.source,
          target: word.target,
          tertiary: word.tertiary,
          level: word.level,
          partOfSpeech: word.partOfSpeech,
          tagsJson: JSON.stringify(word.tags),
          examplesJson: JSON.stringify(word.examples),
        }),
      );
    });

    return deckId;
  });

  const deckId = insertMany();

  return {
    deckId,
    deckName,
    importedCount: persistedWords.length,
    skippedCount,
  };
};

const buildDeckExportPayload = (deckId, exportOptions = {}) => {
  const deck = getDeckById(deckId);

  if (!deck) {
    throw new Error("Deck not found");
  }

  const words = getDeckWords(deckId);
  const includeExamples =
    typeof exportOptions?.includeExamples === "boolean"
      ? exportOptions.includeExamples
      : true;
  const includeTags =
    typeof exportOptions?.includeTags === "boolean"
      ? exportOptions.includeTags
      : true;
  const hasTertiaryLanguage = Boolean(toCleanString(deck?.tertiaryLanguage));
  const deckTags = includeTags ? normalizeDeckTags(parseArray(deck?.tagsJson)) : [];
  const wordsPayload = words.map((word) => {
    const wordPayload = {
      id: word.externalId || `w${word.id}`,
      source: word.source,
      target: word.target,
      ...(hasTertiaryLanguage ? { tertiary: word.tertiary } : {}),
      level: word.level,
      part_of_speech: word.part_of_speech,
    };

    if (includeTags) {
      wordPayload.tags = word.tags;
    }

    if (includeExamples) {
      wordPayload.examples = word.examples;
    }

    return wordPayload;
  });
  const jsonPayload = {
    format: DECK_PACKAGE_FORMAT,
    version: DECK_PACKAGE_VERSION,
    exportedAt: new Date().toISOString(),
    deck: {
      name: deck.name,
      description: deck.description || "",
      sourceLanguage: deck.sourceLanguage || "",
      targetLanguage: deck.targetLanguage || "",
      tertiaryLanguage: deck.tertiaryLanguage || "",
      ...(includeTags ? { tags: deckTags } : {}),
    },
    words: wordsPayload,
  };

  return {
    deck,
    wordsPayload,
    jsonPayload,
  };
};

export const exportDeckToJsonPackage = (deckId, exportOptions = {}) => {
  const {
    deck,
    wordsPayload,
    jsonPayload,
  } = buildDeckExportPayload(deckId, exportOptions);

  return {
    deckId,
    deckName: deck.name,
    exportedCount: wordsPayload.length,
    package: jsonPayload,
  };
};

export const exportDeckToJsonFile = (deckId, filePath, exportOptions = {}) => {
  const {
    deck,
    wordsPayload,
    jsonPayload,
  } = buildDeckExportPayload(deckId, exportOptions);

  fs.writeFileSync(filePath, JSON.stringify(jsonPayload, null, 2), "utf8");

  return {
    deckId,
    deckName: deck.name,
    filePath,
    exportedCount: wordsPayload.length,
  };
};

export const saveDeck = (payload = {}) => {
  const db = getDatabase();
  const wordSchemaCompatibility = getWordSchemaCompatibility(db);
  const providedDeckId = Number(payload?.deckId);
  const hasDeckId = Number.isInteger(providedDeckId) && providedDeckId > 0;
  const cleanedName = toCleanString(payload?.name);
  const sourceLanguage = toCleanString(payload?.sourceLanguage);
  const targetLanguage = toCleanString(payload?.targetLanguage);
  const tertiaryLanguage = toCleanString(payload?.tertiaryLanguage);
  const sourceLanguageKey = normalizeLanguageName(sourceLanguage);
  const targetLanguageKey = normalizeLanguageName(targetLanguage);
  const tertiaryLanguageKey = normalizeLanguageName(tertiaryLanguage);
  const tags = toCleanArray(payload?.tags);
  const description =
    toCleanString(payload?.description) ||
    buildDeckDescription({
      sourceLanguage,
      targetLanguage,
      tertiaryLanguage,
    });
  const normalizedWords = Array.isArray(payload?.words)
    ? payload.words
        .map((word, index) => normalizeEditableWord(word, index))
        .filter(Boolean)
    : [];

  if (!cleanedName) {
    throw new Error("Deck name cannot be empty");
  }

  if (!sourceLanguage || !targetLanguage) {
    throw new Error("Source and target languages are required");
  }

  if (sourceLanguageKey === targetLanguageKey) {
    throw new Error("Source and target languages should be different");
  }

  if (
    tertiaryLanguageKey &&
    (tertiaryLanguageKey === sourceLanguageKey || tertiaryLanguageKey === targetLanguageKey)
  ) {
    throw new Error("Optional language should be different from source and target");
  }

  const duplicateDeck = hasDeckId
    ? db
        .prepare("SELECT id FROM decks WHERE name = ? AND id <> ?")
        .get(cleanedName, providedDeckId)
    : db.prepare("SELECT id FROM decks WHERE name = ?").get(cleanedName);

  if (duplicateDeck) {
    throw new Error("Deck with this name already exists");
  }

  const insertDeck = db.prepare(
    `
      INSERT INTO decks (
        name,
        description,
        source_language,
        target_language,
        tertiary_language,
        tags_json
      ) VALUES (?, ?, ?, ?, ?, ?)
    `,
  );
  const updateDeck = db.prepare(
    `
      UPDATE decks
      SET
        name = ?,
        description = ?,
        source_language = ?,
        target_language = ?,
        tertiary_language = ?,
        tags_json = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `,
  );
  const existingWordIdsQuery = db.prepare(
    "SELECT id FROM words WHERE deck_id = ?",
  );
  const updateWord = buildUpdateWordStatement(db, wordSchemaCompatibility);
  const insertWord = buildInsertWordStatement(db, wordSchemaCompatibility);
  const deleteWordsByDeck = db.prepare("DELETE FROM words WHERE deck_id = ?");

  const saveDeckTransaction = db.transaction(() => {
    let resolvedDeckId = providedDeckId;

    if (hasDeckId) {
      const updateResult = updateDeck.run(
        cleanedName,
        description || null,
        sourceLanguage,
        targetLanguage,
        tertiaryLanguage || null,
        JSON.stringify(tags),
        providedDeckId,
      );

      if (updateResult.changes === 0) {
        throw new Error("Deck not found");
      }
    } else {
      const insertResult = insertDeck.run(
        cleanedName,
        description || null,
        sourceLanguage,
        targetLanguage,
        tertiaryLanguage || null,
        JSON.stringify(tags),
      );
      resolvedDeckId = Number(insertResult.lastInsertRowid);
    }

    const existingWordIds = new Set(
      existingWordIdsQuery.all(resolvedDeckId).map((row) => Number(row.id)),
    );
    const persistedWordIds = [];

    normalizedWords.forEach((word) => {
      const tagsJson = JSON.stringify(word.tags);
      const examplesJson = JSON.stringify(word.examples);

      if (word.id && existingWordIds.has(word.id)) {
        updateWord.run(
          ...buildUpdateWordRunParams(wordSchemaCompatibility, {
            wordId: word.id,
            deckId: resolvedDeckId,
            externalId: word.externalId,
            source: word.source,
            target: word.target,
            tertiary: word.tertiary,
            level: word.level,
            partOfSpeech: word.partOfSpeech,
            tagsJson,
            examplesJson,
          }),
        );
        persistedWordIds.push(word.id);
        return;
      }

      const insertResult = insertWord.run(
        ...buildInsertWordRunParams(wordSchemaCompatibility, {
          deckId: resolvedDeckId,
          externalId: word.externalId,
          source: word.source,
          target: word.target,
          tertiary: word.tertiary,
          level: word.level,
          partOfSpeech: word.partOfSpeech,
          tagsJson,
          examplesJson,
        }),
      );
      persistedWordIds.push(Number(insertResult.lastInsertRowid));
    });

    if (persistedWordIds.length === 0) {
      deleteWordsByDeck.run(resolvedDeckId);
    } else {
      const placeholders = persistedWordIds.map(() => "?").join(", ");
      db.prepare(
        `
          DELETE FROM words
          WHERE deck_id = ?
          AND id NOT IN (${placeholders})
        `,
      ).run(resolvedDeckId, ...persistedWordIds);
    }

    return {
      deckId: resolvedDeckId,
    };
  });

  const { deckId } = saveDeckTransaction();

  return {
    deck: getDeckById(deckId),
    words: getDeckWords(deckId),
  };
};
