import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";
import {
  closeDatabaseConnection,
  getDatabase,
  initDatabaseConnection,
} from "../db/db.js";
import { initDb } from "../db/initDb.js";
import {
  getDeckWords,
  listDecks,
  saveDeck,
} from "../db/services/db.services.js";
import { getAppSettings } from "../db/services/settings.services.js";
import { migrateLegacyDbStorage } from "../services/legacyStorageMigration.service.js";

const DB_FILE_NAME = "lioralang.db";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const createLegacyDatabase = (dbFilePath) => {
  const dbDirPath = path.dirname(dbFilePath);

  if (!fs.existsSync(dbDirPath)) {
    fs.mkdirSync(dbDirPath, { recursive: true });
  }

  const db = new Database(dbFilePath);

  db.exec(`
    CREATE TABLE decks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE words (
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const deckResult = db
    .prepare(
      `
        INSERT INTO decks (name, description)
        VALUES (?, ?)
      `,
    )
    .run("Legacy GoT Deck", "Legacy schema deck");
  const deckId = Number(deckResult.lastInsertRowid);

  db.prepare(
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
  ).run(
    "legacy-1",
    deckId,
    "winter",
    "зима",
    "zima",
    "B1",
    "noun",
    JSON.stringify(["weather"]),
    JSON.stringify(["Winter is coming."]),
  );

  db.prepare(
    `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
    `,
  ).run(
    "appPreferences",
    JSON.stringify({
      studySession: { dailyGoal: 33 },
      uiAccessibility: { themeMode: "dark" },
      privacy: { analyticsEnabled: true },
    }),
  );

  db.prepare(
    `
      INSERT INTO app_settings (key, value)
      VALUES (?, ?)
    `,
  ).run(
    "shortcutSettings",
    JSON.stringify({
      historyNavigation: "system",
      learnFlip: "space",
      learnRating: "digits",
      showLearnShortcuts: true,
    }),
  );

  db.close();
};

const run = () => {
  const sandboxRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "lioralang-persistence-"),
  );
  const appDataPath = path.join(sandboxRoot, "appData");
  const currentUserDataPath = path.join(appDataPath, "LioraLang");
  const legacyUserDataPath = path.join(appDataPath, "app");
  const legacyDbPath = path.join(legacyUserDataPath, "data", DB_FILE_NAME);

  createLegacyDatabase(legacyDbPath);

  const migrationResult = migrateLegacyDbStorage({
    appDataPath,
    currentUserDataPath,
    dbFileName: DB_FILE_NAME,
  });

  assert(migrationResult.dbPath, "Migration must resolve an active DB path");
  assert(
    fs.existsSync(migrationResult.dbPath),
    "Migrated DB file should exist on disk",
  );

  initDatabaseConnection(migrationResult.dbPath);
  initDb();

  const decks = listDecks();

  assert(decks.length === 1, "Deck should persist after migration");

  const deckId = Number(decks[0].id);
  const words = getDeckWords(deckId);

  assert(words.length === 1, "Legacy word should persist after migration");
  assert(words[0].source === "winter", "Legacy source value should be migrated");
  assert(words[0].target === "зима", "Legacy target value should be migrated");
  assert(words[0].tertiary === "zima", "Legacy tertiary value should be migrated");

  const settings = getAppSettings();

  assert(
    settings?.appPreferences?.studySession?.dailyGoal === 33,
    "appPreferences should persist",
  );
  assert(
    settings?.shortcutSettings?.learnRating === "digits",
    "shortcutSettings should persist",
  );

  const nextWords = [
    ...words.map((word) => ({
      id: word.id,
      externalId: word.externalId,
      source: word.source,
      target: word.target,
      tertiary: word.tertiary,
      level: word.level,
      part_of_speech: word.part_of_speech,
      tags: word.tags,
      examples: word.examples,
    })),
    {
      externalId: "legacy-2",
      source: "dragon",
      target: "дракон",
      tertiary: "smok",
      level: "B2",
      part_of_speech: "noun",
      tags: ["creature"],
      examples: ["A dragon flew over the city."],
    },
  ];

  saveDeck({
    deckId,
    name: decks[0].name,
    description: decks[0].description || "",
    sourceLanguage: "English",
    targetLanguage: "Russian",
    tertiaryLanguage: "Polish",
    tags: ["got", "legacy"],
    words: nextWords,
  });

  closeDatabaseConnection();
  initDatabaseConnection(migrationResult.dbPath);
  initDb();

  const persistedWordsAfterRestart = getDeckWords(deckId);

  assert(
    persistedWordsAfterRestart.length === 2,
    "Updated words should persist after DB reconnect",
  );
  assert(
    persistedWordsAfterRestart.some((word) => word.source === "dragon"),
    "Newly added word should be readable after reconnect",
  );

  const db = getDatabase();
  const hasSourceColumn = db
    .prepare("PRAGMA table_info(words)")
    .all()
    .some((column) => column.name === "source_text");

  assert(hasSourceColumn, "words.source_text column should exist after initDb");

  closeDatabaseConnection();

  console.log("Persistence check passed:");
  console.log(`- migrated: ${migrationResult.migrated}`);
  console.log(`- active DB: ${migrationResult.dbPath}`);
  console.log(`- source DB: ${migrationResult.sourceDbPath}`);
};

try {
  run();
} catch (error) {
  try {
    closeDatabaseConnection();
  } catch {
    // no-op
  }

  console.error("Persistence check failed:", error?.message || error);
  process.exitCode = 1;
}
