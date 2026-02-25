import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

let database = null;
let databasePath = "";

export const initDatabaseConnection = (targetPath) => {
  if (database) {
    return database;
  }

  databasePath = targetPath;
  const dirPath = path.dirname(targetPath);

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  let Database;

  try {
    Database = require("better-sqlite3");
  } catch (loadError) {
    throw new Error("Failed to load native sqlite module. Run: pnpm rebuild:native", {
      cause: loadError,
    });
  }

  database = new Database(targetPath);
  database.pragma("journal_mode = WAL");
  database.pragma("foreign_keys = ON");

  return database;
};

export const getDatabase = () => {
  if (!database) {
    throw new Error("Database connection is not initialized");
  }

  return database;
};

export const getDatabasePath = () => databasePath;
