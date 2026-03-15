const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  listDecks: () => ipcRenderer.invoke("decks:list"),
  getDeckById: (deckId) => ipcRenderer.invoke("decks:get-by-id", deckId),
  getDeckWords: (deckId) => ipcRenderer.invoke("decks:get-words", deckId),
  pickImportDeckJson: () => ipcRenderer.invoke("decks:pick-import-json"),
  importDeckFromJson: (payload) => ipcRenderer.invoke("decks:import-json", payload),
  importDeckFromUrl: (payload) => ipcRenderer.invoke("decks:import-url", payload),
  exportDeckPackage: (payload) => ipcRenderer.invoke("decks:export-package", payload),
  exportDeckToJson: (payload) => ipcRenderer.invoke("decks:export-json", payload),
  renameDeck: (payload) => ipcRenderer.invoke("decks:rename", payload),
  deleteDeck: (payload) => ipcRenderer.invoke("decks:delete", payload),
  saveDeck: (payload) => ipcRenderer.invoke("decks:save", payload),
  getSrsSession: (payload) => ipcRenderer.invoke("srs:get-session", payload),
  gradeSrsCard: (payload) => ipcRenderer.invoke("srs:grade-card", payload),
  getProgressOverview: () => ipcRenderer.invoke("progress:get-overview"),

  getDbPath: () => ipcRenderer.invoke("app:get-db-path"),
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
  getAppSettings: () => ipcRenderer.invoke("app:get-settings"),
  updateAppSettings: (payload) => ipcRenderer.invoke("app:update-settings", payload),
  openDbFolder: () => ipcRenderer.invoke("app:open-db-folder"),
  openDownloadsFolder: () => ipcRenderer.invoke("app:open-downloads"),
  changeDbLocation: () => ipcRenderer.invoke("app:change-db-location"),
  verifyIntegrity: (payload) => ipcRenderer.invoke("app:verify-integrity", payload),
  showRuntimeErrorPreview: () => ipcRenderer.invoke("app:debug-show-runtime-error"),
  getWindowHistoryState: () => ipcRenderer.invoke("window:get-history-state"),
  navigateWindowBack: () => ipcRenderer.invoke("window:navigate-back"),
  navigateWindowForward: () => ipcRenderer.invoke("window:navigate-forward"),
  applyWindowTheme: (payload) => ipcRenderer.invoke("window:apply-theme", payload),
  checkForUpdates: () => ipcRenderer.invoke("updates:check"),
  downloadUpdate: () => ipcRenderer.invoke("updates:download"),
  hubListDecks: (payload) => ipcRenderer.invoke("hub:list-decks", payload),
  hubCreateDownloadUrl: (payload) =>
    ipcRenderer.invoke("hub:create-download-url", payload),
  hubPublishDeck: (payload) => ipcRenderer.invoke("hub:publish-deck", payload),
  hubIncrementDeckDownloads: (payload) =>
    ipcRenderer.invoke("hub:increment-downloads", payload),
  hubDeleteDeck: (payload) => ipcRenderer.invoke("hub:delete-deck", payload),

  onDecksUpdated: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("decks-updated", listener);

    return () => {
      ipcRenderer.removeListener("decks-updated", listener);
    };
  },
  onImportDeckFileRequested: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("decks:open-import-file", listener);

    return () => {
      ipcRenderer.removeListener("decks:open-import-file", listener);
    };
  },
  onAppSettingsUpdated: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("app-settings-updated", listener);

    return () => {
      ipcRenderer.removeListener("app-settings-updated", listener);
    };
  },
  onRuntimeError: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("app:runtime-error", listener);

    return () => {
      ipcRenderer.removeListener("app:runtime-error", listener);
    };
  },
  onNavigateRequested: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("app:navigate", listener);

    return () => {
      ipcRenderer.removeListener("app:navigate", listener);
    };
  },
  onUpdateStatus: (callback) => {
    const listener = (_, payload) => callback(payload);
    ipcRenderer.on("updates:status", listener);

    return () => {
      ipcRenderer.removeListener("updates:status", listener);
    };
  },
});
