const FALLBACK_DECK_ID = "local-json";
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

const FALLBACK_DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const buildFallbackRecentDays = (daysCount) => {
  const safeCount = Number.isInteger(daysCount) && daysCount > 0 ? daysCount : 7;
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return Array.from({ length: safeCount }, (_, index) => {
    const offset = safeCount - 1 - index;
    const date = new Date(today.getTime() - offset * FALLBACK_DAY_MS);

    return {
      date: date.toISOString().slice(0, 10),
      label: FALLBACK_WEEKDAY_FORMATTER.format(date),
    };
  });
};

const clampFallbackPercent = (value) => {
  const safeValue = Number(value) || 0;
  return Math.max(0, Math.min(100, Number(safeValue.toFixed(1))));
};

const buildFallbackProgressOverview = async () => {
  const words = await loadFallbackWords();
  const fallbackState = getFallbackSrsState(FALLBACK_DECK_ID);
  const reviewedToday = Math.max(0, Number(fallbackState?.reviewedToday) || 0);
  const weeklyDays = buildFallbackRecentDays(7);
  const intensityDays = buildFallbackRecentDays(14);
  const weightedReviews = weeklyDays.map((_, index) => {
    if (reviewedToday === 0) {
      return 0;
    }

    const distanceFromToday = weeklyDays.length - 1 - index;
    const weight = Math.max(0.12, 1 - distanceFromToday * 0.14);
    return Math.round(reviewedToday * weight);
  });
  const weekly = weeklyDays.map((dayItem, index) => {
    const reviews = weightedReviews[index];
    const recall = reviews > 0 ? clampFallbackPercent(76 + index * 3.2) : 0;

    return {
      date: dayItem.date,
      label: dayItem.label,
      reviews,
      recall,
    };
  });
  const reviewed7d = weekly.reduce((total, dayItem) => total + dayItem.reviews, 0);
  const recall7d = reviewed7d > 0
    ? clampFallbackPercent(
      weekly.reduce((total, dayItem) => total + dayItem.recall, 0) / weekly.length,
    )
    : 0;
  const baseIntensity = intensityDays.map((dayItem, index) => {
    const weeklyIndex = index - (intensityDays.length - weekly.length);
    const reviews = weeklyIndex >= 0 ? weightedReviews[weeklyIndex] : 0;

    return {
      date: dayItem.date,
      label: dayItem.label,
      value: reviews,
    };
  });
  const matureCards = Math.floor(words.length * 0.35);
  const streakDays = reviewedToday > 0 ? 1 : 0;

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      reviewed7d,
      recall7d,
      streakDays,
      matureCards,
    },
    weekly,
    intensity: baseIntensity,
    deckLoad: [
      {
        id: FALLBACK_DECK_ID,
        name: "Starter Deck",
        cards: words.length,
        reviews7d: reviewed7d,
      },
    ],
    retentionSplit: [
      { label: "New Queue", value: clampFallbackPercent(recall7d - 8) },
      { label: "Learning Queue", value: clampFallbackPercent(recall7d - 3) },
      { label: "Review Queue", value: clampFallbackPercent(recall7d + 4) },
    ],
    milestones:
      words.length > 0
        ? [
          `Starter deck has ${words.length} cards`,
          reviewedToday > 0
            ? `You reviewed ${reviewedToday} cards today`
            : "Complete your first review to start progress tracking",
          "Desktop analytics becomes richer as you review more cards",
        ]
        : [
          "No local cards loaded yet",
          "Import or create a deck to unlock progress analytics",
        ],
    totals: {
      decks: words.length > 0 ? 1 : 0,
      words: words.length,
      reviews: reviewedToday,
    },
  };
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

  async exportDeckToJson(deckId, settings = {}) {
    if (!isDesktopMode()) {
      if (isElectronRuntime()) {
        throw new Error(
          "Desktop API is unavailable in this window. Restart the app.",
        );
      }

      throw new Error("Deck export is available only in desktop mode");
    }

    return getElectronApi().exportDeckToJson({
      deckId,
      settings: settings || {},
    });
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
