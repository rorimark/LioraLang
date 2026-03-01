import { getDatabase } from "./db.js";

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
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );
  `);

  ensureColumn(db, "decks", "source_language", "TEXT");
  ensureColumn(db, "decks", "target_language", "TEXT");
  ensureColumn(db, "decks", "tertiary_language", "TEXT");
  ensureColumn(db, "decks", "description", "TEXT");
  ensureColumn(db, "decks", "tags_json", "TEXT DEFAULT '[]'");
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
    SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP)
    WHERE created_at IS NULL OR TRIM(created_at) = ''
  `);

  db.exec(`
    UPDATE decks
    SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
    WHERE updated_at IS NULL OR TRIM(updated_at) = ''
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
    CREATE INDEX IF NOT EXISTS idx_words_source_text ON words(source_text)
  `);

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
};
