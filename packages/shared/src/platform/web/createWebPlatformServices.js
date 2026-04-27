/* global __APP_VERSION__ */
import { createSupabaseAuthRepository } from "@shared/api";
import { createSyncRepository } from "@shared/sync";
import {
  createWebDeckRepository,
  createWebHubRepository,
  createWebSettingsRepository,
  createWebSyncLocalRepository,
} from "./model";

const NOOP_UNSUBSCRIBE = () => {};
const createLazySrsRepository = () => {
  let repositoryPromise = null;

  const getRepository = async () => {
    if (!repositoryPromise) {
      repositoryPromise = import("./model/srs")
        .then((module) => module.createWebSrsRepository());
    }

    return repositoryPromise;
  };

  return {
    async getSrsSession(deckId, settings, options) {
      const repository = await getRepository();
      return repository.getSrsSession(deckId, settings, options);
    },
    async gradeSrsCard(payload) {
      const repository = await getRepository();
      return repository.gradeSrsCard(payload);
    },
  };
};

const createLazyProgressRepository = () => {
  let repositoryPromise = null;

  const getRepository = async () => {
    if (!repositoryPromise) {
      repositoryPromise = import("./model/progress")
        .then((module) => module.createWebProgressRepository());
    }

    return repositoryPromise;
  };

  return {
    async getProgressOverview() {
      const repository = await getRepository();
      return repository.getProgressOverview();
    },
  };
};

const createSystemRepository = () => {
  return {
    async getDbPath() {
      return "Web mode uses IndexedDB in browser storage";
    },
    async openDbFolder() {
      throw new Error("Open DB folder is available only in desktop mode");
    },
    async openDownloadsFolder() {
      throw new Error("Downloads folder is available only in desktop mode");
    },
    async changeDbLocation() {
      throw new Error("Database location is available only in desktop mode");
    },
    async verifyIntegrity() {
      throw new Error("Integrity check is available only in desktop mode");
    },
  };
};

const createRuntimeGateway = () => {
  return {
    isDesktopMode: () => false,
    getWindowHistoryState: async () => ({
      canGoBack: false,
      canGoForward: false,
    }),
    navigateWindowBack: async () => ({
      canGoBack: false,
      canGoForward: false,
    }),
    navigateWindowForward: async () => ({
      canGoBack: false,
      canGoForward: false,
    }),
    applyWindowTheme: async () => ({ applied: false }),
    getAppVersion: async () => ({
      version: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : null,
    }),
    checkForUpdates: async () => ({
      status: "disabled",
      message: "Updates are available only in the desktop app.",
    }),
    downloadUpdate: async () => ({
      status: "disabled",
      message: "Updates are available only in the desktop app.",
    }),
    hasPendingImportDeckFileRequest: () => false,
    consumePendingImportDeckFileRequest: () => null,
    acknowledgeImportDeckFileRequest: () => {},
    subscribeImportDeckFileRequested: () => NOOP_UNSUBSCRIBE,
    subscribeRuntimeErrors: () => NOOP_UNSUBSCRIBE,
    subscribeNavigationRequested: () => NOOP_UNSUBSCRIBE,
    subscribeUpdateStatus: () => NOOP_UNSUBSCRIBE,
  };
};

export const createWebPlatformServices = () => {
  const authRepository = createSupabaseAuthRepository();
  const deckRepository = createWebDeckRepository();
  const settingsRepository = createWebSettingsRepository();
  const runtimeGateway = createRuntimeGateway();
  const syncLocalRepository = createWebSyncLocalRepository({
    platform: "web",
    deviceName: "Web browser",
    appVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "",
  });

  return {
    authRepository,
    deckRepository,
    settingsRepository,
    hubRepository: createWebHubRepository(),
    srsRepository: createLazySrsRepository(),
    progressRepository: createLazyProgressRepository(),
    syncRepository: createSyncRepository({
      authRepository,
      deckRepository,
      settingsRepository,
      syncLocalRepository,
      runtimeGateway,
      platform: "web",
      deviceName: "Web browser",
      appVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "",
    }),
    systemRepository: createSystemRepository(),
    runtimeGateway,
  };
};
