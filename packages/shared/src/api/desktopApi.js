import { buildProgressOverview } from "@shared/core/usecases/progress";
const FALLBACK_DECK_ID = "local-json";
const ELECTRON_INVOKE_PREFIX = /^Error invoking remote method '[^']+':\s*/i;
const LEADING_ERROR_PREFIX = /^Error:\s*/i;
let fallbackWordsPromise = null;
const fallbackSrsStateByDeck = new Map();
const pendingImportFileRequests = [];
const importFileRequestListeners = new Set();
const appSettingsUpdatedListeners = new Set();
const runtimeErrorListeners = new Set();
const navigationRequestListeners = new Set();
let isImportFileBridgeInitialized = false;
let isAppSettingsBridgeInitialized = false;
let isRuntimeErrorBridgeInitialized = false;
let isNavigationBridgeInitialized = false;

const getElectronApi = () =>
  typeof window !== "undefined" ? window.electronAPI : undefined;

const normalizeElectronErrorMessage = (value, fallback = "Desktop action failed") => {
  if (typeof value !== "string") {
    return fallback;
  }

  let message = value.trim();

  while (ELECTRON_INVOKE_PREFIX.test(message) || LEADING_ERROR_PREFIX.test(message)) {
    message = message
      .replace(ELECTRON_INVOKE_PREFIX, "")
      .replace(LEADING_ERROR_PREFIX, "")
      .trim();
  }

  if (!message) {
    return fallback;
  }

  if (message === "Only the owner can delete this Hub deck") {
    return "You can only delete Hub decks that you published.";
  }

  return message;
};

const invokeElectron = async (invocation, fallbackMessage) => {
  try {
    return await invocation();
  } catch (error) {
    throw new Error(normalizeElectronErrorMessage(error?.message, fallbackMessage));
  }
};

const isElectronRuntime = () =>
  typeof navigator !== "undefined" &&
  typeof navigator.userAgent === "string" &&
  navigator.userAgent.includes("Electron");

const isDesktopMode = () =>
  Boolean(
    getElectronApi() &&
      typeof getElectronApi().pickImportDeckJson === "function" &&
      typeof getElectronApi().importDeckFromJson === "function" &&
      typeof getElectronApi().importDeckFromUrl === "function" &&
      typeof getElectronApi().exportDeckPackage === "function" &&
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

const normalizeRuntimeErrorPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const message = typeof payload.message === "string"
    ? payload.message.trim()
    : "";

  if (!message) {
    return null;
  }

  return {
    id:
      typeof payload.id === "string" && payload.id.trim()
        ? payload.id
        : `runtime-error-${Date.now()}`,
    title:
      typeof payload.title === "string" && payload.title.trim()
        ? payload.title
        : "Application Error",
    message,
    details:
      typeof payload.details === "string" ? payload.details : "",
    createdAt:
      typeof payload.createdAt === "string" ? payload.createdAt : "",
    source:
      typeof payload.source === "string" ? payload.source : "",
  };
};

const normalizeNavigationPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const to = typeof payload.to === "string" ? payload.to.trim() : "";

  if (!to) {
    return null;
  }

  return {
    to,
    source:
      typeof payload.source === "string" ? payload.source.trim() : "",
    settingsTab:
      typeof payload.settingsTab === "string"
        ? payload.settingsTab.trim()
        : "",
    highlightToken:
      Number.isFinite(Number(payload.highlightToken))
        ? Number(payload.highlightToken)
        : 0,
  };
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

    if (importFileRequestListeners.size === 0) {
      const hasSameRequest = pendingImportFileRequests.some(
        (request) => request?.filePath === normalizedPayload.filePath,
      );

      if (!hasSameRequest) {
        pendingImportFileRequests.push(normalizedPayload);
      }
    }

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

const initRuntimeErrorBridge = () => {
  if (isRuntimeErrorBridgeInitialized || !isDesktopMode()) {
    return;
  }

  const electronApi = getElectronApi();

  if (!electronApi || typeof electronApi.onRuntimeError !== "function") {
    return;
  }

  electronApi.onRuntimeError((payload) => {
    const normalizedPayload = normalizeRuntimeErrorPayload(payload);

    if (!normalizedPayload) {
      return;
    }

    runtimeErrorListeners.forEach((listener) => listener(normalizedPayload));
  });

  isRuntimeErrorBridgeInitialized = true;
};

const initNavigationBridge = () => {
  if (isNavigationBridgeInitialized || !isDesktopMode()) {
    return;
  }

  const electronApi = getElectronApi();

  if (!electronApi || typeof electronApi.onNavigateRequested !== "function") {
    return;
  }

  electronApi.onNavigateRequested((payload) => {
    const normalizedPayload = normalizeNavigationPayload(payload);

    if (!normalizedPayload) {
      return;
    }

    navigationRequestListeners.forEach((listener) => listener(normalizedPayload));
  });

  isNavigationBridgeInitialized = true;
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

const getFallbackSrsState = (deckId) => {
  const deckKey = String(deckId || FALLBACK_DECK_ID);

  if (!fallbackSrsStateByDeck.has(deckKey)) {
    fallbackSrsStateByDeck.set(deckKey, {
      index: 0,
      reviewedToday: 0,
    });
  }

  return fallbackSrsStateByDeck.get(deckKey);
};

const buildFallbackSrsCard = (word, index) => {
  if (!word) {
    return null;
  }

  return {
    wordId: Number(word?.id) || index + 1,
    source: word?.source || "",
    target: word?.target || "",
    tertiary: word?.tertiary || "",
    level: word?.level || "",
    part_of_speech: word?.part_of_speech || "",
    tags: Array.isArray(word?.tags) ? word.tags : [],
    examples: Array.isArray(word?.examples) ? word.examples : [],
    state: "new",
    queueType: "new",
    dueAt: null,
    intervalDays: 0,
    easeFactor: 2.5,
    reps: 0,
    lapses: 0,
    ratingPreview: {
      again: "10m",
      hard: "5m",
      good: "1d",
      easy: "3d",
    },
  };
};

const buildFallbackSrsSession = async (
  deckId,
  settings = {},
  options = {},
) => {
  const normalizedDeckId = String(deckId || FALLBACK_DECK_ID);
  const forceAllCards = Boolean(options?.forceAllCards);

  if (normalizedDeckId !== FALLBACK_DECK_ID) {
    return {
      deck: {
        id: normalizedDeckId,
        name: "Unknown deck",
      },
      card: null,
      stats: {
        dueLearning: 0,
        dueReview: 0,
        dueNew: 0,
        dueTotal: 0,
        reviewedToday: 0,
        newStudiedToday: 0,
        totalStudiedToday: 0,
      },
      limits: {
        newCardsPerDay: 20,
        maxReviewsPerDay: 100,
        newLeft: 0,
        reviewLeft: 0,
      },
      completionState: {
        done: true,
        reason: "empty-deck",
        canStartNewSession: false,
      },
    };
  }

  const words = await loadFallbackWords();
  const state = getFallbackSrsState(normalizedDeckId);
  const fallbackSrsSettings =
    settings?.spacedRepetition &&
    typeof settings.spacedRepetition === "object"
      ? settings.spacedRepetition
      : settings;
  const newCardsPerDay = Number(fallbackSrsSettings?.newCardsPerDay) || 20;
  const maxReviewsPerDay = Number(fallbackSrsSettings?.maxReviewsPerDay) || 100;
  const safeIndex = forceAllCards
    ? state.index % Math.max(1, words.length)
    : Math.max(0, Math.min(state.index, words.length));
  const cardWord = words[safeIndex] || null;

  return {
    deck: {
      id: normalizedDeckId,
      name: "Starter Deck",
    },
    sessionMode: forceAllCards ? "extended" : "default",
    card: buildFallbackSrsCard(cardWord, safeIndex),
    stats: {
      totalCards: words.length,
      dueLearning: 0,
      dueReview: 0,
      dueNew: Math.max(0, words.length - safeIndex),
      dueTotal: Math.max(0, words.length - safeIndex),
      reviewedToday: state.reviewedToday,
      newStudiedToday: state.reviewedToday,
      totalStudiedToday: state.reviewedToday,
    },
    limits: {
      newCardsPerDay,
      maxReviewsPerDay,
      newLeft: Math.max(0, newCardsPerDay - state.reviewedToday),
      reviewLeft: Math.max(0, maxReviewsPerDay - state.reviewedToday),
      isBypassed: forceAllCards,
    },
    completionState: {
      done: !cardWord,
      reason: cardWord ? "" : "empty-queue",
      canStartNewSession: words.length > 0 && !forceAllCards,
    },
  };
};

// No review history outside the desktop app: the starter words are shown
// as they are, all new, rather than with made-up numbers.
const buildFallbackProgressOverview = async () => {
  const words = await loadFallbackWords();
  const deck = { id: 1, name: "Starter Deck" };

  return buildProgressOverview({
    decks: words.length > 0 ? [deck] : [],
    words: words.map((word, index) => ({ id: index + 1, deckId: deck.id })),
  });
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
        usesWordLevels: true,
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
      usesWordLevels: true,
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

    return invokeElectron(
      () => getElectronApi().pickImportDeckJson(),
      "Failed to select import file",
    );
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
      return invokeElectron(
        () => getElectronApi().importDeckFromJson({ deckName: payloadOrDeckName }),
        "Failed to import deck",
      );
    }

    return invokeElectron(
      () => getElectronApi().importDeckFromJson(payloadOrDeckName || {}),
      "Failed to import deck",
    );
  },

  async importDeckFromUrl(payload = {}) {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Hub import is available only in desktop mode");
    }

    return invokeElectron(
      () => getElectronApi().importDeckFromUrl(payload || {}),
      "Failed to import deck",
    );
  },

  async exportDeckPackage(deckId, settings = {}) {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Deck export package is available only in desktop mode");
    }

    return invokeElectron(
      () =>
        getElectronApi().exportDeckPackage({
          deckId,
          settings: settings || {},
        }),
      "Failed to export deck package",
    );
  },

  async exportDeckToJson(deckId, settings = {}) {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Deck export is available only in desktop mode");
    }

    return invokeElectron(
      () =>
        getElectronApi().exportDeckToJson({
          deckId,
          settings: settings || {},
        }),
      "Failed to export deck",
    );
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

    return invokeElectron(
      () => getElectronApi().renameDeck({ deckId, name }),
      "Failed to rename deck",
    );
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

    return invokeElectron(
      () => getElectronApi().deleteDeck({ deckId }),
      "Failed to delete deck",
    );
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

    return invokeElectron(
      () => getElectronApi().saveDeck(payload || {}),
      "Failed to save deck",
    );
  },

  async getSrsSession(deckId, settings = {}, options = {}) {
    const forceAllCards = Boolean(options?.forceAllCards);

    if (
      isDesktopMode() &&
      typeof getElectronApi().getSrsSession === "function"
    ) {
      return getElectronApi().getSrsSession({
        deckId,
        settings,
        forceAllCards,
      });
    }

    return buildFallbackSrsSession(deckId, settings, {
      forceAllCards,
    });
  },

  async gradeSrsCard(payload = {}) {
    const forceAllCards = Boolean(payload?.forceAllCards);

    if (
      isDesktopMode() &&
      typeof getElectronApi().gradeSrsCard === "function"
    ) {
      return getElectronApi().gradeSrsCard({
        deckId: payload?.deckId,
        wordId: payload?.wordId,
        rating: payload?.rating,
        settings: payload?.settings || {},
        forceAllCards,
      });
    }

    const normalizedDeckId = String(payload?.deckId || FALLBACK_DECK_ID);
    const state = getFallbackSrsState(normalizedDeckId);

    state.index += 1;
    state.reviewedToday += 1;

    return buildFallbackSrsSession(
      normalizedDeckId,
      payload?.settings || {},
      { forceAllCards },
    );
  },

  async getProgressOverview() {
    if (
      isDesktopMode() &&
      typeof getElectronApi().getProgressOverview === "function"
    ) {
      return getElectronApi().getProgressOverview();
    }

    return buildFallbackProgressOverview();
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

  async showRuntimeErrorPreview() {
    if (
      !isDesktopMode() ||
      typeof getElectronApi().showRuntimeErrorPreview !== "function"
    ) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Runtime error preview is available only in desktop mode");
    }

    return getElectronApi().showRuntimeErrorPreview();
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

  acknowledgeImportDeckFileRequest(filePath) {
    initImportFileBridge();

    if (typeof filePath !== "string" || !filePath) {
      return;
    }

    const requestIndex = pendingImportFileRequests.findIndex(
      (request) => request?.filePath === filePath,
    );

    if (requestIndex < 0) {
      return;
    }

    pendingImportFileRequests.splice(requestIndex, 1);
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

  subscribeRuntimeErrors(callback) {
    if (!isDesktopMode() || typeof callback !== "function") {
      return () => {};
    }

    initRuntimeErrorBridge();
    runtimeErrorListeners.add(callback);

    return () => {
      runtimeErrorListeners.delete(callback);
    };
  },

  subscribeNavigationRequested(callback) {
    if (!isDesktopMode() || typeof callback !== "function") {
      return () => {};
    }

    initNavigationBridge();
    navigationRequestListeners.add(callback);

    return () => {
      navigationRequestListeners.delete(callback);
    };
  },
};
