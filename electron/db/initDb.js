import { getDatabase } from "./db.js";
import {
  buildDeckContentHash,
  normalizeDeckOriginKind,
  normalizeDeckOriginRef,
  resolveDeckSyncId,
} from "../../packages/shared/src/core/usecases/sync/index.js";

const ensureColumn = (db, tableName, columnName, columnDefinition) => {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const hasColumn = columns.some((column) => column.name === columnName);

  if (!hasColumn) {
    db.prepare(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`,
    ).run();
  }
};

export const initDb = () => {
  const db = getDatabase();

  db.exec(`
    CREATE TABLE IF NOT EXISTS deck_folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (parent_id) REFERENCES deck_folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      source_language TEXT,
      target_language TEXT,
      tertiary_language TEXT,
      uses_word_levels INTEGER DEFAULT 1,
      tags_json TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES deck_folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      deck_id INTEGER NOT NULL,
      source_text TEXT NOT NULL,
      target_text TEXT,
      tertiary_text TEXT,
      level TEXT,
      part_of_speech TEXT,
      tags_json TEXT DEFAULT '[]',
      examples_json TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_words_deck_id ON words(deck_id);

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS review_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL UNIQUE,
      state TEXT DEFAULT 'new',
      learning_step INTEGER DEFAULT 0,
      due_at TEXT,
      interval_days INTEGER DEFAULT 1,
      ease_factor REAL DEFAULT 2.5,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      last_reviewed_at TEXT,
      profile_scope TEXT DEFAULT 'guest:default',
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS review_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      deck_id INTEGER NOT NULL,
      reviewed_at TEXT NOT NULL,
      rating TEXT NOT NULL,
      queue_type TEXT NOT NULL,
      prev_state TEXT,
      next_state TEXT,
      prev_interval_days INTEGER,
      next_interval_days INTEGER,
      prev_ease_factor REAL,
      next_ease_factor REAL,
      profile_scope TEXT DEFAULT 'guest:default',
      op_id TEXT,
      device_id TEXT,
      device_seq INTEGER DEFAULT 0,
      deck_sync_id TEXT,
      word_external_id TEXT,
      payload_json TEXT DEFAULT '{}',
      sync_status TEXT DEFAULT 'pending',
      synced_at TEXT,
      server_seq INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );
  `);

  ensureColumn(db, "decks", "source_language", "TEXT");
  ensureColumn(db, "decks", "target_language", "TEXT");
  ensureColumn(db, "decks", "tertiary_language", "TEXT");
  ensureColumn(db, "decks", "description", "TEXT");
  ensureColumn(db, "decks", "uses_word_levels", "INTEGER DEFAULT 1");
  ensureColumn(db, "decks", "tags_json", "TEXT DEFAULT '[]'");
  ensureColumn(db, "decks", "sync_id", "TEXT");
  ensureColumn(db, "decks", "origin_kind", "TEXT DEFAULT 'local'");
  ensureColumn(db, "decks", "origin_ref", "TEXT");
  ensureColumn(db, "decks", "content_hash", "TEXT");
  ensureColumn(db, "decks", "created_at", "TEXT");
  ensureColumn(db, "decks", "updated_at", "TEXT");
  ensureColumn(db, "words", "external_id", "TEXT");
  ensureColumn(db, "words", "source_text", "TEXT");
  ensureColumn(db, "words", "target_text", "TEXT");
  ensureColumn(db, "words", "tertiary_text", "TEXT");
  ensureColumn(db, "words", "level", "TEXT");
  ensureColumn(db, "words", "part_of_speech", "TEXT");
  ensureColumn(db, "words", "tags_json", "TEXT DEFAULT '[]'");
  ensureColumn(db, "words", "examples_json", "TEXT DEFAULT '[]'");
  ensureColumn(db, "words", "created_at", "TEXT");
  ensureColumn(db, "review_cards", "state", "TEXT DEFAULT 'new'");
  ensureColumn(db, "review_cards", "learning_step", "INTEGER DEFAULT 0");
  ensureColumn(db, "review_cards", "profile_scope", "TEXT DEFAULT 'guest:default'");
  ensureColumn(db, "review_logs", "profile_scope", "TEXT DEFAULT 'guest:default'");
  ensureColumn(db, "review_logs", "op_id", "TEXT");
  ensureColumn(db, "review_logs", "device_id", "TEXT");
  ensureColumn(db, "review_logs", "device_seq", "INTEGER DEFAULT 0");
  ensureColumn(db, "review_logs", "deck_sync_id", "TEXT");
  ensureColumn(db, "review_logs", "word_external_id", "TEXT");
  ensureColumn(db, "review_logs", "payload_json", "TEXT DEFAULT '{}'");
  ensureColumn(db, "review_logs", "sync_status", "TEXT DEFAULT 'pending'");
  ensureColumn(db, "review_logs", "synced_at", "TEXT");
  ensureColumn(db, "review_logs", "server_seq", "INTEGER DEFAULT 0");
  ensureColumn(db, "review_logs", "created_at", "TEXT DEFAULT CURRENT_TIMESTAMP");
  ensureColumn(db, "review_logs", "updated_at", "TEXT DEFAULT CURRENT_TIMESTAMP");
  const wordColumns = db.prepare("PRAGMA table_info(words)").all();
  const hasLegacySource = wordColumns.some((column) => column.name === "eng");
  const hasLegacyTarget = wordColumns.some((column) => column.name === "ru");
  const hasLegacyTertiary = wordColumns.some((column) => column.name === "pl");

  if (hasLegacySource) {
    db.exec(`
      UPDATE words
      SET source_text = COALESCE(source_text, eng)
      WHERE source_text IS NULL
    `);
  }

  if (hasLegacyTarget) {
    db.exec(`
      UPDATE words
      SET target_text = COALESCE(target_text, ru)
      WHERE target_text IS NULL
    `);
  }

  if (hasLegacyTertiary) {
    db.exec(`
      UPDATE words
      SET tertiary_text = COALESCE(tertiary_text, pl)
      WHERE tertiary_text IS NULL
    `);
  }

  db.exec(`
    UPDATE decks
    SET uses_word_levels = COALESCE(uses_word_levels, 1)
    WHERE uses_word_levels IS NULL
  `);

  db.exec(`
    UPDATE decks
    SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
    WHERE created_at IS NULL OR TRIM(created_at) = ''
  `);

  db.exec(`
    UPDATE decks
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
  `);

  db.exec(`
    UPDATE decks
    SET origin_kind = 'local'
    WHERE origin_kind IS NULL OR TRIM(origin_kind) = ''
  `);

  db.exec(`
    UPDATE words
    SET tags_json = '[]'
    WHERE tags_json IS NULL OR TRIM(tags_json) = ''
  `);

  db.exec(`
    UPDATE words
    SET examples_json = '[]'
    WHERE examples_json IS NULL OR TRIM(examples_json) = ''
  `);

  db.exec(`
    UPDATE words
    SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
    WHERE created_at IS NULL OR TRIM(created_at) = ''
  `);

  db.exec(`
    UPDATE review_cards
    SET profile_scope = 'guest:default'
    WHERE profile_scope IS NULL OR TRIM(profile_scope) = ''
  `);

  db.exec(`
    UPDATE review_logs
    SET profile_scope = 'guest:default'
    WHERE profile_scope IS NULL OR TRIM(profile_scope) = ''
  `);

  db.exec(`
    UPDATE review_logs
    SET payload_json = '{}'
    WHERE payload_json IS NULL OR TRIM(payload_json) = ''
  `);

  db.exec(`
    UPDATE review_logs
    SET sync_status = 'pending'
    WHERE sync_status IS NULL OR TRIM(sync_status) = ''
  `);

  db.exec(`
    UPDATE review_logs
    SET created_at = COALESCE(created_at, reviewed_at, CURRENT_TIMESTAMP)
    WHERE created_at IS NULL OR TRIM(created_at) = ''
  `);

  db.exec(`
    UPDATE review_logs
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_words_source_text ON words(source_text)
  `);

  const parseJsonArray = (value) => {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const deckRows = db
    .prepare(
      `
        SELECT
          id,
          name,
          description,
          source_language AS sourceLanguage,
          target_language AS targetLanguage,
          tertiary_language AS tertiaryLanguage,
          COALESCE(uses_word_levels, 1) AS usesWordLevels,
          tags_json AS tagsJson,
          sync_id AS syncId,
          origin_kind AS originKind,
          origin_ref AS originRef,
          content_hash AS contentHash
        FROM decks
        ORDER BY id ASC
      `,
    )
    .all();
  const wordsByDeckId = new Map();
  const wordRows = db
    .prepare(
      `
        SELECT
          deck_id AS deckId,
          external_id AS externalId,
          source_text AS source,
          target_text AS target,
          tertiary_text AS tertiary,
          level,
          part_of_speech,
          tags_json AS tagsJson,
          examples_json AS examplesJson
        FROM words
        ORDER BY deck_id ASC, id ASC
      `,
    )
    .all();

  wordRows.forEach((word) => {
    const deckId = Number(word?.deckId);

    if (!Number.isInteger(deckId) || deckId <= 0) {
      return;
    }

    const currentWords = wordsByDeckId.get(deckId) || [];
    currentWords.push({
      externalId: typeof word?.externalId === "string" ? word.externalId : "",
      source: typeof word?.source === "string" ? word.source : "",
      target: typeof word?.target === "string" ? word.target : "",
      tertiary: typeof word?.tertiary === "string" ? word.tertiary : "",
      level: typeof word?.level === "string" ? word.level : "",
      part_of_speech:
        typeof word?.part_of_speech === "string" ? word.part_of_speech : "",
      tags: parseJsonArray(word?.tagsJson),
      examples: parseJsonArray(word?.examplesJson),
    });
    wordsByDeckId.set(deckId, currentWords);
  });

  const updateDeckSyncMetadata = db.prepare(`
    UPDATE decks
    SET
      sync_id = ?,
      origin_kind = ?,
      origin_ref = ?,
      content_hash = ?
    WHERE id = ?
  `);
  const seenSyncIds = new Set();

  deckRows.forEach((deck) => {
    const nextSyncId = resolveDeckSyncId({
      currentSyncId: deck?.syncId,
      existingSyncIds: [...seenSyncIds],
    });
    seenSyncIds.add(nextSyncId);

    const nextOriginKind = normalizeDeckOriginKind(deck?.originKind);
    const nextOriginRef = normalizeDeckOriginRef(deck?.originRef);
    const nextContentHash = buildDeckContentHash({
      deck: {
        name: deck?.name,
        description: deck?.description,
        sourceLanguage: deck?.sourceLanguage,
        targetLanguage: deck?.targetLanguage,
        tertiaryLanguage: deck?.tertiaryLanguage,
        usesWordLevels: Boolean(Number(deck?.usesWordLevels)),
        tags: parseJsonArray(deck?.tagsJson),
      },
      words: wordsByDeckId.get(Number(deck?.id)) || [],
    });

    if (
      deck?.syncId === nextSyncId &&
      deck?.originKind === nextOriginKind &&
      (deck?.originRef || "") === nextOriginRef &&
      deck?.contentHash === nextContentHash
    ) {
      return;
    }

    updateDeckSyncMetadata.run(
      nextSyncId,
      nextOriginKind,
      nextOriginRef || null,
      nextContentHash,
      deck.id,
    );
  });

  db.exec(`
    UPDATE review_cards
    SET state = 'new'
    WHERE state IS NULL OR TRIM(state) = ''
  `);

  db.exec(`
    UPDATE review_cards
    SET learning_step = 0
    WHERE learning_step IS NULL
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_review_cards_state_due
    ON review_cards(state, due_at)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_review_logs_deck_reviewed
    ON review_logs(deck_id, reviewed_at)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_review_logs_profile_reviewed
    ON review_logs(profile_scope, reviewed_at)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_review_logs_sync_status
    ON review_logs(sync_status)
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_review_logs_op_id
    ON review_logs(op_id)
  `);

  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_decks_sync_id_unique
    ON decks(sync_id)
  `);
};
