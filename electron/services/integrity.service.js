import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { app } from "electron";
import {
  closeDatabaseConnection,
  getDatabase,
  getDatabasePath,
  initDatabaseConnection,
} from "../db/db.js";
import { initDb } from "../db/initDb.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ELECTRON_DIR = path.resolve(__dirname, "..");
const PROJECT_DIR = path.resolve(ELECTRON_DIR, "..");

const EXPECTED_TABLES_SCHEMA = {
  deck_folders: {
    requiredColumns: ["id", "name", "parent_id", "created_at"],
    optionalColumns: [],
  },
  decks: {
    requiredColumns: [
      "id",
      "folder_id",
      "name",
      "description",
      "source_language",
      "target_language",
      "tertiary_language",
      "tags_json",
      "created_at",
      "updated_at",
    ],
    optionalColumns: [],
  },
  words: {
    requiredColumns: [
      "id",
      "external_id",
      "deck_id",
      "source_text",
      "target_text",
      "tertiary_text",
      "level",
      "part_of_speech",
      "tags_json",
      "examples_json",
      "created_at",
    ],
    optionalColumns: ["eng", "ru", "pl"],
  },
  review_cards: {
    requiredColumns: [
      "id",
      "word_id",
      "state",
      "learning_step",
      "due_at",
      "interval_days",
      "ease_factor",
      "reps",
      "lapses",
      "last_reviewed_at",
    ],
    optionalColumns: [],
  },
  review_logs: {
    requiredColumns: [
      "id",
      "word_id",
      "deck_id",
      "reviewed_at",
      "rating",
      "queue_type",
      "prev_state",
      "next_state",
      "prev_interval_days",
      "next_interval_days",
      "prev_ease_factor",
      "next_ease_factor",
    ],
    optionalColumns: [],
  },
};

const normalizeDateStamp = (value) =>
  value.replaceAll("-", "").replaceAll(":", "").replaceAll(".", "");

const toSinglePragmaValue = (rows = []) => {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "";
  }

  const firstRow = rows[0];
  const values = Object.values(firstRow);
  return typeof values[0] === "string" ? values[0] : "";
};

const checkCoreFiles = () => {
  const checks = [];
  const requiredFiles = app.isPackaged
    ? [{ filePath: path.join(process.resourcesPath, "app.asar"), checkRead: false }]
    : [
        { filePath: path.join(ELECTRON_DIR, "main.js"), checkRead: true },
        { filePath: path.join(ELECTRON_DIR, "preload.cjs"), checkRead: true },
        { filePath: path.join(PROJECT_DIR, "package.json"), checkRead: true },
      ];

  requiredFiles.forEach(({ filePath, checkRead }) => {
    const exists = fs.existsSync(filePath);
    let isReadable = exists;

    if (exists && checkRead) {
      try {
        fs.accessSync(filePath, fs.constants.R_OK);
        isReadable = true;
      } catch {
        isReadable = false;
      }
    }

    checks.push({
      filePath,
      exists,
      isReadable,
    });
  });

  const failed = checks.filter((item) => !item.exists || !item.isReadable);

  return {
    ok: failed.length === 0,
    checks,
    issues: failed.map((item) =>
      item.exists
        ? `File is not readable: ${item.filePath}`
        : `Missing file: ${item.filePath}`,
    ),
  };
};

const getExistingUserTables = (db) =>
  db
    .prepare(
      `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
      `,
    )
    .all()
    .map((row) => row.name);

const getTableColumns = (db, tableName) =>
  db.prepare(`PRAGMA table_info(${tableName})`).all().map((row) => row.name);

const checkSchemaDrift = (db) => {
  const issues = [];
  let hasCriticalIssue = false;
  const existingTables = new Set(getExistingUserTables(db));

  Object.entries(EXPECTED_TABLES_SCHEMA).forEach(([tableName, schema]) => {
    if (!existingTables.has(tableName)) {
      issues.push(`Missing table: ${tableName}`);
      hasCriticalIssue = true;
      return;
    }

    const existingColumns = getTableColumns(db, tableName);
    const columnSet = new Set(existingColumns);
    const allowedColumns = new Set([
      ...schema.requiredColumns,
      ...schema.optionalColumns,
    ]);

    schema.requiredColumns.forEach((columnName) => {
      if (!columnSet.has(columnName)) {
        issues.push(`Missing column: ${tableName}.${columnName}`);
        hasCriticalIssue = true;
      }
    });

    existingColumns.forEach((columnName) => {
      if (!allowedColumns.has(columnName)) {
        issues.push(`Unexpected column: ${tableName}.${columnName}`);
        hasCriticalIssue = true;
      }
    });
  });

  return {
    hasCriticalIssue,
    issues,
  };
};

const checkDatabaseHealth = (db) => {
  const quickCheckRows = db.prepare("PRAGMA quick_check").all();
  const quickCheckValue = toSinglePragmaValue(quickCheckRows);
  const foreignKeyIssues = db.prepare("PRAGMA foreign_key_check").all();
  const schemaDrift = checkSchemaDrift(db);
  const issues = [];

  if (quickCheckValue !== "ok") {
    issues.push(`SQLite quick_check failed: ${quickCheckValue || "unknown error"}`);
  }

  if (foreignKeyIssues.length > 0) {
    issues.push(`Foreign key violations found: ${foreignKeyIssues.length}`);
  }

  issues.push(...schemaDrift.issues);

  return {
    quickCheckValue,
    foreignKeyViolations: foreignKeyIssues.length,
    hasCriticalIssue:
      quickCheckValue !== "ok" ||
      foreignKeyIssues.length > 0 ||
      schemaDrift.hasCriticalIssue,
    issues,
  };
};

const isDatabaseFileMissingOnDisk = () => {
  const dbPath = getDatabasePath();

  if (!dbPath) {
    return true;
  }

  return !fs.existsSync(dbPath);
};

const moveIfExists = (sourcePath, targetPath) => {
  if (!fs.existsSync(sourcePath)) {
    return null;
  }

  fs.renameSync(sourcePath, targetPath);
  return targetPath;
};

const resetDatabaseToInitialState = () => {
  const dbPath = getDatabasePath();

  if (!dbPath) {
    throw new Error("Database path is not available");
  }

  const timestamp = normalizeDateStamp(new Date().toISOString());
  const backupBase = `${dbPath}.backup-${timestamp}`;
  const movedBackupPaths = [];

  closeDatabaseConnection();

  [
    { sourcePath: dbPath, targetSuffix: ".db" },
    { sourcePath: `${dbPath}-wal`, targetSuffix: ".db-wal" },
    { sourcePath: `${dbPath}-shm`, targetSuffix: ".db-shm" },
  ].forEach(({ sourcePath, targetSuffix }) => {
    const targetPath = `${backupBase}${targetSuffix}`;
    const movedPath = moveIfExists(sourcePath, targetPath);

    if (movedPath) {
      movedBackupPaths.push(movedPath);
    }
  });

  initDatabaseConnection(dbPath);
  initDb();

  return {
    dbPath,
    backupPaths: movedBackupPaths,
  };
};

export const verifyAppIntegrityAndRepair = (options = {}) => {
  const shouldRepair = Boolean(options?.repair);
  const checkedAt = new Date().toISOString();
  const coreFilesReport = checkCoreFiles();
  const databaseReport = {
    checked: false,
    ok: false,
    needsRepair: false,
    repaired: false,
    resetApplied: false,
    issues: [],
    backupPaths: [],
  };

  try {
    const missingDbFile = isDatabaseFileMissingOnDisk();
    initDb();
    const db = getDatabase();
    const healthBeforeRepair = checkDatabaseHealth(db);
    databaseReport.checked = true;
    databaseReport.issues = missingDbFile
      ? ["Database file is missing on disk", ...healthBeforeRepair.issues]
      : healthBeforeRepair.issues;
    databaseReport.needsRepair = missingDbFile || healthBeforeRepair.hasCriticalIssue;

    if (databaseReport.needsRepair && shouldRepair) {
      const resetResult = resetDatabaseToInitialState();
      databaseReport.repaired = true;
      databaseReport.resetApplied = true;
      databaseReport.backupPaths = [
        ...databaseReport.backupPaths,
        ...resetResult.backupPaths,
      ];

      const repairedDb = getDatabase();
      const healthAfterRepair = checkDatabaseHealth(repairedDb);
      databaseReport.issues = healthAfterRepair.issues;
      databaseReport.needsRepair = healthAfterRepair.hasCriticalIssue;
      databaseReport.ok = !healthAfterRepair.hasCriticalIssue;
    } else {
      databaseReport.ok = !databaseReport.needsRepair;
    }
  } catch (error) {
    databaseReport.checked = true;
    databaseReport.ok = false;
    databaseReport.needsRepair = false;
    databaseReport.issues = [error.message || "Integrity check failed"];
  }

  const ok = coreFilesReport.ok && databaseReport.ok;
  const summary = ok
    ? "Integrity check passed. Files and database are healthy."
    : databaseReport.resetApplied && databaseReport.ok
      ? "Issues were found. Database was restored to initial state."
      : databaseReport.needsRepair
        ? "Integrity issues found. Confirmation is required to restore database."
      : "Integrity check failed. Manual review is required.";

  return {
    ok,
    checkedAt,
    coreFiles: coreFilesReport,
    database: databaseReport,
    summary,
  };
};
