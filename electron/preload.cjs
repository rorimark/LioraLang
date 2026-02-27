const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  listDecks: () => ipcRenderer.invoke("decks:list"),
  getDeckById: (deckId) => ipcRenderer.invoke("decks:get-by-id", deckId),
  getDeckWords: (deckId) => ipcRenderer.invoke("decks:get-words", deckId),
  pickImportDeckJson: () => ipcRenderer.invoke("decks:pick-import-json"),
  importDeckFromJson: (payload) => ipcRenderer.invoke("decks:import-json", payload),
  exportDeckToJson: (deckId) => ipcRenderer.invoke("decks:export-json", deckId),
  renameDeck: (payload) => ipcRenderer.invoke("decks:rename", payload),
  deleteDeck: (payload) => ipcRenderer.invoke("decks:delete", payload),
  saveDeck: (payload) => ipcRenderer.invoke("decks:save", payload),

  getDbPath: () => ipcRenderer.invoke("app:get-db-path"),
  getAppSettings: () => ipcRenderer.invoke("app:get-settings"),
  updateAppSettings: (payload) => ipcRenderer.invoke("app:update-settings", payload),
  openDbFolder: () => ipcRenderer.invoke("app:open-db-folder"),
  changeDbLocation: () => ipcRenderer.invoke("app:change-db-location"),
  verifyIntegrity: (payload) => ipcRenderer.invoke("app:verify-integrity", payload),
  getWindowHistoryState: () => ipcRenderer.invoke("window:get-history-state"),
  navigateWindowBack: () => ipcRenderer.invoke("window:navigate-back"),
  navigateWindowForward: () => ipcRenderer.invoke("window:navigate-forward"),
  applyWindowTheme: (payload) => ipcRenderer.invoke("window:apply-theme", payload),

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
});
