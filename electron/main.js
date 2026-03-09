import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  Tray,
  session,
} from "electron";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import {
  closeDatabaseConnection,
  getDatabase,
  getDatabasePath,
  initDatabaseConnection,
} from "./db/db.js";
import { initDb } from "./db/initDb.js";
import { readStoredDbPath, writeStoredDbPath } from "./services/dbPath.service.js";
import { migrateLegacyDbStorage } from "./services/legacyStorageMigration.service.js";
import { verifyAppIntegrityAndRepair } from "./services/integrity.service.js";
import {
  createHubDeckDownloadUrl,
  incrementHubDeckDownloads,
  listHubDecks,
  publishHubDeck,
} from "./services/hub.service.js";
import {
  listDecks,
  getDeckById,
  getDeckWords,
  importDeckFromJsonFile,
  readDeckImportMetadataFromJsonFile,
  exportDeckToJsonPackage,
  exportDeckToJsonFile,
  renameDeck,
  deleteDeck,
  saveDeck,
} from "./db/services/db.services.js";
import { getAppSettings, updateAppSettings } from "./db/services/settings.services.js";
import { getSrsSessionSnapshot, gradeSrsCard } from "./db/services/srs.services.js";
import { getProgressOverview } from "./db/services/progress.services.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ICON_PATH =
  process.platform === "win32"
    ? path.join(__dirname, "assets", "icon.ico")
    : path.join(__dirname, "assets", "icon.png");
const APP_HOMEPAGE_URL = "https://github.com/rorimark/LioraLang";
const SETTINGS_ROUTE_PATH = "/app/settings";
const SETTINGS_MENU_TABS = [
  {
    key: "general",
    label: "General",
    sectionId: "settings-general",
    accelerator: "CmdOrCtrl+,",
  },
  {
    key: "learning-core",
    label: "Learning core",
    sectionId: "settings-learning-core",
  },
  {
    key: "deck-defaults",
    label: "Deck defaults",
    sectionId: "settings-deck-defaults",
  },
  {
    key: "import-export",
    label: "Import and export",
    sectionId: "settings-import-export",
  },
  {
    key: "storage-integrity",
    label: "Storage and integrity",
    sectionId: "settings-storage-integrity",
  },
  {
    key: "workspace-safety",
    label: "Workspace and safety",
    sectionId: "settings-workspace-safety",
  },
  {
    key: "advanced-desktop",
    label: "Advanced desktop and privacy",
    sectionId: "settings-advanced-desktop",
  },
];
const APP_THEME_CSS_PATH = path.join(__dirname, "..", "src", "shared", "config", "variables.css");
const WINDOW_TITLE_BAR_HEIGHT = 36;
const TITLE_BAR_FALLBACK_THEME = {
  light: {
    color: "#d5deea",
    symbolColor: "#0f172a",
  },
  dark: {
    color: "#070c14",
    symbolColor: "#f8fafc",
  },
};
const parseCssVariableBlock = (cssBlock) => {
  if (typeof cssBlock !== "string" || cssBlock.length === 0) {
    return {};
  }

  const tokens = {};

  for (const match of cssBlock.matchAll(/--([a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const tokenName = match[1]?.trim();
    const tokenValue = match[2]?.replace(/\s+/g, " ").trim();

    if (!tokenName || !tokenValue) {
      continue;
    }

    tokens[tokenName] = tokenValue;
  }

  return tokens;
};

const readAppThemeTokens = () => {
  try {
    const cssSource = fs.readFileSync(APP_THEME_CSS_PATH, "utf8");
    const lightBlock = cssSource.match(/:root\s*{([\s\S]*?)}/)?.[1] || "";
    const darkBlock = cssSource.match(/:root\[theme=["']dark["']\]\s*{([\s\S]*?)}/)?.[1] || "";
    const lightTokens = parseCssVariableBlock(lightBlock);

    return {
      light: lightTokens,
      dark: {
        ...lightTokens,
        ...parseCssVariableBlock(darkBlock),
      },
    };
  } catch {
    return {
      light: {},
      dark: {},
    };
  }
};

const APP_THEME_TOKENS = readAppThemeTokens();
const resolveThemeToken = (tokenName, themeName = "light", fallbackValue = "") => {
  const themeTokens = APP_THEME_TOKENS[themeName] || APP_THEME_TOKENS.light;
  const resolvedValue = themeTokens?.[tokenName] || APP_THEME_TOKENS.light?.[tokenName];

  if (typeof resolvedValue === "string" && resolvedValue.length > 0) {
    return resolvedValue;
  }

  return fallbackValue;
};

const WINDOW_TITLE_BAR_THEME = {
  light: {
    color: resolveThemeToken(
      "color-titlebar",
      "light",
      TITLE_BAR_FALLBACK_THEME.light.color,
    ),
    symbolColor: resolveThemeToken(
      "color-titlebar-symbol",
      "light",
      TITLE_BAR_FALLBACK_THEME.light.symbolColor,
    ),
  },
  dark: {
    color: resolveThemeToken(
      "color-titlebar",
      "dark",
      TITLE_BAR_FALLBACK_THEME.dark.color,
    ),
    symbolColor: resolveThemeToken(
      "color-titlebar-symbol",
      "dark",
      TITLE_BAR_FALLBACK_THEME.dark.symbolColor,
    ),
  },
};
const FATAL_STARTUP_ERROR_THEME = {
  bodyBackground: resolveThemeToken("color-bg", "dark"),
  bodyText: resolveThemeToken("color-text", "dark"),
  cardBorder: resolveThemeToken("color-border", "dark"),
  cardBackground: resolveThemeToken("color-surface", "dark"),
  cardShadow: resolveThemeToken("shadow-md", "dark"),
  mutedText: resolveThemeToken("color-text-muted", "dark"),
  codeBorder: resolveThemeToken("flashcard-border", "dark"),
  codeBackground: resolveThemeToken("color-surface-muted", "dark"),
};

let mainWindow = null;
let appTray = null;
let isQuitRequested = false;
let backupTimerId = null;
let isBackupInFlight = false;
let backupScheduleSignature = "";
let launchAtStartupSignature = null;
let pendingImportFilePaths = [];
let pendingRuntimeErrorEvents = [];
let pendingNavigationRequests = [];
const SUPPORTED_DECK_IMPORT_EXTENSIONS = [".json", ".lioradeck", ".lioralang"];
const DB_FILE_NAME = "lioralang.db";
const REMOTE_IMPORT_TIMEOUT_MS = 35_000;
const REMOTE_IMPORT_MAX_BYTES = 50 * 1024 * 1024;
const APP_PREFERENCES_SETTINGS_KEY = "appPreferences";
const LOG_LEVELS = {
  error: "error",
  warn: "warn",
  debug: "debug",
};
const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.error]: 1,
  [LOG_LEVELS.warn]: 2,
  [LOG_LEVELS.debug]: 3,
};
const BACKUP_INTERVAL_MS = {
  off: 0,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};
const DEFAULT_RUNTIME_APP_PREFERENCES = {
  studySession: {
    dailyGoal: 20,
    repeatWrongCards: true,
  },
  deckDefaults: {
    sourceLanguage: "English",
    targetLanguage: "Ukrainian",
    level: "A1",
    partOfSpeech: "noun",
    tags: [],
  },
  importExport: {
    autoOpenLanguageReview: false,
    duplicateStrategy: "skip",
    exportFormat: "lioradeck",
    includeExamples: true,
    includeTags: true,
  },
  dataSafety: {
    autoBackupInterval: "weekly",
    maxBackups: 10,
    confirmDestructive: true,
  },
  desktop: {
    launchAtStartup: false,
    minimizeToTray: false,
    hardwareAcceleration: true,
    devMode: false,
    updateChannel: "stable",
  },
  privacy: {
    analyticsEnabled: false,
    crashReportsEnabled: true,
    logLevel: LOG_LEVELS.error,
  },
};
let appPreferencesCache = DEFAULT_RUNTIME_APP_PREFERENCES;

const getDevServerUrl = () => {
  return process.env.VITE_DEV_SERVER_URL || "http://localhost:5175";
};

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
};

const toIntegerInRange = (value, min, max, fallback) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  if (numericValue < min) {
    return min;
  }

  if (numericValue > max) {
    return max;
  }

  return Math.round(numericValue);
};

const normalizeUniqueTags = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueTags = [];
  const seen = new Set();

  value.forEach((item) => {
    const tag = toCleanString(item);
    const tagKey = tag.toLowerCase();

    if (!tag || seen.has(tagKey)) {
      return;
    }

    seen.add(tagKey);
    uniqueTags.push(tag);
  });

  return uniqueTags.slice(0, 10);
};

const normalizeAppPreferencesForMain = (value = {}) => {
  const raw = value && typeof value === "object" ? value : {};
  const dataSafetyInterval = toCleanString(raw?.dataSafety?.autoBackupInterval);
  const backupInterval = Object.hasOwn(BACKUP_INTERVAL_MS, dataSafetyInterval)
    ? dataSafetyInterval
    : DEFAULT_RUNTIME_APP_PREFERENCES.dataSafety.autoBackupInterval;
  const duplicateStrategy = ["skip", "update", "keep_both"].includes(
    raw?.importExport?.duplicateStrategy,
  )
    ? raw.importExport.duplicateStrategy
    : DEFAULT_RUNTIME_APP_PREFERENCES.importExport.duplicateStrategy;
  const exportFormat = ["lioradeck", "json"].includes(raw?.importExport?.exportFormat)
    ? raw.importExport.exportFormat
    : DEFAULT_RUNTIME_APP_PREFERENCES.importExport.exportFormat;
  const updateChannel = ["stable", "beta"].includes(raw?.desktop?.updateChannel)
    ? raw.desktop.updateChannel
    : DEFAULT_RUNTIME_APP_PREFERENCES.desktop.updateChannel;
  const logLevel = Object.hasOwn(LOG_LEVEL_PRIORITY, raw?.privacy?.logLevel)
    ? raw.privacy.logLevel
    : DEFAULT_RUNTIME_APP_PREFERENCES.privacy.logLevel;

  return {
    studySession: {
      dailyGoal: toIntegerInRange(
        raw?.studySession?.dailyGoal,
        1,
        999,
        DEFAULT_RUNTIME_APP_PREFERENCES.studySession.dailyGoal,
      ),
      repeatWrongCards: toBoolean(
        raw?.studySession?.repeatWrongCards,
        DEFAULT_RUNTIME_APP_PREFERENCES.studySession.repeatWrongCards,
      ),
    },
    deckDefaults: {
      sourceLanguage:
        toCleanString(raw?.deckDefaults?.sourceLanguage) ||
        DEFAULT_RUNTIME_APP_PREFERENCES.deckDefaults.sourceLanguage,
      targetLanguage:
        toCleanString(raw?.deckDefaults?.targetLanguage) ||
        DEFAULT_RUNTIME_APP_PREFERENCES.deckDefaults.targetLanguage,
      level:
        toCleanString(raw?.deckDefaults?.level) ||
        DEFAULT_RUNTIME_APP_PREFERENCES.deckDefaults.level,
      partOfSpeech:
        toCleanString(raw?.deckDefaults?.partOfSpeech) ||
        DEFAULT_RUNTIME_APP_PREFERENCES.deckDefaults.partOfSpeech,
      tags: normalizeUniqueTags(raw?.deckDefaults?.tags),
    },
    importExport: {
      autoOpenLanguageReview: toBoolean(
        raw?.importExport?.autoOpenLanguageReview,
        DEFAULT_RUNTIME_APP_PREFERENCES.importExport.autoOpenLanguageReview,
      ),
      duplicateStrategy,
      exportFormat,
      includeExamples: toBoolean(
        raw?.importExport?.includeExamples,
        DEFAULT_RUNTIME_APP_PREFERENCES.importExport.includeExamples,
      ),
      includeTags: toBoolean(
        raw?.importExport?.includeTags,
        DEFAULT_RUNTIME_APP_PREFERENCES.importExport.includeTags,
      ),
    },
    dataSafety: {
      autoBackupInterval: backupInterval,
      maxBackups: toIntegerInRange(
        raw?.dataSafety?.maxBackups,
        1,
        100,
        DEFAULT_RUNTIME_APP_PREFERENCES.dataSafety.maxBackups,
      ),
      confirmDestructive: toBoolean(
        raw?.dataSafety?.confirmDestructive,
        DEFAULT_RUNTIME_APP_PREFERENCES.dataSafety.confirmDestructive,
      ),
    },
    desktop: {
      launchAtStartup: toBoolean(
        raw?.desktop?.launchAtStartup,
        DEFAULT_RUNTIME_APP_PREFERENCES.desktop.launchAtStartup,
      ),
      minimizeToTray: toBoolean(
        raw?.desktop?.minimizeToTray,
        DEFAULT_RUNTIME_APP_PREFERENCES.desktop.minimizeToTray,
      ),
      hardwareAcceleration: toBoolean(
        raw?.desktop?.hardwareAcceleration,
        DEFAULT_RUNTIME_APP_PREFERENCES.desktop.hardwareAcceleration,
      ),
      devMode: toBoolean(
        raw?.desktop?.devMode,
        DEFAULT_RUNTIME_APP_PREFERENCES.desktop.devMode,
      ),
      updateChannel,
    },
    privacy: {
      analyticsEnabled: toBoolean(
        raw?.privacy?.analyticsEnabled,
        DEFAULT_RUNTIME_APP_PREFERENCES.privacy.analyticsEnabled,
      ),
      crashReportsEnabled: toBoolean(
        raw?.privacy?.crashReportsEnabled,
        DEFAULT_RUNTIME_APP_PREFERENCES.privacy.crashReportsEnabled,
      ),
      logLevel,
    },
  };
};

const extractAppPreferencesFromSettings = (settings = {}) => {
  const nextPreferences = settings?.[APP_PREFERENCES_SETTINGS_KEY];
  return normalizeAppPreferencesForMain(nextPreferences);
};

const getRuntimeLogLevel = () =>
  appPreferencesCache?.privacy?.logLevel || LOG_LEVELS.error;

const shouldLog = (targetLevel) => {
  const targetPriority = LOG_LEVEL_PRIORITY[targetLevel] || LOG_LEVEL_PRIORITY[LOG_LEVELS.error];
  const currentPriority =
    LOG_LEVEL_PRIORITY[getRuntimeLogLevel()] || LOG_LEVEL_PRIORITY[LOG_LEVELS.error];

  return currentPriority >= targetPriority;
};

const logWarn = (...args) => {
  if (shouldLog(LOG_LEVELS.warn)) {
    console.warn(...args);
  }
};

const logError = (...args) => {
  if (shouldLog(LOG_LEVELS.error)) {
    console.error(...args);
  }
};

const resolveTitleBarTheme = (themeValue) => {
  if (themeValue === "dark") {
    return WINDOW_TITLE_BAR_THEME.dark;
  }

  return WINDOW_TITLE_BAR_THEME.light;
};

const normalizeImportFilePath = (filePath) => {
  if (typeof filePath !== "string") {
    return "";
  }

  const trimmedPath = filePath.trim().replace(/^['"]|['"]$/g, "");

  if (!trimmedPath) {
    return "";
  }

  return path.resolve(trimmedPath);
};

const isDeckImportFilePath = (filePath) => {
  const normalizedPath = normalizeImportFilePath(filePath);

  if (!normalizedPath) {
    return false;
  }

  const fileExtension = path.extname(normalizedPath).toLowerCase();

  return SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(fileExtension);
};

const resolveDeckImportFilePathFromArgs = (args = [], workingDirectory = process.cwd()) => {
  if (!Array.isArray(args) || args.length === 0) {
    return "";
  }

  for (const argValue of args) {
    if (typeof argValue !== "string" || argValue.startsWith("-")) {
      continue;
    }

    const normalizedArgValue = argValue.trim().replace(/^['"]|['"]$/g, "");

    if (!normalizedArgValue) {
      continue;
    }

    const resolvedPath = path.isAbsolute(normalizedArgValue)
      ? normalizedArgValue
      : path.resolve(workingDirectory || process.cwd(), normalizedArgValue);

    if (!isDeckImportFilePath(resolvedPath) || !fs.existsSync(resolvedPath)) {
      continue;
    }

    return normalizeImportFilePath(resolvedPath);
  }

  return "";
};

const readDeckImportPayloadFromFilePath = (filePath) => {
  const normalizedFilePath = normalizeImportFilePath(filePath);

  if (!normalizedFilePath || !fs.existsSync(normalizedFilePath)) {
    return null;
  }

  const fallbackDeckName = path.basename(
    normalizedFilePath,
    path.extname(normalizedFilePath),
  );
  const importMetadata = (() => {
    try {
      return readDeckImportMetadataFromJsonFile(normalizedFilePath);
    } catch {
      return null;
    }
  })();

  return {
    canceled: false,
    filePath: normalizedFilePath,
    fileName: path.basename(normalizedFilePath),
    suggestedDeckName: importMetadata?.name || fallbackDeckName,
    sourceLanguage: importMetadata?.sourceLanguage || "",
    targetLanguage: importMetadata?.targetLanguage || "",
    tertiaryLanguage: importMetadata?.tertiaryLanguage || "",
    tags: Array.isArray(importMetadata?.tags) ? importMetadata.tags : [],
    description: importMetadata?.description || "",
    wordsCount: importMetadata?.wordsCount ?? null,
    packageFormat: importMetadata?.format || "",
    packageVersion: importMetadata?.version ?? null,
  };
};

const resolveDeckImportSettings = (payload = {}) => {
  const appPreferences = extractAppPreferencesFromSettings(getAppSettings());
  const sourceLanguage =
    typeof payload?.sourceLanguage === "string" ? payload.sourceLanguage.trim() : "";
  const targetLanguage =
    typeof payload?.targetLanguage === "string" ? payload.targetLanguage.trim() : "";
  const tertiaryLanguage =
    typeof payload?.tertiaryLanguage === "string"
      ? payload.tertiaryLanguage.trim()
      : "";
  const duplicateStrategy = ["skip", "update", "keep_both"].includes(
    payload?.settings?.duplicateStrategy,
  )
    ? payload.settings.duplicateStrategy
    : appPreferences.importExport.duplicateStrategy;
  const includeExamples =
    typeof payload?.settings?.includeExamples === "boolean"
      ? payload.settings.includeExamples
      : appPreferences.importExport.includeExamples;
  const includeTags =
    typeof payload?.settings?.includeTags === "boolean"
      ? payload.settings.includeTags
      : appPreferences.importExport.includeTags;

  return {
    deckName:
      typeof payload?.deckName === "string" ? payload.deckName.trim() : "",
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage,
    duplicateStrategy,
    includeExamples,
    includeTags,
  };
};

const importDeckFromFilePath = (filePath, payload = {}) => {
  const normalizedFilePath =
    typeof filePath === "string" ? filePath.trim() : "";

  if (!normalizedFilePath) {
    throw new Error("Import file is not selected");
  }

  const fileExtension = path.extname(normalizedFilePath).toLowerCase();

  if (!SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(fileExtension)) {
    throw new Error("Only .json, .lioradeck and .lioralang files can be imported");
  }

  if (!fs.existsSync(normalizedFilePath)) {
    throw new Error("Selected import file does not exist");
  }

  const importSettings = resolveDeckImportSettings(payload);
  const importResult = importDeckFromJsonFile(normalizedFilePath, importSettings);

  return {
    importResult,
    duplicateStrategy: importSettings.duplicateStrategy,
  };
};

const resolveRemoteImportUrl = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedUrl = value.trim();

  if (!normalizedUrl) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedUrl);

    if (!["https:", "http:"].includes(parsedUrl.protocol)) {
      return null;
    }

    return parsedUrl;
  } catch {
    return null;
  }
};

const toSafeImportFileName = (value, fallbackExtension = ".lioradeck") => {
  const rawValue =
    typeof value === "string" ? value.trim() : "";
  const baseName = rawValue
    ? path.basename(rawValue)
    : `hub-deck${fallbackExtension}`;
  const cleanedName = baseName
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  const normalizedExtension = path.extname(cleanedName).toLowerCase();

  if (SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(normalizedExtension)) {
    return cleanedName;
  }

  const fallbackName = path.basename(cleanedName, path.extname(cleanedName)) || "hub-deck";
  const safeExtension = SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(fallbackExtension)
    ? fallbackExtension
    : ".lioradeck";

  return `${fallbackName}${safeExtension}`;
};

const downloadRemoteDeckToTempFile = async (downloadUrl, fileNameHint = "") => {
  const parsedUrl = resolveRemoteImportUrl(downloadUrl);

  if (!parsedUrl) {
    throw new Error("Invalid Hub deck download URL");
  }

  const extensionFromPath = path.extname(parsedUrl.pathname || "").toLowerCase();
  const safeFileName = toSafeImportFileName(fileNameHint, extensionFromPath || ".lioradeck");
  const safeExtension = path.extname(safeFileName).toLowerCase();

  if (!SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(safeExtension)) {
    throw new Error("Only .json, .lioradeck and .lioralang files can be imported");
  }

  const importTempDir = path.join(app.getPath("temp"), "lioralang-imports");
  fs.mkdirSync(importTempDir, { recursive: true });

  const randomSuffix = Math.random().toString(16).slice(2, 10);
  const tempFilePath = path.join(
    importTempDir,
    `hub-${Date.now()}-${randomSuffix}${safeExtension}`,
  );
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => {
    abortController.abort();
  }, REMOTE_IMPORT_TIMEOUT_MS);

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Failed to download deck package (${response.status})`);
    }

    const contentLength = Number(response.headers.get("content-length"));

    if (Number.isFinite(contentLength) && contentLength > REMOTE_IMPORT_MAX_BYTES) {
      throw new Error("Downloaded deck file is too large");
    }

    const fileBuffer = new Uint8Array(await response.arrayBuffer());

    if (fileBuffer.byteLength === 0) {
      throw new Error("Downloaded deck file is empty");
    }

    if (fileBuffer.byteLength > REMOTE_IMPORT_MAX_BYTES) {
      throw new Error("Downloaded deck file is too large");
    }

    fs.writeFileSync(tempFilePath, fileBuffer);

    return {
      tempFilePath,
      safeFileName,
      byteLength: fileBuffer.byteLength,
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const flushPendingImportFileRequests = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.webContents.isLoadingMainFrame()) {
    return;
  }

  if (pendingImportFilePaths.length === 0) {
    return;
  }

  const filePathsToSend = pendingImportFilePaths;
  pendingImportFilePaths = [];

  filePathsToSend.forEach((filePath) => {
    const payload = readDeckImportPayloadFromFilePath(filePath);

    if (!payload) {
      return;
    }

    mainWindow?.webContents.send("decks:open-import-file", payload);
  });
};

const normalizeRuntimeErrorText = (value, fallback = "Unknown error") => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalizedValue = value.trim();
  return normalizedValue || fallback;
};

const buildRuntimeErrorPayload = ({
  title,
  message,
  details = "",
  source = "main",
} = {}) => {
  const createdAt = new Date().toISOString();

  return {
    id: `${source}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: normalizeRuntimeErrorText(title, "Application error"),
    message: normalizeRuntimeErrorText(message),
    details: normalizeRuntimeErrorText(details, ""),
    source,
    createdAt,
  };
};

const flushPendingRuntimeErrorEvents = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.webContents.isLoadingMainFrame()) {
    return;
  }

  if (pendingRuntimeErrorEvents.length === 0) {
    return;
  }

  const eventsToSend = pendingRuntimeErrorEvents;
  pendingRuntimeErrorEvents = [];

  eventsToSend.forEach((payload) => {
    mainWindow?.webContents.send("app:runtime-error", payload);
  });
};

const queueRuntimeErrorEvent = (payload) => {
  if (!payload || typeof payload !== "object") {
    return;
  }

  pendingRuntimeErrorEvents.push(payload);

  if (pendingRuntimeErrorEvents.length > 20) {
    pendingRuntimeErrorEvents = pendingRuntimeErrorEvents.slice(-20);
  }

  flushPendingRuntimeErrorEvents();
};

const reportRuntimeError = (error, source = "main") => {
  if (!appPreferencesCache.privacy.crashReportsEnabled) {
    return;
  }

  const errorMessage =
    typeof error?.message === "string"
      ? error.message
      : normalizeRuntimeErrorText(String(error || "Unknown error"));
  const errorStack = typeof error?.stack === "string" ? error.stack : "";
  const payload = buildRuntimeErrorPayload({
    title: "LioraLang Error",
    message: errorMessage,
    details: errorStack,
    source,
  });

  queueRuntimeErrorEvent(payload);
};

const escapeHtml = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const buildFatalStartupErrorHtml = (payload) => {
  const title = escapeHtml(payload?.title || "LioraLang Startup Error");
  const message = escapeHtml(payload?.message || "Unknown startup error");
  const details = escapeHtml(payload?.details || "");

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>${title}</title>
        <style>
          :root {
            color-scheme: dark;
          }
          body {
            margin: 0;
            background: ${FATAL_STARTUP_ERROR_THEME.bodyBackground};
            color: ${FATAL_STARTUP_ERROR_THEME.bodyText};
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: grid;
            place-items: center;
            min-height: 100vh;
            padding: 24px;
          }
          .error-card {
            width: min(560px, 100%);
            border: 1px solid ${FATAL_STARTUP_ERROR_THEME.cardBorder};
            border-radius: 14px;
            background: ${FATAL_STARTUP_ERROR_THEME.cardBackground};
            box-shadow: ${FATAL_STARTUP_ERROR_THEME.cardShadow};
            padding: 18px;
          }
          .error-card h1 {
            margin: 0 0 10px;
            font-size: 22px;
          }
          .error-card p {
            margin: 0;
            color: ${FATAL_STARTUP_ERROR_THEME.mutedText};
            line-height: 1.4;
          }
          .error-card pre {
            margin: 12px 0 0;
            border: 1px solid ${FATAL_STARTUP_ERROR_THEME.codeBorder};
            border-radius: 10px;
            background: ${FATAL_STARTUP_ERROR_THEME.codeBackground};
            color: ${FATAL_STARTUP_ERROR_THEME.mutedText};
            padding: 10px;
            max-height: 220px;
            overflow: auto;
            white-space: pre-wrap;
            word-break: break-word;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <article class="error-card">
          <h1>${title}</h1>
          <p>${message}</p>
          ${details ? `<pre>${details}</pre>` : ""}
        </article>
      </body>
    </html>
  `;
};

const openFatalStartupErrorWindow = async (payload) => {
  const fatalWindow = new BrowserWindow({
    width: 620,
    height: 420,
    minWidth: 620,
    minHeight: 420,
    resizable: false,
    maximizable: false,
    minimizable: false,
    autoHideMenuBar: true,
    show: false,
    icon: APP_ICON_PATH,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  const html = buildFatalStartupErrorHtml(payload);
  await fatalWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  fatalWindow.once("ready-to-show", () => {
    fatalWindow.show();
  });
  fatalWindow.on("closed", () => {
    app.quit();
  });
};

const queueImportFileOpenRequest = (filePath) => {
  const normalizedFilePath = normalizeImportFilePath(filePath);

  if (
    !normalizedFilePath ||
    !isDeckImportFilePath(normalizedFilePath) ||
    !fs.existsSync(normalizedFilePath)
  ) {
    return;
  }

  if (!pendingImportFilePaths.includes(normalizedFilePath)) {
    pendingImportFilePaths.push(normalizedFilePath);
  }

  flushPendingImportFileRequests();
};

const normalizeNavigationRoute = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = value.trim();

  if (!normalizedValue || !normalizedValue.startsWith("/")) {
    return "";
  }

  return normalizedValue;
};

const normalizeNavigationRequest = (request) => {
  if (typeof request === "string") {
    const to = normalizeNavigationRoute(request);

    if (!to) {
      return null;
    }

    return { to };
  }

  if (!request || typeof request !== "object") {
    return null;
  }

  const to = normalizeNavigationRoute(request.to);

  if (!to) {
    return null;
  }

  const source = toCleanString(request.source);
  const settingsTab = toCleanString(request.settingsTab);
  const highlightToken = Number(request.highlightToken);

  return {
    to,
    source,
    settingsTab,
    highlightToken: Number.isFinite(highlightToken) ? highlightToken : 0,
  };
};

const flushPendingNavigationRequests = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.webContents.isLoadingMainFrame()) {
    return;
  }

  if (pendingNavigationRequests.length === 0) {
    return;
  }

  const requestsToSend = pendingNavigationRequests;
  pendingNavigationRequests = [];

  requestsToSend.forEach((request) => {
    mainWindow?.webContents.send("app:navigate", request);
  });
};

const queueNavigationRequest = (request) => {
  const normalizedRequest = normalizeNavigationRequest(request);

  if (!normalizedRequest) {
    return;
  }

  pendingNavigationRequests.push(normalizedRequest);

  if (pendingNavigationRequests.length > 20) {
    pendingNavigationRequests = pendingNavigationRequests.slice(-20);
  }

  flushPendingNavigationRequests();
};

const buildSettingsRoute = (tabKey, sectionId) => {
  const safeTabKey = toCleanString(tabKey) || "general";
  const safeSectionId = toCleanString(sectionId);
  const encodedTabKey = encodeURIComponent(safeTabKey);
  const encodedSectionId = safeSectionId ? encodeURIComponent(safeSectionId) : "";
  const routeQuery = `${SETTINGS_ROUTE_PATH}?tab=${encodedTabKey}`;

  if (!encodedSectionId) {
    return routeQuery;
  }

  return `${routeQuery}#${encodedSectionId}`;
};

const requestSettingsSectionFromMenu = (
  tabKey,
  sectionId,
  { highlight = true } = {},
) => {
  showMainWindow();
  const to = buildSettingsRoute(tabKey, sectionId);

  if (!highlight) {
    queueNavigationRequest(to);
    return;
  }

  queueNavigationRequest({
    to,
    source: "app-menu",
    settingsTab: tabKey,
    highlightToken: Date.now(),
  });
};

const getDialogParentWindow = () => {
  return BrowserWindow.getFocusedWindow() || mainWindow || undefined;
};

const pickDeckImportPayloadFromDialog = async () => {
  const result = await dialog.showOpenDialog(getDialogParentWindow(), {
    title: "Import deck file",
    properties: ["openFile"],
    filters: [
      { name: "Deck files", extensions: ["lioradeck", "lioralang", "json"] },
      { name: "Liora deck package (.lioradeck)", extensions: ["lioradeck"] },
      { name: "Legacy Liora package (.lioralang)", extensions: ["lioralang"] },
      { name: "JSON deck (.json)", extensions: ["json"] },
    ],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  const payload = readDeckImportPayloadFromFilePath(result.filePaths[0]);

  if (!payload) {
    throw new Error("Selected import file is invalid");
  }

  return payload;
};

const requestDeckImportFromMenu = async () => {
  try {
    const payload = await pickDeckImportPayloadFromDialog();

    if (payload?.canceled || typeof payload?.filePath !== "string") {
      return;
    }

    queueImportFileOpenRequest(payload.filePath);
  } catch (error) {
    reportRuntimeError(error, "menu:import-deck");
  }
};

const applyWindowTitleBarTheme = (targetWindow, themeValue) => {
  if (!targetWindow || process.platform === "darwin") {
    return false;
  }

  const theme = resolveTitleBarTheme(themeValue);

  try {
    targetWindow.setTitleBarOverlay({
      color: theme.color,
      symbolColor: theme.symbolColor,
      height: WINDOW_TITLE_BAR_HEIGHT,
    });

    return true;
  } catch {
    return false;
  }
};

const getDefaultDbPath = () => {
  return path.join(app.getPath("userData"), "data", DB_FILE_NAME);
};

const canNavigateBack = (webContents) => {
  if (!webContents || typeof webContents.navigationHistory?.canGoBack !== "function") {
    return false;
  }

  return webContents.navigationHistory.canGoBack();
};

const canNavigateForward = (webContents) => {
  if (!webContents || typeof webContents.navigationHistory?.canGoForward !== "function") {
    return false;
  }

  return webContents.navigationHistory.canGoForward();
};

const isDeveloperModeEnabled = () => {
  return Boolean(appPreferencesCache?.desktop?.devMode);
};

const isDevToolsShortcut = (input = {}) => {
  const inputType = toCleanString(input?.type);

  if (inputType !== "keyDown" && inputType !== "rawKeyDown") {
    return false;
  }

  const code = toCleanString(input?.code);
  const key = toCleanString(input?.key).toLowerCase();
  const isF12 = code === "F12";
  const isDevToolsLetter =
    code === "KeyI" || code === "KeyJ" || code === "KeyC" ||
    key === "i" || key === "j" || key === "c";
  const hasPrimaryModifier =
    process.platform === "darwin"
      ? Boolean(input?.meta)
      : Boolean(input?.control);
  const hasSecondaryModifier =
    process.platform === "darwin"
      ? Boolean(input?.alt)
      : Boolean(input?.shift);

  return isF12 || (isDevToolsLetter && hasPrimaryModifier && hasSecondaryModifier);
};

const isQuitShortcut = (input = {}) => {
  const inputType = toCleanString(input?.type);

  if (inputType !== "keyDown" && inputType !== "rawKeyDown") {
    return false;
  }

  const code = toCleanString(input?.code);
  const key = toCleanString(input?.key).toLowerCase();

  if (process.platform === "darwin") {
    return (code === "KeyQ" || key === "q") && Boolean(input?.meta);
  }

  return (code === "F4" || key === "f4") && Boolean(input?.alt);
};

const toggleWindowDevTools = (targetWindow) => {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  const webContents = targetWindow.webContents;

  if (!webContents || webContents.isDestroyed()) {
    return;
  }

  if (webContents.isDevToolsOpened()) {
    webContents.closeDevTools();
    return;
  }

  webContents.openDevTools({ mode: "detach", activate: true });
};

const closeAllDevToolsIfDisabled = () => {
  if (isDeveloperModeEnabled()) {
    return;
  }

  BrowserWindow.getAllWindows().forEach((targetWindow) => {
    const webContents = targetWindow?.webContents;

    if (webContents && webContents.isDevToolsOpened()) {
      webContents.closeDevTools();
    }
  });
};

const attachDevToolsAccessControl = (targetWindow) => {
  if (!targetWindow || targetWindow.isDestroyed()) {
    return;
  }

  const webContents = targetWindow.webContents;

  if (!webContents || webContents.isDestroyed()) {
    return;
  }

  webContents.on("before-input-event", (event, input) => {
    if (isQuitShortcut(input)) {
      event.preventDefault();
      isQuitRequested = true;
      app.quit();
      return;
    }

    if (!isDevToolsShortcut(input)) {
      return;
    }

    event.preventDefault();

    if (!isDeveloperModeEnabled()) {
      closeAllDevToolsIfDisabled();
      return;
    }

    toggleWindowDevTools(targetWindow);
  });

  webContents.on("devtools-opened", () => {
    if (!isDeveloperModeEnabled()) {
      webContents.closeDevTools();
    }
  });
};

const navigateBack = (webContents) => {
  if (!webContents || typeof webContents.navigationHistory?.goBack !== "function") {
    return;
  }

  webContents.navigationHistory.goBack();
};

const navigateForward = (webContents) => {
  if (!webContents || typeof webContents.navigationHistory?.goForward !== "function") {
    return;
  }

  webContents.navigationHistory.goForward();
};

const resolveActiveDbPath = () => {
  const storedDbPath = readStoredDbPath(app.getPath("userData"));
  return storedDbPath || getDefaultDbPath();
};

const runLegacyStorageMigration = () => {
  try {
    return migrateLegacyDbStorage({
      appDataPath: app.getPath("appData"),
      currentUserDataPath: app.getPath("userData"),
      dbFileName: DB_FILE_NAME,
    });
  } catch {
    return {
      migrated: false,
      dbPath: "",
      sourceDbPath: "",
      reason: "migration-failed",
    };
  }
};

const resolveWindowTitle = () => {
  return appPreferencesCache.desktop.updateChannel === "beta"
    ? "LioraLang (Beta)"
    : "LioraLang";
};

const readAppPreferencesFromDatabaseFile = (dbFilePath) => {
  if (typeof dbFilePath !== "string" || !dbFilePath || !fs.existsSync(dbFilePath)) {
    return DEFAULT_RUNTIME_APP_PREFERENCES;
  }

  let db = null;

  try {
    db = new Database(dbFilePath, {
      readonly: true,
      fileMustExist: true,
    });
    const row = db
      .prepare("SELECT value FROM app_settings WHERE key = ?")
      .get(APP_PREFERENCES_SETTINGS_KEY);

    if (!row || typeof row.value !== "string") {
      return DEFAULT_RUNTIME_APP_PREFERENCES;
    }

    const parsedValue = JSON.parse(row.value);
    return normalizeAppPreferencesForMain(parsedValue);
  } catch {
    return DEFAULT_RUNTIME_APP_PREFERENCES;
  } finally {
    try {
      db?.close();
    } catch {
      // no-op
    }
  }
};

const resolveBootstrapAppPreferences = () => {
  try {
    const bootstrapDbPath = resolveActiveDbPath();
    return readAppPreferencesFromDatabaseFile(bootstrapDbPath);
  } catch {
    return DEFAULT_RUNTIME_APP_PREFERENCES;
  }
};

const getAnalyticsLogFilePath = () => {
  return path.join(app.getPath("userData"), "analytics", "events.jsonl");
};

const trackAnalyticsEvent = (eventName, payload = {}) => {
  if (!appPreferencesCache.privacy.analyticsEnabled) {
    return;
  }

  const normalizedName = toCleanString(eventName);

  if (!normalizedName) {
    return;
  }

  try {
    const logFilePath = getAnalyticsLogFilePath();
    fs.mkdirSync(path.dirname(logFilePath), { recursive: true });
    const line = JSON.stringify({
      event: normalizedName,
      payload: payload && typeof payload === "object" ? payload : {},
      timestamp: new Date().toISOString(),
      channel: appPreferencesCache.desktop.updateChannel,
      appVersion: app.getVersion(),
    });

    fs.appendFileSync(logFilePath, `${line}\n`, "utf8");
  } catch (error) {
    logWarn("Failed to write analytics event", error);
  }
};

const clearBackupSchedule = () => {
  if (backupTimerId !== null) {
    clearInterval(backupTimerId);
    backupTimerId = null;
  }

  backupScheduleSignature = "";
};

const getBackupDirectoryPath = (dbPath) => {
  return path.join(path.dirname(dbPath), "backups");
};

const backupFilePrefix = (dbPath) => {
  return `${path.basename(dbPath, path.extname(dbPath))}.backup-`;
};

const createBackupTimestamp = () => {
  return new Date().toISOString().replaceAll("-", "").replaceAll(":", "").replaceAll(".", "");
};

const listBackupFiles = (dbPath) => {
  const backupDirectory = getBackupDirectoryPath(dbPath);

  if (!fs.existsSync(backupDirectory)) {
    return [];
  }

  const prefix = backupFilePrefix(dbPath);

  return fs
    .readdirSync(backupDirectory)
    .filter((fileName) => fileName.startsWith(prefix) && fileName.endsWith(".db"))
    .sort((left, right) => left.localeCompare(right))
    .map((fileName) => path.join(backupDirectory, fileName));
};

const pruneOldBackups = (dbPath, maxBackups) => {
  const safeMaxBackups = Math.max(1, Number(maxBackups) || 1);
  const backupFiles = listBackupFiles(dbPath);

  if (backupFiles.length <= safeMaxBackups) {
    return;
  }

  const filesToDelete = backupFiles.slice(0, backupFiles.length - safeMaxBackups);

  filesToDelete.forEach((filePath) => {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      logWarn("Failed to remove old backup", filePath, error);
    }
  });
};

const createDatabaseBackupSnapshot = (maxBackups) => {
  const dbPath = getDatabasePath();

  if (!dbPath || !fs.existsSync(dbPath)) {
    return null;
  }

  const backupDirectory = getBackupDirectoryPath(dbPath);
  const backupPath = path.join(
    backupDirectory,
    `${backupFilePrefix(dbPath)}${createBackupTimestamp()}.db`,
  );

  try {
    const db = getDatabase();
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    // checkpoint is best-effort only
  }

  fs.mkdirSync(backupDirectory, { recursive: true });
  fs.copyFileSync(dbPath, backupPath);
  pruneOldBackups(dbPath, maxBackups);

  return backupPath;
};

const runScheduledBackup = () => {
  if (isBackupInFlight) {
    return;
  }

  isBackupInFlight = true;

  try {
    const backupPath = createDatabaseBackupSnapshot(
      appPreferencesCache.dataSafety.maxBackups,
    );

    if (backupPath) {
      trackAnalyticsEvent("database.backup.created", {
        backupPath,
      });
    }
  } catch (error) {
    reportRuntimeError(error, "backup");
  } finally {
    isBackupInFlight = false;
  }
};

const syncBackupSchedule = () => {
  const intervalKey = appPreferencesCache.dataSafety.autoBackupInterval;
  const intervalMs = BACKUP_INTERVAL_MS[intervalKey] || 0;
  const dbPath = getDatabasePath() || "";
  const nextSignature = [
    intervalKey,
    String(appPreferencesCache.dataSafety.maxBackups),
    dbPath,
  ].join("|");

  if (backupTimerId !== null && backupScheduleSignature === nextSignature) {
    return;
  }

  clearBackupSchedule();
  backupScheduleSignature = nextSignature;

  if (intervalMs <= 0) {
    return;
  }

  backupTimerId = setInterval(() => {
    runScheduledBackup();
  }, intervalMs);

  if (typeof backupTimerId?.unref === "function") {
    backupTimerId.unref();
  }

  const hasBackups = (() => {
    try {
      const dbPath = getDatabasePath();
      if (!dbPath) {
        return false;
      }
      return listBackupFiles(dbPath).length > 0;
    } catch {
      return false;
    }
  })();

  if (!hasBackups) {
    runScheduledBackup();
  }
};

const showMainWindow = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.show();
  mainWindow.focus();
};

const destroyTray = () => {
  if (!appTray) {
    return;
  }

  appTray.destroy();
  appTray = null;
};

const ensureTray = () => {
  if (appTray) {
    return appTray;
  }

  const tray = new Tray(APP_ICON_PATH);
  tray.setToolTip("LioraLang");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show LioraLang",
        click: () => {
          showMainWindow();
        },
      },
      {
        type: "separator",
      },
      {
        label: "Quit",
        click: () => {
          isQuitRequested = true;
          app.quit();
        },
      },
    ]),
  );
  tray.on("click", () => {
    showMainWindow();
  });
  appTray = tray;

  return appTray;
};

const syncTrayMode = () => {
  if (appPreferencesCache.desktop.minimizeToTray) {
    ensureTray();
    return;
  }

  destroyTray();
};

const syncLaunchAtStartupSetting = () => {
  if (!app.isPackaged) {
    launchAtStartupSignature = null;
    return;
  }

  const openAtLogin = Boolean(appPreferencesCache.desktop.launchAtStartup);
  const nextSignature = String(openAtLogin);

  if (launchAtStartupSignature === nextSignature) {
    return;
  }

  try {
    app.setLoginItemSettings({ openAtLogin });
    launchAtStartupSignature = nextSignature;
  } catch (error) {
    logWarn("Failed to apply launch-at-startup setting", error);
  }
};

const syncWindowTitle = () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.setTitle(resolveWindowTitle());
};

const buildViewMenuSubmenu = () => {
  const baseItems = [
    { role: "resetZoom" },
    { role: "zoomIn" },
    { role: "zoomOut" },
    { type: "separator" },
    { role: "togglefullscreen" },
  ];

  if (!isDeveloperModeEnabled()) {
    return baseItems;
  }

  return [
    { role: "reload" },
    { role: "forceReload" },
    { role: "toggleDevTools" },
    { type: "separator" },
    ...baseItems,
  ];
};

const buildSettingsMenuSubmenu = () => {
  return SETTINGS_MENU_TABS.map((tabConfig) => {
    const item = {
      label: tabConfig.label,
      click: () => {
        requestSettingsSectionFromMenu(
          tabConfig.key,
          tabConfig.sectionId,
          {
            highlight: tabConfig.key !== "general",
          },
        );
      },
    };

    if (tabConfig.accelerator) {
      item.accelerator = tabConfig.accelerator;
    }

    return item;
  });
};

const buildAppMenuSubmenu = () => {
  return [
    { role: "about" },
    { type: "separator" },
    {
      label: "Settings",
      submenu: buildSettingsMenuSubmenu(),
    },
    { type: "separator" },
    { role: "services" },
    { type: "separator" },
    { role: "hide" },
    { role: "hideOthers" },
    { role: "unhide" },
    { type: "separator" },
    { role: "quit", label: "Qurit LioraLang" },
  ];
};

const buildFileMenuSubmenu = () => {
  const submenu = [
    {
      label: "Import deck file...",
      accelerator: "CmdOrCtrl+O",
      click: () => {
        void requestDeckImportFromMenu();
      },
    },
  ];

  if (process.platform !== "darwin") {
    submenu.push(
      {
        type: "separator",
      },
      { role: "quit" },
    );
  }

  return submenu;
};

const buildWindowMenuSubmenu = () => {
  if (process.platform === "darwin") {
    return [
      { role: "minimize" },
      { role: "zoom" },
      { role: "close" },
      { type: "separator" },
      { role: "front" },
    ];
  }

  return [
    { role: "minimize" },
    { role: "maximize" },
    { type: "separator" },
    { role: "close" },
  ];
};

const syncApplicationMenu = () => {
  const template = [];

  if (process.platform === "darwin") {
    template.push({
      label: app.name || "LioraLang",
      submenu: buildAppMenuSubmenu(),
    });
  }

  template.push(
    {
      label: "File",
      submenu: buildFileMenuSubmenu(),
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: buildViewMenuSubmenu(),
    },
    {
      label: "Window",
      submenu: buildWindowMenuSubmenu(),
    },
    {
      role: "help",
      submenu: [
        {
          label: "LioraLang GitHub",
          click: () => {
            void shell.openExternal(APP_HOMEPAGE_URL);
          },
        },
      ],
    },
  );

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
};

const syncRuntimePreferences = () => {
  process.env.LIORALANG_UPDATE_CHANNEL = appPreferencesCache.desktop.updateChannel;
  syncLaunchAtStartupSetting();
  syncTrayMode();
  syncBackupSchedule();
  syncWindowTitle();
  syncApplicationMenu();
  closeAllDevToolsIfDisabled();
};

const moveFileSafely = (sourcePath, targetPath) => {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  const targetDirectoryPath = path.dirname(targetPath);

  if (!fs.existsSync(targetDirectoryPath)) {
    fs.mkdirSync(targetDirectoryPath, { recursive: true });
  }

  try {
    fs.renameSync(sourcePath, targetPath);
  } catch (moveError) {
    if (moveError?.code !== "EXDEV") {
      throw moveError;
    }

    fs.copyFileSync(sourcePath, targetPath);
    fs.unlinkSync(sourcePath);
  }

  return true;
};

const moveDatabaseFiles = (sourceDbPath, targetDbPath) => {
  if (!sourceDbPath || !targetDbPath || sourceDbPath === targetDbPath) {
    return {
      moved: false,
      movedCount: 0,
    };
  }

  const fileSuffixes = ["", "-wal", "-shm"];
  const fileMappings = fileSuffixes
    .map((suffix) => ({
      sourcePath: `${sourceDbPath}${suffix}`,
      targetPath: `${targetDbPath}${suffix}`,
    }))
    .filter((mapping) => fs.existsSync(mapping.sourcePath));

  if (fileMappings.length === 0) {
    return {
      moved: false,
      movedCount: 0,
    };
  }

  const conflictingTarget = fileMappings.find((mapping) =>
    fs.existsSync(mapping.targetPath),
  );

  if (conflictingTarget) {
    throw new Error(
      `Target database file already exists: ${conflictingTarget.targetPath}`,
    );
  }

  const movedMappings = [];

  try {
    fileMappings.forEach(({ sourcePath, targetPath }) => {
      const moved = moveFileSafely(sourcePath, targetPath);

      if (moved) {
        movedMappings.push({ sourcePath, targetPath });
      }
    });
  } catch (moveError) {
    movedMappings.reverse().forEach(({ sourcePath, targetPath }) => {
      try {
        if (fs.existsSync(targetPath) && !fs.existsSync(sourcePath)) {
          moveFileSafely(targetPath, sourcePath);
        }
      } catch {
        // Rollback is best-effort here.
      }
    });

    throw moveError;
  }

  return {
    moved: true,
    movedCount: fileMappings.length,
  };
};

const changeDatabasePath = (targetDbPath) => {
  if (typeof targetDbPath !== "string" || !targetDbPath.trim()) {
    throw new Error("Invalid database path");
  }

  const normalizedTargetDbPath = path.resolve(targetDbPath.trim());
  const currentDbPath = getDatabasePath();

  if (currentDbPath && path.resolve(currentDbPath) === normalizedTargetDbPath) {
    return {
      dbPath: normalizedTargetDbPath,
      migrated: false,
    };
  }

  const dbFileExtension = path.extname(normalizedTargetDbPath).toLowerCase();

  if (dbFileExtension !== ".db") {
    throw new Error("Database file must have .db extension");
  }

  try {
    const db = getDatabase();
    db.pragma("wal_checkpoint(TRUNCATE)");
  } catch {
    // Connection may be unavailable during startup or previous recovery steps.
  }

  closeDatabaseConnection();

  try {
    const moveResult = moveDatabaseFiles(currentDbPath, normalizedTargetDbPath);
    initDatabaseConnection(normalizedTargetDbPath);
    initDb();
    writeStoredDbPath(app.getPath("userData"), normalizedTargetDbPath);

    return {
      dbPath: normalizedTargetDbPath,
      migrated: moveResult.moved,
    };
  } catch (changeError) {
    if (currentDbPath) {
      try {
        initDatabaseConnection(currentDbPath);
        initDb();
      } catch {
        // Failed to restore original connection; propagate original error.
      }
    }

    throw changeError;
  }
};

const buildContentSecurityPolicy = () => {
  const joinConnectSources = (sources = []) => {
    return [...new Set(["'self'", ...sources])].join(" ");
  };

  if (app.isPackaged) {
    return [
      "default-src 'self'",
      "script-src 'self'",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      `connect-src ${joinConnectSources()}`,
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ].join("; ");
  }

  const devServerUrl = getDevServerUrl();
  const devOrigin = new URL(devServerUrl).origin;
  const devWsOrigin = `${devServerUrl.startsWith("https://") ? "wss" : "ws"}://${new URL(devServerUrl).host}`;

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' ${devOrigin}`,
    "worker-src 'self' blob:",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob:",
    "font-src 'self' https://fonts.gstatic.com data:",
    `connect-src ${joinConnectSources([
      devOrigin,
      devWsOrigin,
    ])}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
};

const setupContentSecurityPolicy = () => {
  const policy = buildContentSecurityPolicy();

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [policy],
      },
    });
  });
};

const createWindow = async () => {
  const isMac = process.platform === "darwin";

  mainWindow = new BrowserWindow({
    width: 1300,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    icon: APP_ICON_PATH,
    show: false,
    autoHideMenuBar: true,
    title: resolveWindowTitle(),
    titleBarStyle: isMac ? "hiddenInset" : "hidden",
    ...(isMac
      ? {}
      : {
          titleBarOverlay: {
            color: WINDOW_TITLE_BAR_THEME.light.color,
            symbolColor: WINDOW_TITLE_BAR_THEME.light.symbolColor,
            height: WINDOW_TITLE_BAR_HEIGHT,
          },
        }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  attachDevToolsAccessControl(mainWindow);

  mainWindow.on("close", (event) => {
    if (isQuitRequested || !appPreferencesCache.desktop.minimizeToTray) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
    ensureTray();
  });

  mainWindow.on("minimize", (event) => {
    if (!appPreferencesCache.desktop.minimizeToTray) {
      return;
    }

    event.preventDefault();
    mainWindow?.hide();
    ensureTray();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    flushPendingImportFileRequests();
    flushPendingRuntimeErrorEvents();
    flushPendingNavigationRequests();
  });

  mainWindow.webContents.on("did-finish-load", () => {
    flushPendingImportFileRequests();
    flushPendingRuntimeErrorEvents();
    flushPendingNavigationRequests();
  });

  if (!app.isPackaged) {
    const devServerUrl = getDevServerUrl();
    await mainWindow.loadURL(devServerUrl);
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
};

const sendDecksUpdated = () => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("decks-updated");
  });
};

const sendAppSettingsUpdated = (settings) => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.webContents.send("app-settings-updated", settings);
  });
};

const setupIpcHandlers = () => {
  const getActiveWindow = () => BrowserWindow.getFocusedWindow() || mainWindow;

  ipcMain.handle("decks:list", () => listDecks());

  ipcMain.handle("decks:get-by-id", (_, deckId) => {
    return getDeckById(Number(deckId));
  });

  ipcMain.handle("decks:get-words", (_, deckId) => {
    return getDeckWords(Number(deckId));
  });

  ipcMain.handle("decks:pick-import-json", async () => {
    return pickDeckImportPayloadFromDialog();
  });

  ipcMain.handle("decks:import-json", async (_, payload) => {
    const filePath =
      typeof payload?.filePath === "string" ? payload.filePath.trim() : "";
    const { importResult, duplicateStrategy } = importDeckFromFilePath(
      filePath,
      payload || {},
    );

    sendDecksUpdated();
    trackAnalyticsEvent("deck.imported", {
      deckId: importResult.deckId,
      importedCount: importResult.importedCount,
      skippedCount: importResult.skippedCount,
      duplicateStrategy,
      source: "local-file",
    });

    return {
      canceled: false,
      ...importResult,
    };
  });

  ipcMain.handle("decks:import-url", async (_, payload) => {
    const downloadUrl =
      typeof payload?.downloadUrl === "string" ? payload.downloadUrl.trim() : "";
    const fileNameHint =
      typeof payload?.fileName === "string" ? payload.fileName.trim() : "";
    let tempFilePath = "";

    try {
      const downloadedFile = await downloadRemoteDeckToTempFile(
        downloadUrl,
        fileNameHint,
      );
      tempFilePath = downloadedFile.tempFilePath;
      const downloadedBytes = downloadedFile.byteLength;
      const { importResult, duplicateStrategy } = importDeckFromFilePath(
        tempFilePath,
        payload || {},
      );

      sendDecksUpdated();
      trackAnalyticsEvent("deck.imported", {
        deckId: importResult.deckId,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        duplicateStrategy,
        source: "hub-remote",
        downloadedBytes,
      });

      return {
        canceled: false,
        ...importResult,
      };
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.rmSync(tempFilePath, { force: true });
      }
    }
  });

  ipcMain.handle("decks:export-json", async (_, payload) => {
    const normalizedDeckId = Number(
      typeof payload === "object" ? payload?.deckId : payload,
    );
    const deck = getDeckById(normalizedDeckId);

    if (!deck) {
      throw new Error("Deck not found");
    }

    const appPreferences = extractAppPreferencesFromSettings(getAppSettings());
    const preferredFormat = ["lioradeck", "json"].includes(
      payload?.settings?.exportFormat,
    )
      ? payload.settings.exportFormat
      : appPreferences.importExport.exportFormat;
    const includeExamples =
      typeof payload?.settings?.includeExamples === "boolean"
        ? payload.settings.includeExamples
        : appPreferences.importExport.includeExamples;
    const includeTags =
      typeof payload?.settings?.includeTags === "boolean"
        ? payload.settings.includeTags
        : appPreferences.importExport.includeTags;
    const isJsonFormat = preferredFormat === "json";
    const primaryFilter = isJsonFormat
      ? { name: "JSON", extensions: ["json"] }
      : { name: "Liora deck", extensions: ["lioradeck"] };
    const secondaryFilter = isJsonFormat
      ? { name: "Liora deck", extensions: ["lioradeck"] }
      : { name: "JSON", extensions: ["json"] };
    const defaultExtension = isJsonFormat ? "json" : "lioradeck";

    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export deck package",
      defaultPath: `${deck.name}.${defaultExtension}`,
      filters: [primaryFilter, secondaryFilter],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const selectedExtension = path.extname(result.filePath).toLowerCase();
    const hasSupportedExtension =
      selectedExtension === ".lioradeck" || selectedExtension === ".json";
    const resolvedFilePath = hasSupportedExtension
      ? result.filePath
      : `${result.filePath}.${defaultExtension}`;
    const exportResult = exportDeckToJsonFile(
      normalizedDeckId,
      resolvedFilePath,
      {
        includeExamples,
        includeTags,
      },
    );
    trackAnalyticsEvent("deck.exported", {
      deckId: normalizedDeckId,
      exportedCount: exportResult.exportedCount,
      format: preferredFormat,
    });

    return {
      canceled: false,
      ...exportResult,
    };
  });

  ipcMain.handle("decks:export-package", (_, payload) => {
    const normalizedDeckId = Number(
      typeof payload === "object" ? payload?.deckId : payload,
    );
    const appPreferences = extractAppPreferencesFromSettings(getAppSettings());
    const includeExamples =
      typeof payload?.settings?.includeExamples === "boolean"
        ? payload.settings.includeExamples
        : appPreferences.importExport.includeExamples;
    const includeTags =
      typeof payload?.settings?.includeTags === "boolean"
        ? payload.settings.includeTags
        : appPreferences.importExport.includeTags;
    const exportResult = exportDeckToJsonPackage(normalizedDeckId, {
      includeExamples,
      includeTags,
    });

    return exportResult;
  });

  ipcMain.handle("decks:rename", (_, payload) => {
    const renamedDeck = renameDeck(payload?.deckId, payload?.name);
    sendDecksUpdated();
    trackAnalyticsEvent("deck.renamed", {
      deckId: payload?.deckId,
    });
    return renamedDeck;
  });

  ipcMain.handle("decks:delete", (_, payload) => {
    const deletionResult = deleteDeck(payload?.deckId);
    sendDecksUpdated();
    trackAnalyticsEvent("deck.deleted", {
      deckId: payload?.deckId,
    });
    return deletionResult;
  });

  ipcMain.handle("decks:save", (_, payload) => {
    const saveResult = saveDeck(payload || {});
    sendDecksUpdated();
    trackAnalyticsEvent("deck.saved", {
      deckId: saveResult?.deck?.id || payload?.deckId || null,
      wordsCount: Array.isArray(saveResult?.words) ? saveResult.words.length : 0,
    });
    return saveResult;
  });

  ipcMain.handle("hub:list-decks", (_, payload) => {
    return listHubDecks({
      config: payload?.config || {},
      page: payload?.page,
      pageSize: payload?.pageSize,
      search: payload?.search,
    });
  });

  ipcMain.handle("hub:create-download-url", (_, payload) => {
    return createHubDeckDownloadUrl({
      config: payload?.config || {},
      filePath: payload?.filePath,
      expiresInSeconds: payload?.expiresInSeconds,
    });
  });

  ipcMain.handle("hub:publish-deck", async (_, payload) => {
    const publishResult = await publishHubDeck({
      config: payload?.config || {},
      deck: payload?.deck || {},
      deckPackage: payload?.deckPackage || null,
    });

    trackAnalyticsEvent("deck.publishedToHub", {
      deckId: publishResult?.deckId || null,
      version: publishResult?.version || null,
      wordsCount: publishResult?.wordsCount || null,
    });

    return publishResult;
  });

  ipcMain.handle("hub:increment-downloads", async (_, payload) => {
    return incrementHubDeckDownloads({
      config: payload?.config || {},
      deckId: payload?.deckId,
      currentDownloadsCount: payload?.currentDownloadsCount,
    });
  });

  ipcMain.handle("srs:get-session", (_, payload) => {
    return getSrsSessionSnapshot({
      deckId: payload?.deckId,
      settings: payload?.settings || {},
      forceAllCards: Boolean(payload?.forceAllCards),
    });
  });

  ipcMain.handle("srs:grade-card", (_, payload) => {
    return gradeSrsCard({
      deckId: payload?.deckId,
      wordId: payload?.wordId,
      rating: payload?.rating,
      settings: payload?.settings || {},
      forceAllCards: Boolean(payload?.forceAllCards),
    });
  });

  ipcMain.handle("progress:get-overview", () => {
    return getProgressOverview();
  });

  ipcMain.handle("app:get-db-path", () => {
    return getDatabasePath();
  });

  ipcMain.handle("app:open-db-folder", () => {
    const dbPath = getDatabasePath();

    if (!dbPath) {
      return null;
    }

    const folderPath = path.dirname(dbPath);
    shell.openPath(folderPath);

    return folderPath;
  });

  ipcMain.handle("app:change-db-location", async () => {
    const currentDbPath = getDatabasePath();
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Choose database folder",
      properties: ["openDirectory", "createDirectory"],
      defaultPath: currentDbPath ? path.dirname(currentDbPath) : app.getPath("home"),
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const targetFolderPath = result.filePaths[0];
    const targetDbPath = path.join(targetFolderPath, DB_FILE_NAME);
    const changeResult = changeDatabasePath(targetDbPath);
    syncBackupSchedule();
    sendDecksUpdated();
    const nextSettings = getAppSettings();
    appPreferencesCache = extractAppPreferencesFromSettings(nextSettings);
    syncRuntimePreferences();
    sendAppSettingsUpdated(nextSettings);

    return {
      canceled: false,
      ...changeResult,
    };
  });

  ipcMain.handle("app:verify-integrity", (_, payload) => {
    const report = verifyAppIntegrityAndRepair({
      repair: Boolean(payload?.repair),
    });

    if (report?.database?.repaired) {
      sendDecksUpdated();
      const nextSettings = getAppSettings();
      appPreferencesCache = extractAppPreferencesFromSettings(nextSettings);
      syncRuntimePreferences();
      sendAppSettingsUpdated(nextSettings);
    }

    return report;
  });

  ipcMain.handle("app:get-settings", () => {
    const settings = getAppSettings();
    appPreferencesCache = extractAppPreferencesFromSettings(settings);
    return settings;
  });

  ipcMain.handle("app:update-settings", (_, payload) => {
    const nextSettings = updateAppSettings(payload?.settings || {});
    appPreferencesCache = extractAppPreferencesFromSettings(nextSettings);
    syncRuntimePreferences();
    sendAppSettingsUpdated(nextSettings);
    return nextSettings;
  });

  ipcMain.handle("app:debug-show-runtime-error", () => {
    const payload = buildRuntimeErrorPayload({
      title: "Temporary Runtime Error",
      message: "This is a temporary preview of the custom error modal.",
      details: "Temporary button is enabled. Remove it after QA.",
      source: "renderer-debug",
    });
    queueRuntimeErrorEvent(payload);

    return { ok: true };
  });

  ipcMain.handle("window:get-history-state", () => {
    const activeWindow = getActiveWindow();

    if (!activeWindow) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    const webContents = activeWindow.webContents;

    return {
      canGoBack: canNavigateBack(webContents),
      canGoForward: canNavigateForward(webContents),
    };
  });

  ipcMain.handle("window:navigate-back", () => {
    const activeWindow = getActiveWindow();

    if (!activeWindow) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    const webContents = activeWindow.webContents;

    if (canNavigateBack(webContents)) {
      navigateBack(webContents);
    }

    return {
      canGoBack: canNavigateBack(webContents),
      canGoForward: canNavigateForward(webContents),
    };
  });

  ipcMain.handle("window:navigate-forward", () => {
    const activeWindow = getActiveWindow();

    if (!activeWindow) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    const webContents = activeWindow.webContents;

    if (canNavigateForward(webContents)) {
      navigateForward(webContents);
    }

    return {
      canGoBack: canNavigateBack(webContents),
      canGoForward: canNavigateForward(webContents),
    };
  });

  ipcMain.handle("window:apply-theme", (_, payload) => {
    const activeWindow = getActiveWindow();
    const applied = applyWindowTitleBarTheme(activeWindow, payload?.theme);

    return { applied };
  });
};

const legacyStorageMigrationReport = runLegacyStorageMigration();

if (legacyStorageMigrationReport.migrated) {
  logWarn(
    "Legacy storage migrated to current user data directory:",
    legacyStorageMigrationReport.sourceDbPath,
    "->",
    legacyStorageMigrationReport.dbPath,
  );
}

if (legacyStorageMigrationReport.reason === "legacy-path-linked") {
  logWarn(
    "Using legacy database path from previous install:",
    legacyStorageMigrationReport.dbPath,
  );
}

appPreferencesCache = resolveBootstrapAppPreferences();

if (!appPreferencesCache.desktop.hardwareAcceleration) {
  app.disableHardwareAcceleration();
}

const shouldEnforceSingleInstanceLock = app.isPackaged;
const hasSingleInstanceLock = shouldEnforceSingleInstanceLock
  ? app.requestSingleInstanceLock()
  : true;

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  process.on("uncaughtException", (error) => {
    logError("Uncaught Electron error:", error);
    reportRuntimeError(error, "uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logError("Unhandled Electron rejection:", reason);
    reportRuntimeError(reason, "unhandledRejection");
  });

  app.on("second-instance", (_, commandLine, workingDirectory) => {
    const filePathFromArgs = resolveDeckImportFilePathFromArgs(
      commandLine,
      workingDirectory,
    );

    if (filePathFromArgs) {
      queueImportFileOpenRequest(filePathFromArgs);
    }

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    showMainWindow();
  });

  app.on("open-file", (event, filePath) => {
    event.preventDefault();
    queueImportFileOpenRequest(filePath);
  });

  app
    .whenReady()
    .then(async () => {
      const dbPath = resolveActiveDbPath();

      initDatabaseConnection(dbPath);
      initDb();
      const currentSettings = getAppSettings();
      appPreferencesCache = extractAppPreferencesFromSettings(currentSettings);
      syncRuntimePreferences();
      setupContentSecurityPolicy();
      setupIpcHandlers();
      await createWindow();
      syncRuntimePreferences();
      queueImportFileOpenRequest(
        resolveDeckImportFilePathFromArgs(process.argv, process.cwd()),
      );

      app.on("activate", async () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          await createWindow();
          queueImportFileOpenRequest(
            resolveDeckImportFilePathFromArgs(process.argv, process.cwd()),
          );
          return;
        }

        showMainWindow();
      });
    })
    .catch(async (startupError) => {
      logError("Failed to start Electron app:", startupError);
      const startupPayload = buildRuntimeErrorPayload({
        title: "LioraLang Startup Error",
        message: startupError?.message || "Failed to start application",
        details:
          startupError?.stack || "Run: pnpm rebuild:native",
        source: "startup",
      });
      queueRuntimeErrorEvent(startupPayload);

      try {
        await openFatalStartupErrorWindow(startupPayload);
      } catch (fatalWindowError) {
        logError("Failed to render custom startup error window:", fatalWindowError);
        app.quit();
      }
    });

  app.on("before-quit", () => {
    isQuitRequested = true;
    clearBackupSchedule();
    destroyTray();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
