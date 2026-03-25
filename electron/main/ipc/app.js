export const registerAppIpcHandlers = ({
  ipcMain,
  dialog,
  shell,
  app,
  path,
  getMainWindow,
  dbFileName,
  getDatabasePath,
  changeDatabasePath,
  verifyAppIntegrityAndRepair,
  getAppSettings,
  updateAppSettings,
  extractAppPreferencesFromSettings,
  setAppPreferencesCache,
  syncRuntimePreferences,
  syncBackupSchedule,
  sendDecksUpdated,
  sendAppSettingsUpdated,
  buildRuntimeErrorPayload,
  queueRuntimeErrorEvent,
}) => {
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

  ipcMain.handle("app:open-downloads", () => {
    const downloadsPath = app.getPath("downloads");
    shell.openPath(downloadsPath);
    return downloadsPath;
  });

  ipcMain.handle("app:change-db-location", async () => {
    const currentDbPath = getDatabasePath();
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: "Choose database folder",
      properties: ["openDirectory", "createDirectory"],
      defaultPath: currentDbPath ? path.dirname(currentDbPath) : app.getPath("home"),
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const targetFolderPath = result.filePaths[0];
    const targetDbPath = path.join(targetFolderPath, dbFileName);
    const changeResult = changeDatabasePath(targetDbPath);
    syncBackupSchedule();
    sendDecksUpdated();
    const nextSettings = getAppSettings();
    setAppPreferencesCache(extractAppPreferencesFromSettings(nextSettings));
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
      setAppPreferencesCache(extractAppPreferencesFromSettings(nextSettings));
      syncRuntimePreferences();
      sendAppSettingsUpdated(nextSettings);
    }

    return report;
  });

  ipcMain.handle("app:get-settings", () => {
    const settings = getAppSettings();
    setAppPreferencesCache(extractAppPreferencesFromSettings(settings));
    return settings;
  });

  ipcMain.handle("app:get-version", () => {
    return {
      version: app.getVersion(),
    };
  });

  ipcMain.handle("app:update-settings", (_, payload) => {
    const nextSettings = updateAppSettings(payload?.settings || {});
    setAppPreferencesCache(extractAppPreferencesFromSettings(nextSettings));
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
};
