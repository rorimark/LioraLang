import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  shell,
  safeStorage,
  Tray,
  session,
} from "electron";
import updaterPkg from "electron-updater";
const { autoUpdater } = updaterPkg;
import process from "node:process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
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
  deleteHubDeck,
  getHubDeckBySlug,
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
import { createImportWorkflow } from "./main/importWorkflow.js";
import { createNavigationManager } from "./main/navigation.js";
import { createRuntimeErrorManager } from "./main/runtimeErrors.js";
import { createUpdaterManager } from "./main/updater.js";
import { createBackupManager } from "./main/backup.js";
import { createApplicationMenuManager } from "./main/applicationMenu.js";
import { createContentSecurityPolicyManager } from "./main/contentSecurityPolicy.js";
import { createDevToolsAccessManager } from "./main/devToolsAccess.js";
import { createDesktopRuntimeManager } from "./main/desktopRuntime.js";
import { createDatabasePathManager } from "./main/databasePathManager.js";
import { registerIpcHandlers } from "./main/ipc.js";
import { createWindowLifecycle } from "./main/windowLifecycle.js";
import { createRuntimePreferencesManager } from "./main/runtimePreferences.js";
import { createLogger } from "./main/logging.js";
import { createAnalyticsManager } from "./main/analytics.js";
import { createAppLifecycleManager } from "./main/appLifecycle.js";
import { createMainState } from "./main/state.js";
import { createSecureStorageService } from "./services/secureStorage.service.js";
import {
  APP_HOMEPAGE_URL,
  SETTINGS_ROUTE_PATH,
  SETTINGS_MENU_TABS,
  DB_FILE_NAME,
  LOG_LEVELS,
  LOG_LEVEL_PRIORITY,
  BACKUP_INTERVAL_MS,
} from "./main/config.js";
import {
  createThemeConfig,
  WINDOW_TITLE_BAR_HEIGHT,
} from "./main/themeConfig.js";
import { createWindowThemeManager } from "./main/windowTheme.js";
import { createWindowBroadcast } from "./main/windowBroadcast.js";
import { DEFAULT_APP_PREFERENCES } from "../src/shared/config/appPreferencesDefaults.js";
import {
  isTrustedHubStorageUrl,
  toOrigin,
} from "../src/shared/config/hubRemoteImport.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APP_ICON_PATH =
  process.platform === "win32"
    ? path.join(__dirname, "assets", "icon.ico")
    : path.join(__dirname, "assets", "icon.png");
const APP_THEME_CSS_PATH = path.join(__dirname, "..", "src", "shared", "config", "variables.css");
const { windowTitleBarTheme: WINDOW_TITLE_BAR_THEME, fatalStartupErrorTheme: FATAL_STARTUP_ERROR_THEME } =
  createThemeConfig({
    fs,
    cssPath: APP_THEME_CSS_PATH,
  });
const runtimePreferencesManager = createRuntimePreferencesManager({
  Database,
  fs,
  path,
  app,
  dbFileName: DB_FILE_NAME,
  defaultAppPreferences: DEFAULT_APP_PREFERENCES,
  readStoredDbPath,
  backupIntervals: BACKUP_INTERVAL_MS,
  logLevels: LOG_LEVEL_PRIORITY,
});
const DEFAULT_RUNTIME_APP_PREFERENCES =
  runtimePreferencesManager.defaultRuntimeAppPreferences;
const extractAppPreferencesFromSettings = (...args) =>
  runtimePreferencesManager.extractAppPreferencesFromSettings(...args);
const resolveActiveDbPath = () => runtimePreferencesManager.resolveActiveDbPath();
const resolveBootstrapAppPreferences = () =>
  runtimePreferencesManager.resolveBootstrapAppPreferences();
const toCleanString = (...args) => runtimePreferencesManager.toCleanString(...args);
const mainState = createMainState({
  initialPreferences: resolveBootstrapAppPreferences(),
});

const getDevServerUrl = () => {
  return process.env.VITE_DEV_SERVER_URL || "http://localhost:5175";
};

const getTrustedRemoteConnectSources = () => {
  const configuredSupabaseOrigin = toOrigin(process.env.VITE_SUPABASE_URL);

  if (configuredSupabaseOrigin) {
    return [configuredSupabaseOrigin];
  }

  // Packaged builds do not always receive Vite env vars at runtime.
  // Keep the fallback scoped to Supabase only so LLH previews/imports still work.
  return ["https://*.supabase.co"];
};

const logger = createLogger({
  levels: LOG_LEVELS,
  priorities: LOG_LEVEL_PRIORITY,
  getCurrentLevel: () => mainState.getLogLevel() || LOG_LEVELS.error,
});
const logWarn = (...args) => logger.logWarn(...args);
const logDebug = (...args) => logger.logDebug(...args);
const logError = (...args) => logger.logError(...args);
const authSecureStorage = createSecureStorageService({
  app,
  safeStorage,
});

const runtimeErrorManager = createRuntimeErrorManager({
  app,
  BrowserWindow,
  appIconPath: APP_ICON_PATH,
  fatalTheme: FATAL_STARTUP_ERROR_THEME,
  getMainWindow: mainState.getMainWindow,
  getCrashReportsEnabled: mainState.getCrashReportsEnabled,
});
const {
  buildRuntimeErrorPayload,
  flushPendingRuntimeErrorEvents,
  queueRuntimeErrorEvent,
  reportRuntimeError,
  openFatalStartupErrorWindow,
} = runtimeErrorManager;

const importWorkflow = createImportWorkflow({
  app,
  BrowserWindow,
  dialog,
  fs,
  path,
  fetchImpl: fetch,
  getMainWindow: mainState.getMainWindow,
  getSupabaseUrl: () => process.env.VITE_SUPABASE_URL,
  getAppPreferences: () => extractAppPreferencesFromSettings(getAppSettings()),
  readDeckImportMetadataFromJsonFile,
  importDeckFromJsonFile,
  isTrustedHubStorageUrl,
  toOrigin,
  reportRuntimeError,
});
const {
  flushPendingImportFileRequests,
  queueImportFileOpenRequest,
  resolveDeckImportFilePathFromArgs,
  requestDeckImportFromMenu,
} = importWorkflow;

const updaterManager = createUpdaterManager({
  app,
  autoUpdater,
  BrowserWindow,
  fs,
  path,
  pipeline,
  fetchImpl: fetch,
  logDebug,
  logWarn,
  getUpdateChannel: mainState.getUpdateChannel,
});

const {
  attachDevToolsAccessControl,
  closeAllDevToolsIfDisabled,
} = createDevToolsAccessManager({
  app,
  BrowserWindow,
  toCleanString,
  isDeveloperModeEnabled: mainState.isDeveloperModeEnabled,
  onQuitShortcut: () => {
    mainState.requestQuit();
    app.quit();
  },
});

const { setupContentSecurityPolicy } = createContentSecurityPolicyManager({
  app,
  session,
  getDevServerUrl,
  getTrustedRemoteConnectSources,
});
const { applyWindowTitleBarTheme } = createWindowThemeManager({
  platform: process.platform,
  windowTitleBarHeight: WINDOW_TITLE_BAR_HEIGHT,
  windowTitleBarTheme: WINDOW_TITLE_BAR_THEME,
});
const analyticsManager = createAnalyticsManager({
  app,
  fs,
  path,
  toCleanString,
  getAnalyticsEnabled: mainState.getAnalyticsEnabled,
  getUpdateChannel: mainState.getUpdateChannel,
  logWarn,
});
const { trackAnalyticsEvent } = analyticsManager;

const {
  destroyTray,
  ensureTray,
  showMainWindow,
  syncLaunchAtStartupSetting,
  syncTrayMode,
  syncWindowTitle,
} = createDesktopRuntimeManager({
  app,
  Menu,
  Tray,
  appIconPath: APP_ICON_PATH,
  getMainWindow: mainState.getMainWindow,
  getWindowTitle: mainState.getWindowTitle,
  getMinimizeToTray: mainState.getMinimizeToTray,
  getLaunchAtStartup: mainState.getLaunchAtStartup,
  logWarn,
  onQuitRequested: mainState.requestQuit,
});

const navigationManager = createNavigationManager({
  getMainWindow: mainState.getMainWindow,
  showMainWindow,
  settingsRoutePath: SETTINGS_ROUTE_PATH,
  toCleanString,
});
const {
  flushPendingNavigationRequests,
  requestSettingsSectionFromMenu,
} = navigationManager;

const { clearBackupSchedule, syncBackupSchedule } = createBackupManager({
  fs,
  path,
  getDatabasePath,
  getDatabase,
  getBackupSettings: mainState.getDataSafetyPreferences,
  trackAnalyticsEvent,
  reportRuntimeError,
});

const { syncApplicationMenu } = createApplicationMenuManager({
  app,
  Menu,
  shell,
  homepageUrl: APP_HOMEPAGE_URL,
  settingsMenuTabs: SETTINGS_MENU_TABS,
  isDeveloperModeEnabled: mainState.isDeveloperModeEnabled,
  requestDeckImportFromMenu: () => requestDeckImportFromMenu(),
  requestSettingsSectionFromMenu,
});

const syncRuntimePreferences = () => {
  process.env.LIORALANG_UPDATE_CHANNEL = mainState.getUpdateChannel();
  syncLaunchAtStartupSetting();
  syncTrayMode();
  syncBackupSchedule();
  syncWindowTitle();
  syncApplicationMenu();
  closeAllDevToolsIfDisabled();
};

const { changeDatabasePath } = createDatabasePathManager({
  fs,
  path,
  app,
  closeDatabaseConnection,
  getDatabase,
  getDatabasePath,
  initDatabaseConnection,
  initDb,
  writeStoredDbPath,
});

const { createWindow } = createWindowLifecycle({
  app,
  BrowserWindow,
  preloadPath: path.join(__dirname, "preload.cjs"),
  distIndexPath: path.join(__dirname, "../dist/index.html"),
  appIconPath: APP_ICON_PATH,
  windowTitleBarHeight: WINDOW_TITLE_BAR_HEIGHT,
  getWindowTitle: mainState.getWindowTitle,
  getWindowTitleBarTheme: () => WINDOW_TITLE_BAR_THEME.light,
  getDevServerUrl,
  getIsQuitRequested: mainState.getIsQuitRequested,
  getMinimizeToTray: mainState.getMinimizeToTray,
  setMainWindow: mainState.setMainWindow,
  ensureTray,
  attachDevToolsAccessControl,
  flushPendingImportFileRequests,
  flushPendingRuntimeErrorEvents,
  flushPendingNavigationRequests,
});
const { sendDecksUpdated, sendAppSettingsUpdated } = createWindowBroadcast({
  BrowserWindow,
});
const setupIpcHandlers = () => {
  registerIpcHandlers({
    ipcMain,
    BrowserWindow,
    dialog,
    shell,
    app,
    fs,
    path,
    getMainWindow: mainState.getMainWindow,
    dbFileName: DB_FILE_NAME,
    listDecks,
    getDeckById,
    getDeckWords,
    exportDeckToJsonFile,
    exportDeckToJsonPackage,
    renameDeck,
    deleteDeck,
    saveDeck,
    listHubDecks,
    getHubDeckBySlug,
    createHubDeckDownloadUrl,
    publishHubDeck,
    incrementHubDeckDownloads,
    deleteHubDeck,
    getSrsSessionSnapshot,
    gradeSrsCard,
    getProgressOverview,
    getDatabasePath,
    changeDatabasePath,
    verifyAppIntegrityAndRepair,
    getAppSettings,
    updateAppSettings,
    extractAppPreferencesFromSettings,
    setAppPreferencesCache: mainState.setAppPreferences,
    syncRuntimePreferences,
    syncBackupSchedule,
    updaterManager,
    importWorkflow,
    navigationManager,
    applyWindowTitleBarTheme,
    buildRuntimeErrorPayload,
    queueRuntimeErrorEvent,
    sendDecksUpdated,
    sendAppSettingsUpdated,
    trackAnalyticsEvent,
    authSecureStorage,
  });
};

const appLifecycleManager = createAppLifecycleManager({
  app,
  BrowserWindow,
  migrateLegacyDbStorage,
  logWarn,
  logError,
  reportRuntimeError,
  buildRuntimeErrorPayload,
  queueRuntimeErrorEvent,
  openFatalStartupErrorWindow,
  resolveDeckImportFilePathFromArgs,
  queueImportFileOpenRequest,
  showMainWindow,
  getMainWindow: mainState.getMainWindow,
  resolveActiveDbPath,
  initDatabaseConnection,
  initDb,
  getAppSettings,
  extractAppPreferencesFromSettings,
  setAppPreferencesCache: mainState.setAppPreferences,
  syncRuntimePreferences,
  setupContentSecurityPolicy,
  setupIpcHandlers,
  createWindow,
  clearBackupSchedule,
  destroyTray,
  disableHardwareAcceleration: () => app.disableHardwareAcceleration(),
  shouldEnableHardwareAcceleration: mainState.shouldEnableHardwareAcceleration,
  requestSingleInstanceLock: () => (app.isPackaged ? app.requestSingleInstanceLock() : true),
  onQuitRequested: mainState.requestQuit,
  dbFileName: DB_FILE_NAME,
});

void appLifecycleManager.start();
