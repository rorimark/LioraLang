import { app, BrowserWindow, dialog, ipcMain, shell, session } from "electron";
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initDatabaseConnection, getDatabasePath } from "./db/db.js";
import { initDb } from "./db/initDb.js";
import {
  listDecks,
  getDeckById,
  getDeckWords,
  importDeckFromJsonFile,
  exportDeckToJsonFile,
  renameDeck,
  deleteDeck,
} from "./db/services/db.services.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ICON_PATH = path.join(__dirname, "assets", "icon.png");

let mainWindow = null;

const getDevServerUrl = () => {
  return process.env.VITE_DEV_SERVER_URL || "http://localhost:5175";
};

const buildContentSecurityPolicy = () => {
  if (app.isPackaged) {
    return [
      "default-src 'self'",
      "script-src 'self'",
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
  mainWindow = new BrowserWindow({
    width: 1300,
    height: 840,
    minWidth: 1024,
    minHeight: 700,
    icon: APP_ICON_PATH,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();

    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools({ mode: "detach" });
    }
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

const setupIpcHandlers = () => {
  ipcMain.handle("decks:list", () => listDecks());

  ipcMain.handle("decks:get-by-id", (_, deckId) => {
    return getDeckById(Number(deckId));
  });

  ipcMain.handle("decks:get-words", (_, deckId) => {
    return getDeckWords(Number(deckId));
  });

  ipcMain.handle("decks:pick-import-json", async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: "Import deck JSON",
      properties: ["openFile"],
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];

    return {
      canceled: false,
      filePath,
      fileName: path.basename(filePath),
      suggestedDeckName: path.basename(filePath, path.extname(filePath)),
    };
  });

  ipcMain.handle("decks:import-json", async (_, payload) => {
    const filePath = typeof payload?.filePath === "string" ? payload.filePath : "";

    if (!filePath) {
      throw new Error("Import file is not selected");
    }

    if (!filePath.toLowerCase().endsWith(".json")) {
      throw new Error("Only JSON files can be imported");
    }

    if (!fs.existsSync(filePath)) {
      throw new Error("Selected import file does not exist");
    }

    const preferredDeckName =
      typeof payload?.deckName === "string" ? payload.deckName.trim() : "";
    const importResult = importDeckFromJsonFile(filePath, preferredDeckName);
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
      title: "Export deck JSON",
      defaultPath: `${deck.name}.json`,
      filters: [{ name: "JSON", extensions: ["json"] }],
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
};

app
  .whenReady()
  .then(async () => {
    const dbPath = path.join(app.getPath("userData"), "data", "lioralang.db");

    initDatabaseConnection(dbPath);
    initDb();
    setupContentSecurityPolicy();
    setupIpcHandlers();
    await createWindow();

    app.on("activate", async () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
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
