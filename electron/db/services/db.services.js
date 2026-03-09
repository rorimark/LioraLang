import fs from "node:fs";
import path from "node:path";
import { getDatabase } from "../db.js";
import {
  buildExportDeckPackage,
  getDeckImportMetadata,
  normalizeWordsForImport,
  parseDeckPackageFileText,
  resolveImportConfig,
  validateImportLanguages,
} from "../../../src/shared/core/usecases/importExport/index.js";

const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const MAX_DECK_TAGS = 10;

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
  const parsedPackage = parseDeckPackageFileText(raw);
  const metadata = getDeckImportMetadata({
    parsedPackage,
    fileName: path.basename(filePath),
  });

  return {
    name: metadata.suggestedDeckName,
    sourceLanguage: metadata.sourceLanguage,
    targetLanguage: metadata.targetLanguage,
    tertiaryLanguage: metadata.tertiaryLanguage,
    tags: metadata.tags,
    description: metadata.description,
    format: metadata.format,
    version: metadata.version,
    wordsCount: metadata.wordsCount,
  };
};

export const importDeckFromJsonFile = (filePath, importOptions = {}) => {
  const db = getDatabase();
  const wordSchemaCompatibility = getWordSchemaCompatibility(db);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsedPackage = parseDeckPackageFileText(raw);
  const fileName = path.basename(filePath, path.extname(filePath));
  const importConfig = resolveImportConfig({
    payload: importOptions,
    parsedPackage,
    fallbackDeckName: fileName || "Imported Deck",
  });

  validateImportLanguages(importConfig);

  const sourceLanguage = toCleanString(importConfig.sourceLanguage);
  const targetLanguage = toCleanString(importConfig.targetLanguage);
  const resolvedTertiaryLanguage = toCleanString(importConfig.tertiaryLanguage);
  const includeTags = Boolean(importConfig.includeTags);
  const normalizedWordsResult = normalizeWordsForImport({
    parsedPackage,
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage: resolvedTertiaryLanguage,
    duplicateStrategy: importConfig.duplicateStrategy,
    includeTags: importConfig.includeTags,
    includeExamples: importConfig.includeExamples,
  });
  const persistedWords = normalizedWordsResult.words.map((word) => ({
    externalId: toCleanString(word?.externalId),
    source: toCleanString(word?.source),
    target: toCleanString(word?.target),
    tertiary: toCleanString(word?.tertiary),
    level: toCleanString(word?.level).toUpperCase(),
    partOfSpeech: toCleanString(word?.part_of_speech),
    tags: toCleanArray(word?.tags),
    examples: toCleanArray(word?.examples),
  }));
  const skippedCount = Number(normalizedWordsResult.skippedCount) || 0;
  const importedDeckDescription = toCleanString(importConfig.description);
  const importedDeckTags = normalizeDeckTags(importConfig.tags);

  const deckName = getUniqueDeckName(
    importConfig.deckName || fileName || "Imported Deck",
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
  const deckTags = includeTags ? normalizeDeckTags(parseArray(deck?.tagsJson)) : [];
  const jsonPayload = buildExportDeckPackage({
    deck: {
      ...deck,
      tags: deckTags,
    },
    words,
    includeTags,
    includeExamples,
  });
  const wordsPayload = Array.isArray(jsonPayload?.words) ? jsonPayload.words : [];

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
