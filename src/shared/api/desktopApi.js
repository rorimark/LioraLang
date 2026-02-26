const FALLBACK_DECK_ID = "local-json";
let fallbackWordsPromise = null;

const getElectronApi = () =>
  typeof window !== "undefined" ? window.electronAPI : undefined;

const isElectronRuntime = () =>
  typeof navigator !== "undefined" &&
  typeof navigator.userAgent === "string" &&
  navigator.userAgent.includes("Electron");

const isDesktopMode = () =>
  Boolean(
    getElectronApi() &&
      typeof getElectronApi().pickImportDeckJson === "function" &&
      typeof getElectronApi().importDeckFromJson === "function" &&
      typeof getElectronApi().exportDeckToJson === "function",
  );

const loadFallbackWords = async () => {
  if (!fallbackWordsPromise) {
    fallbackWordsPromise = fetch("/data/words.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load fallback words");
        }

        return response.json();
      })
      .then((words) => (Array.isArray(words) ? words : []));
  }

  return fallbackWordsPromise;
};

export const desktopApi = {
  isDesktopMode,

  async listDecks() {
    if (isDesktopMode()) {
      return getElectronApi().listDecks();
    }

    const words = await loadFallbackWords();

    return [
      {
        id: FALLBACK_DECK_ID,
        name: "Starter Deck",
        description: "Fallback deck from public/data/words.json",
        sourceLanguage: "English",
        targetLanguage: "Russian",
        tertiaryLanguage: "Polish",
        tagsJson: JSON.stringify(["starter"]),
        wordsCount: words.length,
        createdAt: null,
      },
    ];
  },

  async getDeckById(deckId) {
    if (isDesktopMode()) {
      return getElectronApi().getDeckById(deckId);
    }

    if (String(deckId) !== FALLBACK_DECK_ID) {
      return null;
    }

    const words = await loadFallbackWords();

    return {
      id: FALLBACK_DECK_ID,
      name: "Starter Deck",
      description: "Fallback deck from public/data/words.json",
      sourceLanguage: "English",
      targetLanguage: "Russian",
      tertiaryLanguage: "Polish",
      tagsJson: JSON.stringify(["starter"]),
      wordsCount: words.length,
      createdAt: null,
    };
  },

  async getDeckWords(deckId) {
    if (isDesktopMode()) {
      return getElectronApi().getDeckWords(deckId);
    }

    if (String(deckId) !== FALLBACK_DECK_ID) {
      return [];
    }

    return loadFallbackWords();
  },

  async pickImportDeckJson() {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("JSON import is available only in desktop mode");
    }

    return getElectronApi().pickImportDeckJson();
  },

  async importDeckFromJson(payloadOrDeckName = "") {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("JSON import is available only in desktop mode");
    }

    if (typeof payloadOrDeckName === "string") {
      return getElectronApi().importDeckFromJson({ deckName: payloadOrDeckName });
    }

    return getElectronApi().importDeckFromJson(payloadOrDeckName || {});
  },

  async exportDeckToJson(deckId) {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Deck export is available only in desktop mode");
    }

    return getElectronApi().exportDeckToJson(deckId);
  },

  async renameDeck(deckId, name) {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Deck rename is available only in desktop mode");
    }

    return getElectronApi().renameDeck({ deckId, name });
  },

  async deleteDeck(deckId) {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Deck delete is available only in desktop mode");
    }

    return getElectronApi().deleteDeck({ deckId });
  },

  async saveDeck(payload) {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().saveDeck !== "function"
    ) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Deck editing is available only in desktop mode");
    }

    return getElectronApi().saveDeck(payload || {});
  },

  async getDbPath() {
    if (!isDesktopMode()) {
      return "Desktop mode is required";
    }

    return getElectronApi().getDbPath();
  },

  async openDbFolder() {
    if (!isDesktopMode()) {
      return null;
    }

    return getElectronApi().openDbFolder();
  },

  subscribeDecksUpdated(callback) {
    if (!isDesktopMode() || typeof callback !== "function") {
      return () => {};
    }

    return getElectronApi().onDecksUpdated(callback);
  },
};
