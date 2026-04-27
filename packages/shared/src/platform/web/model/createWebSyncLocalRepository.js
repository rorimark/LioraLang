import {
  createDeckSyncId,
  getProfileRuntimeState,
  GUEST_PROFILE_SCOPE,
  mergeSyncRuntimeState,
  normalizeProfileScope,
  normalizeSyncRuntimeState,
  SYNC_RUNTIME_STATE_KEY,
} from "@shared/core/usecases/sync";
import {
  WEB_DB_STORES,
  idbRequest,
  runReadonlyTransaction,
  runReadwriteTransaction,
  toLocalDayKey,
} from "@shared/platform/web/db";

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toPositiveInteger = (value, fallback = 0) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.trunc(numericValue);
};

const toIsoTimestamp = (value = Date.now()) => {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const readRuntimeStateRecord = async () => {
  const record = await runReadonlyTransaction(WEB_DB_STORES.settings, async ({ getStore }) => {
    return idbRequest(getStore(WEB_DB_STORES.settings).get(SYNC_RUNTIME_STATE_KEY));
  });

  return normalizeSyncRuntimeState(record?.value);
};

const writeRuntimeStateRecord = async (nextRuntimeState) => {
  const normalizedRuntimeState = normalizeSyncRuntimeState(nextRuntimeState);

  await runReadwriteTransaction(WEB_DB_STORES.settings, async ({ getStore }) => {
    getStore(WEB_DB_STORES.settings).put({
      key: SYNC_RUNTIME_STATE_KEY,
      value: normalizedRuntimeState,
      updatedAt: new Date().toISOString(),
    });
  });

  return normalizedRuntimeState;
};

const updateRuntimeStateRecord = async (patch) => {
  const currentRuntimeState = await readRuntimeStateRecord();
  const nextRuntimeState = mergeSyncRuntimeState(currentRuntimeState, patch);
  await writeRuntimeStateRecord(nextRuntimeState);
  return nextRuntimeState;
};

const getAllReviewLogs = async () => {
  return runReadonlyTransaction(WEB_DB_STORES.reviewLogs, async ({ getStore }) => {
    const rows = await idbRequest(getStore(WEB_DB_STORES.reviewLogs).getAll());
    return Array.isArray(rows) ? rows : [];
  });
};

const toReplayCardRecord = (logRecord, profileScope) => {
  const payload = logRecord?.payload && typeof logRecord.payload === "object" ? logRecord.payload : {};
  const nextCard = payload?.nextCard && typeof payload.nextCard === "object" ? payload.nextCard : null;
  const wordId = Number(logRecord?.wordId);
  const deckId = Number(logRecord?.deckId);

  if (!nextCard || !Number.isInteger(wordId) || wordId <= 0 || !Number.isInteger(deckId) || deckId <= 0) {
    return null;
  }

  const reviewedAtMs = toPositiveInteger(logRecord?.reviewedAtMs, Date.now());

  return {
    wordId,
    deckId,
    state: toCleanString(nextCard.state) || "new",
    learningStep: toPositiveInteger(nextCard.learningStep, 0),
    dueAt: toCleanString(nextCard.dueAt) || null,
    dueAtMs: nextCard?.dueAtMs == null ? null : toPositiveInteger(nextCard.dueAtMs, 0),
    intervalDays: toPositiveInteger(nextCard.intervalDays, 1),
    easeFactor: Number(nextCard?.easeFactor) || 2.5,
    reps: toPositiveInteger(nextCard?.reps, 0),
    lapses: toPositiveInteger(nextCard?.lapses, 0),
    lastReviewedAt: toCleanString(logRecord?.reviewedAt) || toIsoTimestamp(reviewedAtMs),
    profileScope,
    createdAtMs: toPositiveInteger(logRecord?.createdAtMs, reviewedAtMs),
    updatedAtMs: reviewedAtMs,
  };
};

const buildLatestReviewCardsForProfile = (profileScope, reviewLogs = []) => {
  const latestLogsByWordId = new Map();

  reviewLogs
    .filter((logRecord) => normalizeProfileScope(logRecord?.profileScope) === profileScope)
    .sort((left, right) => {
      const leftReviewedAtMs = toPositiveInteger(left?.reviewedAtMs, 0);
      const rightReviewedAtMs = toPositiveInteger(right?.reviewedAtMs, 0);

      if (leftReviewedAtMs !== rightReviewedAtMs) {
        return leftReviewedAtMs - rightReviewedAtMs;
      }

      return toPositiveInteger(left?.id, 0) - toPositiveInteger(right?.id, 0);
    })
    .forEach((logRecord) => {
      const wordId = Number(logRecord?.wordId);

      if (!Number.isInteger(wordId) || wordId <= 0) {
        return;
      }

      latestLogsByWordId.set(wordId, logRecord);
    });

  return [...latestLogsByWordId.values()]
    .map((logRecord) => toReplayCardRecord(logRecord, profileScope))
    .filter(Boolean);
};

const ensureDeviceIdentity = async ({
  platform = "web",
  deviceName = "Web browser",
  appVersion = "",
} = {}) => {
  const currentRuntimeState = await readRuntimeStateRecord();
  const normalizedDeviceId = toCleanString(currentRuntimeState.deviceId).toLowerCase();

  if (normalizedDeviceId) {
    const nextRuntimeState = await updateRuntimeStateRecord({
      deviceName,
      platform,
      appVersion,
    });

    return {
      deviceId: nextRuntimeState.deviceId,
      deviceName: nextRuntimeState.deviceName,
      platform: nextRuntimeState.platform,
      appVersion: nextRuntimeState.appVersion,
    };
  }

  const nextRuntimeState = await writeRuntimeStateRecord({
    ...currentRuntimeState,
    deviceId: createDeckSyncId(),
    deviceName,
    platform,
    appVersion,
  });

  return {
    deviceId: nextRuntimeState.deviceId,
    deviceName: nextRuntimeState.deviceName,
    platform: nextRuntimeState.platform,
    appVersion: nextRuntimeState.appVersion,
  };
};

const activateProfile = async (profileScope, options = {}) => {
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  const currentRuntimeState = await readRuntimeStateRecord();
  const force = Boolean(options?.force);

  if (
    !force &&
    currentRuntimeState.activeProfileScope === normalizedProfileScope &&
    currentRuntimeState.lastActivatedAt
  ) {
    return currentRuntimeState;
  }

  const reviewLogs = await getAllReviewLogs();
  const nextReviewCards = buildLatestReviewCardsForProfile(normalizedProfileScope, reviewLogs);

  await runReadwriteTransaction(
    [WEB_DB_STORES.reviewCards, WEB_DB_STORES.settings],
    async ({ getStore }) => {
      const reviewCardsStore = getStore(WEB_DB_STORES.reviewCards);
      const settingsStore = getStore(WEB_DB_STORES.settings);
      const existingCards = await idbRequest(reviewCardsStore.getAll());

      if (normalizedProfileScope === GUEST_PROFILE_SCOPE && nextReviewCards.length === 0) {
        (Array.isArray(existingCards) ? existingCards : []).forEach((card) => {
          reviewCardsStore.put({
            ...card,
            profileScope: GUEST_PROFILE_SCOPE,
          });
        });

        const nextRuntimeState = mergeSyncRuntimeState(currentRuntimeState, {
          activeProfileScope: normalizedProfileScope,
          lastActivatedAt: toIsoTimestamp(),
        });

        settingsStore.put({
          key: SYNC_RUNTIME_STATE_KEY,
          value: nextRuntimeState,
          updatedAt: new Date().toISOString(),
        });
        return;
      }

      (Array.isArray(existingCards) ? existingCards : []).forEach((card) => {
        reviewCardsStore.delete(card?.wordId);
      });

      nextReviewCards.forEach((card) => {
        reviewCardsStore.put(card);
      });

      const nextRuntimeState = mergeSyncRuntimeState(currentRuntimeState, {
        activeProfileScope: normalizedProfileScope,
        lastActivatedAt: toIsoTimestamp(),
      });

      settingsStore.put({
        key: SYNC_RUNTIME_STATE_KEY,
        value: nextRuntimeState,
        updatedAt: new Date().toISOString(),
      });
    },
  );

  return readRuntimeStateRecord();
};

const nextDeviceSequence = async (profileScope) => {
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  const currentRuntimeState = await readRuntimeStateRecord();
  const currentProfileState = getProfileRuntimeState(currentRuntimeState, normalizedProfileScope);
  const nextValue = currentProfileState.lastDeviceSeq + 1;

  await updateRuntimeStateRecord({
    profiles: {
      [normalizedProfileScope]: {
        ...currentProfileState,
        lastDeviceSeq: nextValue,
      },
    },
  });

  return nextValue;
};

export const createWebSyncLocalRepository = ({
  platform = "web",
  deviceName = "Web browser",
  appVersion = "",
} = {}) => {
  return {
    async ensureDeviceIdentity() {
      return ensureDeviceIdentity({ platform, deviceName, appVersion });
    },

    async getRuntimeState() {
      return readRuntimeStateRecord();
    },

    async updateRuntimeState(patch) {
      return updateRuntimeStateRecord(patch);
    },

    async getProfileState(profileScope) {
      const runtimeState = await readRuntimeStateRecord();
      return getProfileRuntimeState(runtimeState, profileScope);
    },

    async setProfileState(profileScope, patch = {}) {
      const normalizedProfileScope = normalizeProfileScope(profileScope);
      const runtimeState = await readRuntimeStateRecord();
      const currentProfileState = getProfileRuntimeState(runtimeState, normalizedProfileScope);

      return updateRuntimeStateRecord({
        profiles: {
          [normalizedProfileScope]: {
            ...currentProfileState,
            ...patch,
          },
        },
      });
    },

    async activateProfile(profileScope = GUEST_PROFILE_SCOPE, options = {}) {
      return activateProfile(profileScope, options);
    },

    async nextDeviceSequence(profileScope = GUEST_PROFILE_SCOPE) {
      return nextDeviceSequence(profileScope);
    },

    async listPendingProgressEvents(profileScope = GUEST_PROFILE_SCOPE, limit = 500) {
      const normalizedProfileScope = normalizeProfileScope(profileScope);
      const reviewLogs = await getAllReviewLogs();

      return reviewLogs
        .filter((logRecord) => normalizeProfileScope(logRecord?.profileScope) === normalizedProfileScope)
        .filter((logRecord) => toCleanString(logRecord?.opId))
        .filter((logRecord) => toCleanString(logRecord?.syncStatus) !== "synced")
        .sort((left, right) => {
          const leftReviewedAtMs = toPositiveInteger(left?.reviewedAtMs, 0);
          const rightReviewedAtMs = toPositiveInteger(right?.reviewedAtMs, 0);

          if (leftReviewedAtMs !== rightReviewedAtMs) {
            return leftReviewedAtMs - rightReviewedAtMs;
          }

          return toPositiveInteger(left?.id, 0) - toPositiveInteger(right?.id, 0);
        })
        .slice(0, Math.max(1, toPositiveInteger(limit, 500)))
        .map((logRecord) => ({
          id: toPositiveInteger(logRecord?.id, 0),
          opId: toCleanString(logRecord?.opId).toLowerCase(),
          deviceId: toCleanString(logRecord?.deviceId).toLowerCase(),
          deviceSeq: toPositiveInteger(logRecord?.deviceSeq, 0),
          deckSyncId: toCleanString(logRecord?.deckSyncId).toLowerCase(),
          wordExternalId: toCleanString(logRecord?.wordExternalId),
          reviewedAt: toCleanString(logRecord?.reviewedAt) || toIsoTimestamp(logRecord?.reviewedAtMs),
          rating: toCleanString(logRecord?.rating),
          queueType: toCleanString(logRecord?.queueType),
          payload: logRecord?.payload && typeof logRecord.payload === "object" ? logRecord.payload : {},
        }));
    },

    async markProgressEventsSynced(results = []) {
      const resultsByOpId = new Map(
        (Array.isArray(results) ? results : [])
          .map((item) => [toCleanString(item?.opId).toLowerCase(), item])
          .filter(([opId]) => Boolean(opId)),
      );

      if (resultsByOpId.size === 0) {
        return 0;
      }

      let updatedCount = 0;

      await runReadwriteTransaction(WEB_DB_STORES.reviewLogs, async ({ getStore }) => {
        const reviewLogsStore = getStore(WEB_DB_STORES.reviewLogs);
        const reviewLogs = await idbRequest(reviewLogsStore.getAll());

        (Array.isArray(reviewLogs) ? reviewLogs : []).forEach((logRecord) => {
          const opId = toCleanString(logRecord?.opId).toLowerCase();
          const syncResult = resultsByOpId.get(opId);

          if (!syncResult) {
            return;
          }

          updatedCount += 1;
          reviewLogsStore.put({
            ...logRecord,
            syncStatus: "synced",
            syncedAt: toIsoTimestamp(syncResult?.createdAt),
            serverSeq: toPositiveInteger(syncResult?.serverSeq, 0),
            updatedAtMs: Date.now(),
          });
        });
      });

      return updatedCount;
    },

    async applyRemoteProgressEvents(profileScope = GUEST_PROFILE_SCOPE, events = []) {
      const normalizedProfileScope = normalizeProfileScope(profileScope);
      const safeEvents = Array.isArray(events) ? events : [];

      if (safeEvents.length === 0) {
        return {
          importedCount: 0,
          skippedCount: 0,
          missingCount: 0,
        };
      }

      const result = {
        importedCount: 0,
        skippedCount: 0,
        missingCount: 0,
      };

      await runReadwriteTransaction(
        [WEB_DB_STORES.decks, WEB_DB_STORES.words, WEB_DB_STORES.reviewLogs],
        async ({ getStore }) => {
          const decksStore = getStore(WEB_DB_STORES.decks);
          const wordsStore = getStore(WEB_DB_STORES.words);
          const reviewLogsStore = getStore(WEB_DB_STORES.reviewLogs);
          const [decks, words, reviewLogs] = await Promise.all([
            idbRequest(decksStore.getAll()),
            idbRequest(wordsStore.getAll()),
            idbRequest(reviewLogsStore.getAll()),
          ]);

          const existingOpIds = new Set(
            (Array.isArray(reviewLogs) ? reviewLogs : [])
              .map((logRecord) => toCleanString(logRecord?.opId).toLowerCase())
              .filter(Boolean),
          );
          const deckIdBySyncId = new Map(
            (Array.isArray(decks) ? decks : [])
              .map((deck) => [toCleanString(deck?.syncId).toLowerCase(), Number(deck?.id)])
              .filter(([syncId, deckId]) => Boolean(syncId) && Number.isInteger(deckId) && deckId > 0),
          );
          const wordByCompositeKey = new Map(
            (Array.isArray(words) ? words : [])
              .map((word) => {
                const deckId = Number(word?.deckId);
                const externalId = toCleanString(word?.externalId);

                if (!Number.isInteger(deckId) || deckId <= 0 || !externalId) {
                  return null;
                }

                return [`${deckId}::${externalId}`, word];
              })
              .filter(Boolean),
          );

          safeEvents.forEach((event) => {
            const opId = toCleanString(event?.opId).toLowerCase();

            if (!opId) {
              result.skippedCount += 1;
              return;
            }

            if (existingOpIds.has(opId)) {
              result.skippedCount += 1;
              return;
            }

            const deckId = deckIdBySyncId.get(toCleanString(event?.deckSyncId).toLowerCase());

            if (!Number.isInteger(deckId) || deckId <= 0) {
              result.missingCount += 1;
              return;
            }

            const word = wordByCompositeKey.get(`${deckId}::${toCleanString(event?.wordExternalId)}`);

            if (!word?.id) {
              result.missingCount += 1;
              return;
            }

            reviewLogsStore.add({
              deckId,
              wordId: Number(word.id),
              reviewedAt: toCleanString(event?.reviewedAt) || toIsoTimestamp(),
              reviewedAtMs: toPositiveInteger(new Date(event?.reviewedAt).getTime(), Date.now()),
              rating: toCleanString(event?.rating),
              queueType: toCleanString(event?.queueType),
              dayKey: toLocalDayKey(event?.reviewedAt),
              wasCorrect: toCleanString(event?.rating) !== "again",
              prevState: toCleanString(event?.payload?.previousCard?.state),
              nextState: toCleanString(event?.payload?.nextCard?.state),
              prevIntervalDays: toPositiveInteger(event?.payload?.previousCard?.intervalDays, 0),
              nextIntervalDays: toPositiveInteger(event?.payload?.nextCard?.intervalDays, 0),
              prevEaseFactor: Number(event?.payload?.previousCard?.easeFactor) || 0,
              nextEaseFactor: Number(event?.payload?.nextCard?.easeFactor) || 0,
              profileScope: normalizedProfileScope,
              opId,
              deviceId: toCleanString(event?.deviceId).toLowerCase(),
              deviceSeq: toPositiveInteger(event?.deviceSeq, 0),
              deckSyncId: toCleanString(event?.deckSyncId).toLowerCase(),
              wordExternalId: toCleanString(event?.wordExternalId),
              payload: event?.payload && typeof event.payload === "object" ? event.payload : {},
              syncStatus: "synced",
              syncedAt: toIsoTimestamp(event?.createdAt || Date.now()),
              serverSeq: toPositiveInteger(event?.serverSeq, 0),
              createdAtMs: Date.now(),
              updatedAtMs: Date.now(),
            });
            existingOpIds.add(opId);
            result.importedCount += 1;
          });
        },
      );

      if (result.importedCount > 0) {
        await activateProfile(normalizedProfileScope, { force: true });
      }

      return result;
    },
  };
};
