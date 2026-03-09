import {
  WEB_DB_STORES,
  idbRequest,
  runReadonlyTransaction,
  runReadwriteTransaction,
} from "@shared/platform/web/db";

const HUB_SYNC_ACTION_TYPES = {
  publishDeck: "hub.publishDeck",
  incrementDeckDownloads: "hub.incrementDeckDownloads",
};

const HUB_SYNC_PENDING_STATUS = "pending";
const HUB_SYNC_FAILED_STATUS = "failed";
const HUB_SYNC_FLUSH_DEBOUNCE_MS = 420;

let hubDecksApiPromise = null;

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const hasHubConfig = () => {
  const supabaseUrl = toCleanString(import.meta.env.VITE_SUPABASE_URL);
  const supabaseKey = toCleanString(import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY);

  return Boolean(supabaseUrl && supabaseKey);
};

const getHubDecksApi = async () => {
  if (hubDecksApiPromise) {
    return hubDecksApiPromise;
  }

  hubDecksApiPromise = import("@shared/api/hubDecksApi")
    .then((module) => module.hubDecksApi);

  return hubDecksApiPromise;
};

const isBrowserOnline = () => {
  if (typeof navigator === "undefined") {
    return true;
  }

  return navigator.onLine !== false;
};

const isOfflineLikeError = (error) => {
  if (!error) {
    return false;
  }

  if (!isBrowserOnline()) {
    return true;
  }

  const message = toCleanString(error?.message).toLowerCase();

  if (!message) {
    return false;
  }

  return (
    message.includes("networkerror") ||
    message.includes("failed to fetch") ||
    message.includes("network request failed") ||
    message.includes("load failed") ||
    message.includes("offline")
  );
};

const toPositiveInteger = (value, fallback = 0) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(numberValue));
};

const toQueuedRecord = (actionType, payload = {}) => {
  const nowMs = Date.now();

  return {
    actionType,
    payload,
    status: HUB_SYNC_PENDING_STATUS,
    attempts: 0,
    lastError: "",
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
};

const normalizeQueuedRecord = (value) => {
  const id = Number(value?.id);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return {
    id,
    actionType: toCleanString(value?.actionType),
    payload: value?.payload && typeof value.payload === "object" ? value.payload : {},
    status: toCleanString(value?.status) || HUB_SYNC_PENDING_STATUS,
    attempts: toPositiveInteger(value?.attempts, 0),
    createdAtMs: toPositiveInteger(value?.createdAtMs, 0),
    updatedAtMs: toPositiveInteger(value?.updatedAtMs, 0),
  };
};

const enqueueHubSyncAction = async (actionType, payload = {}) => {
  await runReadwriteTransaction(WEB_DB_STORES.syncQueue, async ({ getStore }) => {
    const syncQueueStore = getStore(WEB_DB_STORES.syncQueue);
    syncQueueStore.add(toQueuedRecord(actionType, payload));
  });
};

const listQueuedHubSyncActions = async () => {
  const queuedItems = await runReadonlyTransaction(
    WEB_DB_STORES.syncQueue,
    async ({ getStore }) => {
      return idbRequest(getStore(WEB_DB_STORES.syncQueue).getAll());
    },
  );

  return (Array.isArray(queuedItems) ? queuedItems : [])
    .map((item) => normalizeQueuedRecord(item))
    .filter(Boolean)
    .filter(
      (item) =>
        item.status === HUB_SYNC_PENDING_STATUS || item.status === HUB_SYNC_FAILED_STATUS,
    )
    .sort((left, right) => {
      if (left.createdAtMs === right.createdAtMs) {
        return left.id - right.id;
      }

      return left.createdAtMs - right.createdAtMs;
    });
};

const removeQueuedHubSyncAction = async (actionId) => {
  await runReadwriteTransaction(WEB_DB_STORES.syncQueue, async ({ getStore }) => {
    getStore(WEB_DB_STORES.syncQueue).delete(actionId);
  });
};

const markQueuedHubSyncActionFailed = async (record, error) => {
  await runReadwriteTransaction(WEB_DB_STORES.syncQueue, async ({ getStore }) => {
    const syncQueueStore = getStore(WEB_DB_STORES.syncQueue);

    syncQueueStore.put({
      ...record,
      status: HUB_SYNC_FAILED_STATUS,
      attempts: toPositiveInteger(record?.attempts, 0) + 1,
      lastError: toCleanString(error?.message),
      updatedAtMs: Date.now(),
    });
  });
};

const processQueuedHubSyncAction = async (hubDecksApi, record) => {
  if (record.actionType === HUB_SYNC_ACTION_TYPES.publishDeck) {
    await hubDecksApi.publishDeck(record.payload || {});
    return;
  }

  if (record.actionType === HUB_SYNC_ACTION_TYPES.incrementDeckDownloads) {
    const deckId = record?.payload?.deckId;
    const currentDownloadsCount = record?.payload?.currentDownloadsCount;

    await hubDecksApi.incrementDeckDownloads(deckId, currentDownloadsCount);
    return;
  }

  throw new Error(`Unsupported sync action: ${record.actionType}`);
};

const resolveOptimisticPublishResult = (payload = {}) => {
  const wordsCount = Array.isArray(payload?.deckPackage?.words)
    ? payload.deckPackage.words.length
    : 0;
  const title = toCleanString(payload?.deck?.name) || "Deck";

  return {
    queued: true,
    title,
    version: 0,
    wordsCount,
  };
};

const resolveOptimisticDownloadsResult = (currentDownloadsCount = 0) => {
  return {
    queued: true,
    count: toPositiveInteger(currentDownloadsCount, 0) + 1,
  };
};

export const createWebHubRepository = () => {
  let isFlushInProgress = false;
  let flushTimeoutId = null;
  let lifecycleBridgeInitialized = false;

  const flushQueuedHubActions = async () => {
    if (isFlushInProgress || !hasHubConfig() || !isBrowserOnline()) {
      return 0;
    }

    isFlushInProgress = true;

    try {
      const queuedActions = await listQueuedHubSyncActions();

      if (queuedActions.length === 0) {
        return 0;
      }

      const hubDecksApi = await getHubDecksApi();
      let processedActions = 0;

      for (const action of queuedActions) {
        try {
          await processQueuedHubSyncAction(hubDecksApi, action);
          await removeQueuedHubSyncAction(action.id);
          processedActions += 1;
        } catch (error) {
          await markQueuedHubSyncActionFailed(action, error);

          if (isOfflineLikeError(error)) {
            break;
          }
        }
      }

      return processedActions;
    } finally {
      isFlushInProgress = false;
    }
  };

  const scheduleFlushQueuedHubActions = () => {
    if (typeof window === "undefined" || flushTimeoutId) {
      return;
    }

    flushTimeoutId = window.setTimeout(() => {
      flushTimeoutId = null;
      void flushQueuedHubActions();
    }, HUB_SYNC_FLUSH_DEBOUNCE_MS);
  };

  const initLifecycleBridge = () => {
    if (lifecycleBridgeInitialized || typeof window === "undefined") {
      return;
    }

    window.addEventListener("online", scheduleFlushQueuedHubActions);
    window.addEventListener("focus", scheduleFlushQueuedHubActions);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        scheduleFlushQueuedHubActions();
      }
    });

    lifecycleBridgeInitialized = true;
    scheduleFlushQueuedHubActions();
  };

  initLifecycleBridge();

  return {
    isConfigured: () => hasHubConfig(),
    async listDecks(payload) {
      const hubDecksApi = await getHubDecksApi();
      scheduleFlushQueuedHubActions();
      return hubDecksApi.listDecks(payload);
    },
    async createDownloadUrl(filePath, expiresInSeconds) {
      const hubDecksApi = await getHubDecksApi();
      scheduleFlushQueuedHubActions();
      return hubDecksApi.createDownloadUrl(filePath, expiresInSeconds);
    },
    async publishDeck(payload = {}) {
      if (!isBrowserOnline()) {
        await enqueueHubSyncAction(HUB_SYNC_ACTION_TYPES.publishDeck, payload);
        scheduleFlushQueuedHubActions();
        return resolveOptimisticPublishResult(payload);
      }

      try {
        const hubDecksApi = await getHubDecksApi();
        const publishResult = await hubDecksApi.publishDeck(payload);
        scheduleFlushQueuedHubActions();
        return publishResult;
      } catch (error) {
        if (!isOfflineLikeError(error)) {
          throw error;
        }

        await enqueueHubSyncAction(HUB_SYNC_ACTION_TYPES.publishDeck, payload);
        scheduleFlushQueuedHubActions();
        return resolveOptimisticPublishResult(payload);
      }
    },
    async incrementDeckDownloads(deckId, currentDownloadsCount) {
      if (!isBrowserOnline()) {
        await enqueueHubSyncAction(HUB_SYNC_ACTION_TYPES.incrementDeckDownloads, {
          deckId,
          currentDownloadsCount,
        });
        scheduleFlushQueuedHubActions();
        return resolveOptimisticDownloadsResult(currentDownloadsCount);
      }

      try {
        const hubDecksApi = await getHubDecksApi();
        const nextCount = await hubDecksApi.incrementDeckDownloads(
          deckId,
          currentDownloadsCount,
        );
        scheduleFlushQueuedHubActions();

        return {
          queued: false,
          count: toPositiveInteger(nextCount, toPositiveInteger(currentDownloadsCount, 0)),
        };
      } catch (error) {
        if (!isOfflineLikeError(error)) {
          throw error;
        }

        await enqueueHubSyncAction(HUB_SYNC_ACTION_TYPES.incrementDeckDownloads, {
          deckId,
          currentDownloadsCount,
        });
        scheduleFlushQueuedHubActions();
        return resolveOptimisticDownloadsResult(currentDownloadsCount);
      }
    },
  };
};
