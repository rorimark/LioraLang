import process from "node:process";

export const createAppLifecycleManager = ({
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
  getMainWindow,
  resolveActiveDbPath,
  initDatabaseConnection,
  initDb,
  getAppSettings,
  extractAppPreferencesFromSettings,
  setAppPreferencesCache,
  syncRuntimePreferences,
  setupContentSecurityPolicy,
  setupIpcHandlers,
  createWindow,
  clearBackupSchedule,
  destroyTray,
  disableHardwareAcceleration,
  shouldEnableHardwareAcceleration,
  requestSingleInstanceLock,
  onQuitRequested,
  dbFileName,
}) => {
  const runLegacyStorageMigration = () => {
    try {
      return migrateLegacyDbStorage({
        appDataPath: app.getPath("appData"),
        currentUserDataPath: app.getPath("userData"),
        dbFileName,
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

  const logLegacyStorageMigration = () => {
    const report = runLegacyStorageMigration();

    if (report.migrated) {
      logWarn(
        "Legacy storage migrated to current user data directory:",
        report.sourceDbPath,
        "->",
        report.dbPath,
      );
    }

    if (report.reason === "legacy-path-linked") {
      logWarn(
        "Using legacy database path from previous install:",
        report.dbPath,
      );
    }
  };

  const bootstrapRuntimePreferences = () => {
    const currentSettings = getAppSettings();
    return setAppPreferencesCache(extractAppPreferencesFromSettings(currentSettings));
  };

  const startMainProcess = async () => {
    const dbPath = resolveActiveDbPath();

    initDatabaseConnection(dbPath);
    initDb();
    bootstrapRuntimePreferences();
    syncRuntimePreferences();
    setupContentSecurityPolicy();
    setupIpcHandlers();
    await createWindow();
    syncRuntimePreferences();
    queueImportFileOpenRequest(
      resolveDeckImportFilePathFromArgs(process.argv, process.cwd()),
    );
  };

  const registerProcessErrorHandlers = () => {
    process.on("uncaughtException", (error) => {
      logError("Uncaught Electron error:", error);
      reportRuntimeError(error, "uncaughtException");
    });

    process.on("unhandledRejection", (reason) => {
      logError("Unhandled Electron rejection:", reason);
      reportRuntimeError(reason, "unhandledRejection");
    });
  };

  const registerAppEventHandlers = () => {
    app.on("second-instance", (_, commandLine, workingDirectory) => {
      const filePathFromArgs = resolveDeckImportFilePathFromArgs(
        commandLine,
        workingDirectory,
      );

      if (filePathFromArgs) {
        queueImportFileOpenRequest(filePathFromArgs);
      }

      const mainWindow = getMainWindow();

      if (!mainWindow || mainWindow.isDestroyed()) {
        return;
      }

      showMainWindow();
    });

    app.on("open-file", (event, filePath) => {
      event.preventDefault();
      queueImportFileOpenRequest(filePath);
    });

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

    app.on("before-quit", () => {
      onQuitRequested();
      clearBackupSchedule();
      destroyTray();
    });

    app.on("window-all-closed", () => {
      if (process.platform !== "darwin") {
        app.quit();
      }
    });
  };

  const start = async () => {
    logLegacyStorageMigration();

    if (!shouldEnableHardwareAcceleration()) {
      disableHardwareAcceleration();
    }

    if (!requestSingleInstanceLock()) {
      app.quit();
      return;
    }

    registerProcessErrorHandlers();
    registerAppEventHandlers();

    try {
      await app.whenReady();
      await startMainProcess();
    } catch (startupError) {
      logError("Failed to start Electron app:", startupError);
      const startupPayload = buildRuntimeErrorPayload({
        title: "LioraLang Startup Error",
        message: startupError?.message || "Failed to start application",
        details: startupError?.stack || "Run: pnpm rebuild:native",
        source: "startup",
      });
      queueRuntimeErrorEvent(startupPayload);

      try {
        await openFatalStartupErrorWindow(startupPayload);
      } catch (fatalWindowError) {
        logError("Failed to render custom startup error window:", fatalWindowError);
        app.quit();
      }
    }
  };

  return {
    start,
  };
};
