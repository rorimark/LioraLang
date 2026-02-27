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
      due_at TEXT,
      interval_days INTEGER DEFAULT 1,
      ease_factor REAL DEFAULT 2.5,
      reps INTEGER DEFAULT 0,
      lapses INTEGER DEFAULT 0,
      last_reviewed_at TEXT,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );
  `);

  ensureColumn(db, "decks", "source_language", "TEXT");
  ensureColumn(db, "decks", "target_language", "TEXT");
  ensureColumn(db, "decks", "tertiary_language", "TEXT");
  ensureColumn(db, "decks", "tags_json", "TEXT DEFAULT '[]'");
  ensureColumn(db, "words", "source_text", "TEXT");
  ensureColumn(db, "words", "target_text", "TEXT");
  ensureColumn(db, "words", "tertiary_text", "TEXT");
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
    CREATE INDEX IF NOT EXISTS idx_words_source_text ON words(source_text)
  `);
};
