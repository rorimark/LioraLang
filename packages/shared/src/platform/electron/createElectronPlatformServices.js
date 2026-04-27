import {
  createSupabaseAuthRepository,
  getCurrentSupabaseAuthUser,
} from "@shared/api";
import { buildUserProfileScope, GUEST_PROFILE_SCOPE } from "@shared/core/usecases/sync";
import { createWebHubRepository } from "@shared/platform/web/model";
import { createSyncRepository } from "@shared/sync";
import { createElectronSyncLocalRepository } from "./createElectronSyncLocalRepository";

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
const updateStatusListeners = new Set();
let isImportFileBridgeInitialized = false;
let isAppSettingsBridgeInitialized = false;
let isRuntimeErrorBridgeInitialized = false;
let isNavigationBridgeInitialized = false;
let isUpdateStatusBridgeInitialized = false;

const ELECTRON_INVOKE_PREFIX = /^Error invoking remote method '[^']+':\s*/i;
const LEADING_ERROR_PREFIX = /^Error:\s*/i;

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

const normalizeElectronError = (error, fallback) => {
  const message = normalizeElectronErrorMessage(error?.message, fallback);
  const normalizedError = new Error(message);

  if (error?.stack) {
    normalizedError.stack = error.stack;
  }

  return normalizedError;
};

const invokeElectron = async (invocation, fallbackMessage) => {
  try {
    return await invocation();
  } catch (error) {
    throw normalizeElectronError(error, fallbackMessage);
  }
};

const ensureElectronApi = () => {
  const electronApi = getElectronApi();

  if (!electronApi) {
    throw new Error("Desktop API is unavailable in this window. Restart the app.");
  }

  return electronApi;
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

const resolveCurrentProfileScope = async () => {
  try {
    const user = await getCurrentSupabaseAuthUser();

    if (user?.id) {
      return buildUserProfileScope(user.id);
    }
  } catch {
    // Ignore auth lookup failures and fall back to guest mode.
  }

  return GUEST_PROFILE_SCOPE;
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

const initUpdateStatusBridge = () => {
  if (isUpdateStatusBridgeInitialized) {
    return;
  }

  const electronApi = getElectronApi();

  if (!electronApi || typeof electronApi.onUpdateStatus !== "function") {
    return;
  }

  electronApi.onUpdateStatus((payload) => {
    updateStatusListeners.forEach((listener) => listener(payload || {}));
  });

  isUpdateStatusBridgeInitialized = true;
};

const createDeckRepository = () => {
  return {
    listDecks: () => invokeElectron(() => ensureElectronApi().listDecks(), "Failed to load decks"),
    getDeckById: (deckId) =>
      invokeElectron(() => ensureElectronApi().getDeckById(deckId), "Failed to load deck"),
    getDeckWords: (deckId) =>
      invokeElectron(() => ensureElectronApi().getDeckWords(deckId), "Failed to load deck words"),
    pickImportDeckJson: () =>
      invokeElectron(
        () => ensureElectronApi().pickImportDeckJson(),
        "Failed to select import file",
      ),
    importDeckFromJson: (payloadOrDeckName = "") => {
      const payload = typeof payloadOrDeckName === "string"
        ? { deckName: payloadOrDeckName }
        : payloadOrDeckName || {};

      return invokeElectron(
        () => ensureElectronApi().importDeckFromJson(payload),
        "Failed to import deck",
      );
    },
    importDeckFromUrl: (payload = {}) =>
      invokeElectron(() => ensureElectronApi().importDeckFromUrl(payload), "Failed to import deck"),
    exportDeckPackage: (deckId, settings = {}) =>
      invokeElectron(
        () =>
          ensureElectronApi().exportDeckPackage({
            deckId,
            settings: settings || {},
          }),
        "Failed to export deck package",
      ),
    exportDeckToJson: (deckId, settings = {}) =>
      invokeElectron(
        () =>
          ensureElectronApi().exportDeckToJson({
            deckId,
            settings: settings || {},
          }),
        "Failed to export deck",
      ),
    renameDeck: (deckId, name) =>
      invokeElectron(() => ensureElectronApi().renameDeck({ deckId, name }), "Failed to rename deck"),
    deleteDeck: (deckId) =>
      invokeElectron(() => ensureElectronApi().deleteDeck({ deckId }), "Failed to delete deck"),
    saveDeck: (payload) =>
      invokeElectron(() => ensureElectronApi().saveDeck(payload || {}), "Failed to save deck"),
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

const createSrsRepository = () => {
  return {
    getSrsSession: async (deckId, settings, options) =>
      ensureElectronApi().getSrsSession({
        deckId,
        settings,
        forceAllCards: Boolean(options?.forceAllCards),
        profileScope: await resolveCurrentProfileScope(),
      }),
    gradeSrsCard: async (payload = {}) =>
      ensureElectronApi().gradeSrsCard({
        deckId: payload?.deckId,
        wordId: payload?.wordId,
        rating: payload?.rating,
        settings: payload?.settings || {},
        forceAllCards: Boolean(payload?.forceAllCards),
        profileScope: await resolveCurrentProfileScope(),
      }),
  };
};

const createProgressRepository = () => {
  return {
    getProgressOverview: async () =>
      ensureElectronApi().getProgressOverview({
        profileScope: await resolveCurrentProfileScope(),
      }),
  };
};

const createSystemRepository = () => {
  return {
    getDbPath: () => ensureElectronApi().getDbPath(),
    openDbFolder: () => ensureElectronApi().openDbFolder(),
    openDownloadsFolder: () => ensureElectronApi().openDownloadsFolder(),
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
    async getAppVersion() {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.getAppVersion !== "function") {
        return { version: null };
      }

      return electronApi.getAppVersion();
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
    async checkForUpdates() {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.checkForUpdates !== "function") {
        return {
          status: "disabled",
          message: "Updates are available only in the desktop app.",
        };
      }

      return electronApi.checkForUpdates();
    },
    async downloadUpdate() {
      const electronApi = getElectronApi();

      if (!electronApi || typeof electronApi.downloadUpdate !== "function") {
        return {
          status: "disabled",
          message: "Updates are available only in the desktop app.",
        };
      }

      return electronApi.downloadUpdate();
    },
    subscribeUpdateStatus(callback) {
      if (typeof callback !== "function") {
        return NOOP_UNSUBSCRIBE;
      }

      initUpdateStatusBridge();
      updateStatusListeners.add(callback);

      return () => {
        updateStatusListeners.delete(callback);
      };
    },
  };
};

export const createElectronPlatformServices = () => {
  const authRepository = createSupabaseAuthRepository();
  const deckRepository = createDeckRepository();
  const settingsRepository = createSettingsRepository();
  const runtimeGateway = createRuntimeGateway();
  const syncLocalRepository = createElectronSyncLocalRepository();

  return {
    authRepository,
    deckRepository,
    settingsRepository,
    hubRepository: createWebHubRepository(),
    srsRepository: createSrsRepository(),
    progressRepository: createProgressRepository(),
    syncRepository: createSyncRepository({
      authRepository,
      deckRepository,
      settingsRepository,
      syncLocalRepository,
      runtimeGateway,
      platform: "desktop",
      deviceName: "Desktop app",
    }),
    systemRepository: createSystemRepository(),
    runtimeGateway,
  };
};
