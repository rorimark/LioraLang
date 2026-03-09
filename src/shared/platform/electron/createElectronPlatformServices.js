const NOOP_UNSUBSCRIBE = () => {};
const DEFAULT_HISTORY_STATE = {
  canGoBack: false,
  canGoForward: false,
};

const pendingImportFileRequests = [];
const importFileRequestListeners = new Set();
const appSettingsUpdatedListeners = new Set();
const runtimeErrorListeners = new Set();
const navigationRequestListeners = new Set();
let isImportFileBridgeInitialized = false;
let isAppSettingsBridgeInitialized = false;
let isRuntimeErrorBridgeInitialized = false;
let isNavigationBridgeInitialized = false;

const resolveHubConfig = () => {
  const supabaseUrl = typeof import.meta.env.VITE_SUPABASE_URL === "string"
    ? import.meta.env.VITE_SUPABASE_URL.trim()
    : "";
  const supabaseKey = typeof import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY === "string"
    ? import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY.trim()
    : "";

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  return {
    url: supabaseUrl,
    publishableKey: supabaseKey,
  };
};

const hasHubConfig = () => Boolean(resolveHubConfig());

const getElectronApi = () =>
  typeof window !== "undefined" ? window.electronAPI : undefined;

const ensureElectronApi = () => {
  const electronApi = getElectronApi();

  if (!electronApi) {
    throw new Error("Desktop API is unavailable in this window. Restart the app.");
  }

  return electronApi;
};

const ensureHubConfig = () => {
  const hubConfig = resolveHubConfig();

  if (!hubConfig) {
    throw new Error(
      "LLH is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to .env.",
    );
  }

  return hubConfig;
};

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
  if (isImportFileBridgeInitialized) {
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
  if (isAppSettingsBridgeInitialized) {
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
  if (isRuntimeErrorBridgeInitialized) {
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
  if (isNavigationBridgeInitialized) {
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

const createDeckRepository = () => {
  return {
    listDecks: () => ensureElectronApi().listDecks(),
    getDeckById: (deckId) => ensureElectronApi().getDeckById(deckId),
    getDeckWords: (deckId) => ensureElectronApi().getDeckWords(deckId),
    pickImportDeckJson: () => ensureElectronApi().pickImportDeckJson(),
    importDeckFromJson: (payloadOrDeckName = "") => {
      const payload = typeof payloadOrDeckName === "string"
        ? { deckName: payloadOrDeckName }
        : payloadOrDeckName || {};

      return ensureElectronApi().importDeckFromJson(payload);
    },
    importDeckFromUrl: (payload = {}) => ensureElectronApi().importDeckFromUrl(payload),
    exportDeckPackage: (deckId, settings = {}) =>
      ensureElectronApi().exportDeckPackage({
        deckId,
        settings: settings || {},
      }),
    exportDeckToJson: (deckId, settings = {}) =>
      ensureElectronApi().exportDeckToJson({
        deckId,
        settings: settings || {},
      }),
    renameDeck: (deckId, name) => ensureElectronApi().renameDeck({ deckId, name }),
    deleteDeck: (deckId) => ensureElectronApi().deleteDeck({ deckId }),
    saveDeck: (payload) => ensureElectronApi().saveDeck(payload || {}),
    subscribeDecksUpdated(callback) {
      const electronApi = getElectronApi();

      if (!electronApi || typeof callback !== "function") {
        return NOOP_UNSUBSCRIBE;
      }

      return electronApi.onDecksUpdated(callback);
    },
  };
};

const createSettingsRepository = () => {
  return {
    async getAppSettings() {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.getAppSettings !== "function") {
        return {};
      }

      return electronApi.getAppSettings();
    },
    async updateAppSettings(settings) {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.updateAppSettings !== "function") {
        return {};
      }

      return electronApi.updateAppSettings({
        settings: settings || {},
      });
    },
    subscribeAppSettingsUpdated(callback) {
      if (typeof callback !== "function") {
        return NOOP_UNSUBSCRIBE;
      }

      initAppSettingsBridge();
      appSettingsUpdatedListeners.add(callback);

      return () => {
        appSettingsUpdatedListeners.delete(callback);
      };
    },
  };
};

const createHubRepository = () => {
  return {
    isConfigured: () => hasHubConfig(),
    async listDecks(payload) {
      const hubConfig = ensureHubConfig();
      return ensureElectronApi().hubListDecks({
        config: hubConfig,
        ...(payload || {}),
      });
    },
    async createDownloadUrl(filePath, expiresInSeconds) {
      const hubConfig = ensureHubConfig();
      return ensureElectronApi().hubCreateDownloadUrl({
        config: hubConfig,
        filePath,
        expiresInSeconds,
      });
    },
    async publishDeck(payload) {
      const hubConfig = ensureHubConfig();
      return ensureElectronApi().hubPublishDeck({
        config: hubConfig,
        ...(payload || {}),
      });
    },
    async incrementDeckDownloads(deckId, currentDownloadsCount) {
      const hubConfig = ensureHubConfig();
      return ensureElectronApi().hubIncrementDeckDownloads({
        config: hubConfig,
        deckId,
        currentDownloadsCount,
      });
    },
  };
};

const createSrsRepository = () => {
  return {
    getSrsSession: (deckId, settings, options) =>
      ensureElectronApi().getSrsSession({
        deckId,
        settings,
        forceAllCards: Boolean(options?.forceAllCards),
      }),
    gradeSrsCard: (payload = {}) =>
      ensureElectronApi().gradeSrsCard({
        deckId: payload?.deckId,
        wordId: payload?.wordId,
        rating: payload?.rating,
        settings: payload?.settings || {},
        forceAllCards: Boolean(payload?.forceAllCards),
      }),
  };
};

const createProgressRepository = () => {
  return {
    getProgressOverview: () => ensureElectronApi().getProgressOverview(),
  };
};

const createSystemRepository = () => {
  return {
    getDbPath: () => ensureElectronApi().getDbPath(),
    openDbFolder: () => ensureElectronApi().openDbFolder(),
    changeDbLocation: () => ensureElectronApi().changeDbLocation(),
    verifyIntegrity: (options = {}) =>
      ensureElectronApi().verifyIntegrity({
        repair: Boolean(options?.repair),
      }),
  };
};

const createRuntimeGateway = () => {
  return {
    isDesktopMode: () => Boolean(getElectronApi()),
    async getWindowHistoryState() {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.getWindowHistoryState !== "function") {
        return DEFAULT_HISTORY_STATE;
      }

      return electronApi.getWindowHistoryState();
    },
    async navigateWindowBack() {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.navigateWindowBack !== "function") {
        return DEFAULT_HISTORY_STATE;
      }

      return electronApi.navigateWindowBack();
    },
    async navigateWindowForward() {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.navigateWindowForward !== "function") {
        return DEFAULT_HISTORY_STATE;
      }

      return electronApi.navigateWindowForward();
    },
    async applyWindowTheme(theme) {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.applyWindowTheme !== "function") {
        return { applied: false };
      }

      return electronApi.applyWindowTheme({ theme });
    },
    hasPendingImportDeckFileRequest() {
      initImportFileBridge();
      return pendingImportFileRequests.length > 0;
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
    subscribeImportDeckFileRequested(callback) {
      if (typeof callback !== "function") {
        return NOOP_UNSUBSCRIBE;
      }

      initImportFileBridge();
      importFileRequestListeners.add(callback);

      return () => {
        importFileRequestListeners.delete(callback);
      };
    },
    subscribeRuntimeErrors(callback) {
      if (typeof callback !== "function") {
        return NOOP_UNSUBSCRIBE;
      }

      initRuntimeErrorBridge();
      runtimeErrorListeners.add(callback);

      return () => {
        runtimeErrorListeners.delete(callback);
      };
    },
    subscribeNavigationRequested(callback) {
      if (typeof callback !== "function") {
        return NOOP_UNSUBSCRIBE;
      }

      initNavigationBridge();
      navigationRequestListeners.add(callback);

      return () => {
        navigationRequestListeners.delete(callback);
      };
    },
  };
};

export const createElectronPlatformServices = () => {
  return {
    deckRepository: createDeckRepository(),
    settingsRepository: createSettingsRepository(),
    hubRepository: createHubRepository(),
    srsRepository: createSrsRepository(),
    progressRepository: createProgressRepository(),
    systemRepository: createSystemRepository(),
    runtimeGateway: createRuntimeGateway(),
  };
};
