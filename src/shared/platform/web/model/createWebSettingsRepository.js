import {
  WEB_DB_STORES,
  idbRequest,
  runReadonlyTransaction,
  runReadwriteTransaction,
} from "@shared/platform/web/db";

const EMPTY_UNSUBSCRIBE = () => {};
const APP_SETTINGS_RECORD_KEY = "appSettings";

const toSettingsObject = (value) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value;
};

const readAppSettingsRecord = async () => {
  return runReadonlyTransaction(WEB_DB_STORES.settings, async ({ getStore }) => {
    return idbRequest(getStore(WEB_DB_STORES.settings).get(APP_SETTINGS_RECORD_KEY));
  });
};

const writeAppSettingsRecord = async (settings) => {
  return runReadwriteTransaction(WEB_DB_STORES.settings, async ({ getStore }) => {
    getStore(WEB_DB_STORES.settings).put({
      key: APP_SETTINGS_RECORD_KEY,
      value: settings,
      updatedAt: new Date().toISOString(),
    });
  });
};

export const createWebSettingsRepository = () => {
  const subscribers = new Set();

  const notifySubscribers = (settings) => {
    subscribers.forEach((listener) => {
      listener(settings);
    });
  };

  const getAppSettings = async () => {
    const record = await readAppSettingsRecord();
    return toSettingsObject(record?.value);
  };

  const updateAppSettings = async (settings = {}) => {
    const currentSettings = await getAppSettings();
    const nextSettings = {
      ...currentSettings,
      ...toSettingsObject(settings),
    };

    await writeAppSettingsRecord(nextSettings);
    notifySubscribers(nextSettings);

    return nextSettings;
  };

  return {
    getAppSettings,
    updateAppSettings,

    subscribeAppSettingsUpdated(callback) {
      if (typeof callback !== "function") {
        return EMPTY_UNSUBSCRIBE;
      }

      subscribers.add(callback);

      return () => {
        subscribers.delete(callback);
      };
    },
  };
};
