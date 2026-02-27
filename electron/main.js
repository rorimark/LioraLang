import { app, BrowserWindow, dialog, ipcMain, shell, session } from "electron";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  closeDatabaseConnection,
  getDatabase,
  getDatabasePath,
  initDatabaseConnection,
} from "./db/db.js";
import { initDb } from "./db/initDb.js";
import { readStoredDbPath, writeStoredDbPath } from "./services/dbPath.service.js";
import { verifyAppIntegrityAndRepair } from "./services/integrity.service.js";
import {
  listDecks,
  getDeckById,
  getDeckWords,
  importDeckFromJsonFile,
  readDeckImportMetadataFromJsonFile,
  exportDeckToJsonFile,
  renameDeck,
  deleteDeck,
  saveDeck,
} from "./db/services/db.services.js";
import { getAppSettings, updateAppSettings } from "./db/services/settings.services.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ICON_PATH = path.join(__dirname, "assets", "icon.png");
const WINDOW_TITLE_BAR_HEIGHT = 36;
const WINDOW_TITLE_BAR_THEME = {
  light: {
    color: "#d5deea",
    symbolColor: "#0f172a",
  },
  dark: {
    color: "#070c14",
    symbolColor: "#f8fafc",
  },
};

let mainWindow = null;
let pendingImportFilePaths = [];
const SUPPORTED_DECK_IMPORT_EXTENSIONS = [".json", ".lioradeck", ".leioradeck"];
const DB_FILE_NAME = "lioralang.db";

const getDevServerUrl = () => {
  return process.env.VITE_DEV_SERVER_URL || "http://localhost:5175";
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

const resolveActiveDbPath = () => {
  const storedDbPath = readStoredDbPath(app.getPath("userData"));
  return storedDbPath || getDefaultDbPath();
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
  if (app.isPackaged) {
    return [
      "default-src 'self'",
      "script-src 'self'",
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob:",
      "font-src 'self' https://fonts.gstatic.com data:",
      "connect-src 'self'",
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
    `connect-src 'self' ${devOrigin} ${devWsOrigin}`,
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

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    flushPendingImportFileRequests();

    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
  });

  mainWindow.webContents.on("did-finish-load", () => {
    flushPendingImportFileRequests();
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
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import deck package",
      properties: ["openFile"],
      filters: [
        { name: "Liora deck", extensions: ["lioradeck"] },
        { name: "Legacy Liora deck", extensions: ["leioradeck"] },
        { name: "JSON", extensions: ["json"] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const selectedFilePath = result.filePaths[0];
    const payload = readDeckImportPayloadFromFilePath(selectedFilePath);

    if (!payload) {
      throw new Error("Selected import file is invalid");
    }

    return payload;
  });

  ipcMain.handle("decks:import-json", async (_, payload) => {
    const filePath = typeof payload?.filePath === "string" ? payload.filePath : "";

    if (!filePath) {
      throw new Error("Import file is not selected");
    }

    const fileExtension = path.extname(filePath).toLowerCase();

    if (!SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(fileExtension)) {
      throw new Error("Only .json and .lioradeck files can be imported");
    }

    if (!fs.existsSync(filePath)) {
      throw new Error("Selected import file does not exist");
    }

    const preferredDeckName =
      typeof payload?.deckName === "string" ? payload.deckName.trim() : "";
    const sourceLanguage =
      typeof payload?.sourceLanguage === "string" ? payload.sourceLanguage.trim() : "";
    const targetLanguage =
      typeof payload?.targetLanguage === "string" ? payload.targetLanguage.trim() : "";
    const tertiaryLanguage =
      typeof payload?.tertiaryLanguage === "string"
        ? payload.tertiaryLanguage.trim()
        : "";
    const importResult = importDeckFromJsonFile(filePath, {
      deckName: preferredDeckName,
      sourceLanguage,
      targetLanguage,
      tertiaryLanguage,
    });
    sendDecksUpdated();

    return {
      canceled: false,
      ...importResult,
    };
  });

  ipcMain.handle("decks:export-json", async (_, deckId) => {
    const deck = getDeckById(Number(deckId));

    if (!deck) {
      throw new Error("Deck not found");
    }

    const result = await dialog.showSaveDialog(mainWindow, {
      title: "Export deck package",
      defaultPath: `${deck.name}.lioradeck`,
      filters: [
        { name: "Liora deck", extensions: ["lioradeck"] },
        { name: "Legacy Liora deck", extensions: ["leioradeck"] },
        { name: "JSON", extensions: ["json"] },
      ],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const exportResult = exportDeckToJsonFile(Number(deckId), result.filePath);

    return {
      canceled: false,
      ...exportResult,
    };
  });

  ipcMain.handle("decks:rename", (_, payload) => {
    const renamedDeck = renameDeck(payload?.deckId, payload?.name);
    sendDecksUpdated();
    return renamedDeck;
  });

  ipcMain.handle("decks:delete", (_, payload) => {
    const deletionResult = deleteDeck(payload?.deckId);
    sendDecksUpdated();
    return deletionResult;
  });

  ipcMain.handle("decks:save", (_, payload) => {
    const saveResult = saveDeck(payload || {});
    sendDecksUpdated();
    return saveResult;
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
    sendDecksUpdated();
    sendAppSettingsUpdated(getAppSettings());

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
      sendAppSettingsUpdated(getAppSettings());
    }

    return report;
  });

  ipcMain.handle("app:get-settings", () => {
    return getAppSettings();
  });

  ipcMain.handle("app:update-settings", (_, payload) => {
    const nextSettings = updateAppSettings(payload?.settings || {});
    sendAppSettingsUpdated(nextSettings);
    return nextSettings;
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
      canGoBack: webContents.canGoBack(),
      canGoForward: webContents.canGoForward(),
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

    if (webContents.canGoBack()) {
      webContents.goBack();
    }

    return {
      canGoBack: webContents.canGoBack(),
      canGoForward: webContents.canGoForward(),
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

    if (webContents.canGoForward()) {
      webContents.goForward();
    }

    return {
      canGoBack: webContents.canGoBack(),
      canGoForward: webContents.canGoForward(),
    };
  });

  ipcMain.handle("window:apply-theme", (_, payload) => {
    const activeWindow = getActiveWindow();
    const applied = applyWindowTitleBarTheme(activeWindow, payload?.theme);

    return { applied };
  });
};

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
}

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

  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  mainWindow.focus();
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
    setupContentSecurityPolicy();
    setupIpcHandlers();
    await createWindow();
    queueImportFileOpenRequest(
      resolveDeckImportFilePathFromArgs(process.argv, process.cwd()),
    );

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
        queueImportFileOpenRequest(
          resolveDeckImportFilePathFromArgs(process.argv, process.cwd()),
        );
      }
    });
  })
  .catch((startupError) => {
    console.error("Failed to start Electron app:", startupError);

    dialog.showErrorBox(
      "LioraLang Startup Error",
      `${startupError.message}\n\nRun: pnpm rebuild:native`,
    );

    app.quit();
  });

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
