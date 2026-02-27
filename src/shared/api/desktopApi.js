const FALLBACK_DECK_ID = "local-json";
let fallbackWordsPromise = null;
const pendingImportFileRequests = [];
const importFileRequestListeners = new Set();
const appSettingsUpdatedListeners = new Set();
let isImportFileBridgeInitialized = false;
let isAppSettingsBridgeInitialized = false;

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

const normalizeFallbackWord = (word, index) => ({
  id: word?.id ?? `fallback-${index + 1}`,
  externalId: word?.externalId ?? "",
  source: word?.source ?? "",
  target: word?.target ?? "",
  tertiary: word?.tertiary ?? "",
  level: word?.level ?? "A1",
  part_of_speech: word?.part_of_speech ?? "other",
  tags: Array.isArray(word?.tags) ? word.tags : [],
  examples: Array.isArray(word?.examples) ? word.examples : [],
});

const normalizeImportFilePayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const filePath = typeof payload.filePath === "string" ? payload.filePath : "";

  if (!filePath) {
    return null;
  }

  return payload;
};

const initImportFileBridge = () => {
  if (isImportFileBridgeInitialized || !isDesktopMode()) {
    return;
  }

  const electronApi = getElectronApi();

  if (!electronApi || typeof electronApi.onImportDeckFileRequested !== "function") {
    return;
  }

  electronApi.onImportDeckFileRequested((payload) => {
    const normalizedPayload = normalizeImportFilePayload(payload);

    if (!normalizedPayload) {
      return;
    }

    pendingImportFileRequests.push(normalizedPayload);

    importFileRequestListeners.forEach((listener) => listener(normalizedPayload));
  });

  isImportFileBridgeInitialized = true;
};

const initAppSettingsBridge = () => {
  if (isAppSettingsBridgeInitialized || !isDesktopMode()) {
    return;
  }

  const electronApi = getElectronApi();

  if (!electronApi || typeof electronApi.onAppSettingsUpdated !== "function") {
    return;
  }

  electronApi.onAppSettingsUpdated((settings) => {
    appSettingsUpdatedListeners.forEach((listener) => listener(settings || {}));
  });

  isAppSettingsBridgeInitialized = true;
};

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

    const words = await loadFallbackWords();
    return words.map((word, index) => normalizeFallbackWord(word, index));
  },

  async pickImportDeckJson() {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Deck file import is available only in desktop mode");
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

      throw new Error("Deck file import is available only in desktop mode");
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

  async getAppSettings() {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().getAppSettings !== "function"
    ) {
      return {};
    }

    return getElectronApi().getAppSettings();
  },

  async updateAppSettings(settings = {}) {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().updateAppSettings !== "function"
    ) {
      return {};
    }

    return getElectronApi().updateAppSettings({
      settings: settings || {},
    });
  },

  async openDbFolder() {
    if (!isDesktopMode()) {
      return null;
    }

    return getElectronApi().openDbFolder();
  },

  async changeDbLocation() {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().changeDbLocation !== "function"
    ) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Database path update is available only in desktop mode");
    }

    return getElectronApi().changeDbLocation();
  },

  async verifyIntegrity(options = {}) {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().verifyIntegrity !== "function"
    ) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Integrity check is available only in desktop mode");
    }

    return getElectronApi().verifyIntegrity({
      repair: Boolean(options?.repair),
    });
  },

  async getWindowHistoryState() {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().getWindowHistoryState !== "function"
    ) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    return getElectronApi().getWindowHistoryState();
  },

  async navigateWindowBack() {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().navigateWindowBack !== "function"
    ) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    return getElectronApi().navigateWindowBack();
  },

  async navigateWindowForward() {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().navigateWindowForward !== "function"
    ) {
      return {
        canGoBack: false,
        canGoForward: false,
      };
    }

    return getElectronApi().navigateWindowForward();
  },

  async applyWindowTheme(theme) {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().applyWindowTheme !== "function"
    ) {
      return { applied: false };
    }

    return getElectronApi().applyWindowTheme({ theme });
  },

  subscribeDecksUpdated(callback) {
    if (!isDesktopMode() || typeof callback !== "function") {
      return () => {};
    }

    return getElectronApi().onDecksUpdated(callback);
  },

  consumePendingImportDeckFileRequest() {
    initImportFileBridge();
    return pendingImportFileRequests.shift() || null;
  },

  hasPendingImportDeckFileRequest() {
    initImportFileBridge();
    return pendingImportFileRequests.length > 0;
  },

  subscribeImportDeckFileRequested(callback) {
    if (!isDesktopMode() || typeof callback !== "function") {
      return () => {};
    }

    initImportFileBridge();
    importFileRequestListeners.add(callback);

    return () => {
      importFileRequestListeners.delete(callback);
    };
  },

  subscribeAppSettingsUpdated(callback) {
    if (!isDesktopMode() || typeof callback !== "function") {
      return () => {};
    }

    initAppSettingsBridge();
    appSettingsUpdatedListeners.add(callback);

    return () => {
      appSettingsUpdatedListeners.delete(callback);
    };
  },
};
