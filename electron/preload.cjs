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

  getDbPath: () => ipcRenderer.invoke("app:get-db-path"),
  openDbFolder: () => ipcRenderer.invoke("app:open-db-folder"),

  onDecksUpdated: (callback) => {
    const listener = () => callback();
    ipcRenderer.on("decks-updated", listener);

    return () => {
      ipcRenderer.removeListener("decks-updated", listener);
    };
  },
});
