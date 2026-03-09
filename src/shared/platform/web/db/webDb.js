const WEB_DB_NAME = "lioralang-web";
const WEB_DB_VERSION = 2;

export const WEB_DB_STORES = {
  decks: "decks",
  words: "words",
  reviewCards: "reviewCards",
  reviewLogs: "reviewLogs",
  settings: "settings",
  syncQueue: "syncQueue",
};

let webDbPromise = null;

const requestToPromise = (request) => {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error("IndexedDB request failed"));
    };
  });
};

const waitForTransaction = (transaction) => {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error || new Error("IndexedDB transaction failed"));
    };

    transaction.onabort = () => {
      reject(transaction.error || new Error("IndexedDB transaction aborted"));
    };
  });
};

const openWebDb = () => {
  if (webDbPromise) {
    return webDbPromise;
  }

  webDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available in this browser"));
      return;
    }

    const openRequest = indexedDB.open(WEB_DB_NAME, WEB_DB_VERSION);

    openRequest.onupgradeneeded = () => {
      const database = openRequest.result;

      if (!database.objectStoreNames.contains(WEB_DB_STORES.decks)) {
        const decksStore = database.createObjectStore(WEB_DB_STORES.decks, {
          keyPath: "id",
          autoIncrement: true,
        });

        decksStore.createIndex("nameKey", "nameKey", { unique: false });
        decksStore.createIndex("createdAtMs", "createdAtMs", { unique: false });
      }

      if (!database.objectStoreNames.contains(WEB_DB_STORES.words)) {
        const wordsStore = database.createObjectStore(WEB_DB_STORES.words, {
          keyPath: "id",
          autoIncrement: true,
        });

        wordsStore.createIndex("deckId", "deckId", { unique: false });
        wordsStore.createIndex("deckSourceKey", ["deckId", "sourceKey"], {
          unique: false,
        });
        wordsStore.createIndex("createdAtMs", "createdAtMs", { unique: false });
      }

      if (!database.objectStoreNames.contains(WEB_DB_STORES.reviewCards)) {
        const reviewCardsStore = database.createObjectStore(
          WEB_DB_STORES.reviewCards,
          {
            keyPath: "wordId",
          },
        );

        reviewCardsStore.createIndex("deckId", "deckId", { unique: false });
        reviewCardsStore.createIndex("deckStateDue", ["deckId", "state", "dueAtMs"], {
          unique: false,
        });
      }

      if (!database.objectStoreNames.contains(WEB_DB_STORES.reviewLogs)) {
        const reviewLogsStore = database.createObjectStore(
          WEB_DB_STORES.reviewLogs,
          {
            keyPath: "id",
            autoIncrement: true,
          },
        );

        reviewLogsStore.createIndex("deckId", "deckId", { unique: false });
        reviewLogsStore.createIndex("dayKey", "dayKey", { unique: false });
        reviewLogsStore.createIndex("deckDayKey", ["deckId", "dayKey"], {
          unique: false,
        });
        reviewLogsStore.createIndex("reviewedAtMs", "reviewedAtMs", {
          unique: false,
        });
      }

      if (!database.objectStoreNames.contains(WEB_DB_STORES.settings)) {
        database.createObjectStore(WEB_DB_STORES.settings, {
          keyPath: "key",
        });
      }

      if (!database.objectStoreNames.contains(WEB_DB_STORES.syncQueue)) {
        const syncQueueStore = database.createObjectStore(
          WEB_DB_STORES.syncQueue,
          {
            keyPath: "id",
            autoIncrement: true,
          },
        );

        syncQueueStore.createIndex("status", "status", { unique: false });
        syncQueueStore.createIndex("createdAtMs", "createdAtMs", { unique: false });
        syncQueueStore.createIndex("actionType", "actionType", { unique: false });
      }
    };

    openRequest.onsuccess = () => {
      const database = openRequest.result;

      database.onversionchange = () => {
        database.close();
        webDbPromise = null;
      };

      resolve(database);
    };

    openRequest.onerror = () => {
      reject(openRequest.error || new Error("Failed to open IndexedDB"));
    };
  }).catch((error) => {
    webDbPromise = null;
    throw error;
  });

  return webDbPromise;
};

const normalizeStoreNames = (storeNames) => {
  if (Array.isArray(storeNames)) {
    return storeNames;
  }

  return [storeNames];
};

const runTransaction = async (storeNames, mode, executor) => {
  const database = await openWebDb();
  const resolvedStoreNames = normalizeStoreNames(storeNames);
  const transaction = database.transaction(resolvedStoreNames, mode);

  const getStore = (storeName) => transaction.objectStore(storeName);
  const result = await executor({
    transaction,
    getStore,
  });

  await waitForTransaction(transaction);
  return result;
};

export const runReadonlyTransaction = async (storeNames, executor) => {
  return runTransaction(storeNames, "readonly", executor);
};

export const runReadwriteTransaction = async (storeNames, executor) => {
  return runTransaction(storeNames, "readwrite", executor);
};

export const idbRequest = requestToPromise;

export const toLocalDayKey = (value = Date.now()) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const closeWebDbConnection = async () => {
  if (!webDbPromise) {
    return;
  }

  const database = await webDbPromise;
  database.close();
  webDbPromise = null;
};
