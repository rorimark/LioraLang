import { getDatabase } from "./db.js";

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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (folder_id) REFERENCES deck_folders(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT,
      deck_id INTEGER NOT NULL,
      eng TEXT NOT NULL,
      ru TEXT,
      pl TEXT,
      level TEXT,
      part_of_speech TEXT,
      tags_json TEXT DEFAULT '[]',
      examples_json TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_words_deck_id ON words(deck_id);
    CREATE INDEX IF NOT EXISTS idx_words_eng ON words(eng);

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
};
