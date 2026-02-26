import fs from "node:fs";
import path from "node:path";
import { getDatabase } from "../db.js";

const ALLOWED_LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

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
  const eng = toCleanString(word?.eng);

  if (!eng) {
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
    eng,
    ru: toCleanString(word?.ru),
    pl: toCleanString(word?.pl),
    level: ALLOWED_LEVELS.has(level) ? level : null,
    partOfSpeech: toCleanString(word?.part_of_speech),
    tags: toCleanArray(word?.tags),
    examples,
  };
};

const normalizeWord = (word, index) => {
  const eng = toCleanString(word?.eng);

  if (!eng) {
    return null;
  }

  const level = toCleanString(word?.level).toUpperCase();

  return {
    externalId: toCleanString(String(word?.id ?? `imported-${index + 1}`)),
    eng,
    ru: toCleanString(word?.ru),
    pl: toCleanString(word?.pl),
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
          eng,
          ru,
          pl,
          level,
          part_of_speech,
          tags_json AS tagsJson,
          examples_json AS examplesJson
        FROM words
        WHERE deck_id = ?
        ORDER BY eng COLLATE NOCASE ASC
      `,
    )
    .all(deckId);

  return rows.map((row) => ({
    id: row.id,
    externalId: row.externalId,
    eng: row.eng,
    ru: row.ru,
    pl: row.pl,
    level: row.level,
    part_of_speech: row.part_of_speech,
    tags: parseArray(row.tagsJson),
    examples: parseArray(row.examplesJson),
  }));
};

export const importDeckFromJsonFile = (filePath, preferredDeckName = "") => {
  const db = getDatabase();
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("JSON must contain an array of words");
  }

  const fileName = path.basename(filePath, path.extname(filePath));
  const normalizedWords = parsed
    .map((word, index) => normalizeWord(word, index))
    .filter(Boolean);

  const skippedCount = parsed.length - normalizedWords.length;
  const deckName = getUniqueDeckName(
    toCleanString(preferredDeckName) || fileName || "Imported Deck",
  );

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
  const insertWord = db.prepare(
    `
      INSERT INTO words (
        external_id,
        deck_id,
        eng,
        ru,
        pl,
        level,
        part_of_speech,
        tags_json,
        examples_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );

  const insertMany = db.transaction(() => {
    const deckResult = insertDeck.run(
      deckName,
      `Imported from ${path.basename(filePath)}`,
      "English",
      "Russian",
      "Polish",
      JSON.stringify([]),
    );

    const deckId = Number(deckResult.lastInsertRowid);

    normalizedWords.forEach((word) => {
      insertWord.run(
        word.externalId,
        deckId,
        word.eng,
        word.ru || null,
        word.pl || null,
        word.level,
        word.partOfSpeech || null,
        JSON.stringify(word.tags),
        JSON.stringify(word.examples),
      );
    });

    return deckId;
  });

  const deckId = insertMany();

  return {
    deckId,
    deckName,
    importedCount: normalizedWords.length,
    skippedCount,
  };
};

export const exportDeckToJsonFile = (deckId, filePath) => {
  const deck = getDeckById(deckId);

  if (!deck) {
    throw new Error("Deck not found");
  }

  const words = getDeckWords(deckId);

  const jsonPayload = words.map((word) => ({
    id: word.externalId || `w${word.id}`,
    eng: word.eng,
    ru: word.ru,
    pl: word.pl,
    level: word.level,
    tags: word.tags,
    examples: word.examples,
    part_of_speech: word.part_of_speech,
  }));

  fs.writeFileSync(filePath, JSON.stringify(jsonPayload, null, 2), "utf8");

  return {
    deckId,
    deckName: deck.name,
    filePath,
    exportedCount: jsonPayload.length,
  };
};

export const saveDeck = (payload = {}) => {
  const db = getDatabase();
  const providedDeckId = Number(payload?.deckId);
  const hasDeckId = Number.isInteger(providedDeckId) && providedDeckId > 0;
  const cleanedName = toCleanString(payload?.name);
  const sourceLanguage = toCleanString(payload?.sourceLanguage);
  const targetLanguage = toCleanString(payload?.targetLanguage);
  const tertiaryLanguage = toCleanString(payload?.tertiaryLanguage);
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
  const updateWord = db.prepare(
    `
      UPDATE words
      SET
        external_id = ?,
        eng = ?,
        ru = ?,
        pl = ?,
        level = ?,
        part_of_speech = ?,
        tags_json = ?,
        examples_json = ?
      WHERE id = ? AND deck_id = ?
    `,
  );
  const insertWord = db.prepare(
    `
      INSERT INTO words (
        external_id,
        deck_id,
        eng,
        ru,
        pl,
        level,
        part_of_speech,
        tags_json,
        examples_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );
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
          word.externalId || null,
          word.eng,
          word.ru || null,
          word.pl || null,
          word.level,
          word.partOfSpeech || null,
          tagsJson,
          examplesJson,
          word.id,
          resolvedDeckId,
        );
        persistedWordIds.push(word.id);
        return;
      }

      const insertResult = insertWord.run(
        word.externalId || null,
        resolvedDeckId,
        word.eng,
        word.ru || null,
        word.pl || null,
        word.level,
        word.partOfSpeech || null,
        tagsJson,
        examplesJson,
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
