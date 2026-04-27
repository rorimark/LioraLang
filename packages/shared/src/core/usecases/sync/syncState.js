import {
  GUEST_PROFILE_SCOPE,
  getUserIdFromProfileScope,
  normalizeProfileScope,
} from "./profileScope.js";

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
};

const toPositiveInteger = (value, fallback = 0) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.trunc(numericValue);
};

const normalizeDeckShadowEntry = (value = {}) => ({
  syncId: toCleanString(value?.syncId).toLowerCase(),
  lastSyncedContentHash: toCleanString(value?.lastSyncedContentHash),
  lastSyncedVersion: toPositiveInteger(value?.lastSyncedVersion, 0),
  lastSyncedAt: toCleanString(value?.lastSyncedAt),
  lastRemoteUpdatedAt: toCleanString(value?.lastRemoteUpdatedAt),
  deletedAt: toCleanString(value?.deletedAt),
  localForkCreatedAt: toCleanString(value?.localForkCreatedAt),
});

const normalizeDeckShadowBySyncId = (value = {}) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [rawSyncId, rawEntry]) => {
    const syncId = toCleanString(rawSyncId).toLowerCase();

    if (!syncId) {
      return accumulator;
    }

    accumulator[syncId] = normalizeDeckShadowEntry({
      ...rawEntry,
      syncId,
    });
    return accumulator;
  }, {});
};

const normalizeSyncIdList = (value = []) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((item) => toCleanString(item).toLowerCase())
      .filter(Boolean),
  )];
};

const normalizeProfileRuntimeState = (value = {}, profileScope = GUEST_PROFILE_SCOPE) => ({
  profileScope: normalizeProfileScope(profileScope),
  userId: getUserIdFromProfileScope(profileScope),
  lastDeviceSeq: toPositiveInteger(value?.lastDeviceSeq, 0),
  lastPulledProgressServerSeq: toPositiveInteger(value?.lastPulledProgressServerSeq, 0),
  lastSuccessfulSyncAt: toCleanString(value?.lastSuccessfulSyncAt),
  lastSuccessfulPushAt: toCleanString(value?.lastSuccessfulPushAt),
  lastSuccessfulPullAt: toCleanString(value?.lastSuccessfulPullAt),
  lastDeckScanAt: toCleanString(value?.lastDeckScanAt),
  lastErrorAt: toCleanString(value?.lastErrorAt),
  lastErrorMessage: toCleanString(value?.lastErrorMessage),
  autoResolvedConflictsCount: toPositiveInteger(value?.autoResolvedConflictsCount, 0),
  deckShadowBySyncId: normalizeDeckShadowBySyncId(value?.deckShadowBySyncId),
  knownRemoteSyncIds: normalizeSyncIdList(value?.knownRemoteSyncIds),
  removedLocalSyncIds: normalizeSyncIdList(value?.removedLocalSyncIds),
  pendingLibraryDeletionSyncIds: normalizeSyncIdList(value?.pendingLibraryDeletionSyncIds),
});

const normalizeProfilesMap = (value = {}) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value).reduce((accumulator, [rawProfileScope, rawState]) => {
    const profileScope = normalizeProfileScope(rawProfileScope);

    accumulator[profileScope] = normalizeProfileRuntimeState(rawState, profileScope);
    return accumulator;
  }, {});
};

export const DEFAULT_SYNC_PREFERENCES = Object.freeze({
  autoSync: true,
  syncOnLaunch: true,
  notifyOnError: true,
  keepLocalCopyOnConflict: true,
});

export const SYNC_RUNTIME_STATE_KEY = "syncRuntimeState";

export const normalizeSyncPreferences = (value = {}) => ({
  autoSync: toBoolean(value?.autoSync, DEFAULT_SYNC_PREFERENCES.autoSync),
  syncOnLaunch: toBoolean(value?.syncOnLaunch, DEFAULT_SYNC_PREFERENCES.syncOnLaunch),
  notifyOnError: toBoolean(value?.notifyOnError, DEFAULT_SYNC_PREFERENCES.notifyOnError),
  keepLocalCopyOnConflict: toBoolean(
    value?.keepLocalCopyOnConflict,
    DEFAULT_SYNC_PREFERENCES.keepLocalCopyOnConflict,
  ),
});

export const normalizeSyncRuntimeState = (value = {}) => ({
  deviceId: toCleanString(value?.deviceId).toLowerCase(),
  deviceName: toCleanString(value?.deviceName),
  platform: toCleanString(value?.platform),
  appVersion: toCleanString(value?.appVersion),
  activeProfileScope: normalizeProfileScope(value?.activeProfileScope),
  lastActivatedAt: toCleanString(value?.lastActivatedAt),
  lastSyncAttemptAt: toCleanString(value?.lastSyncAttemptAt),
  profiles: normalizeProfilesMap(value?.profiles),
  preferences: normalizeSyncPreferences(value?.preferences),
});

export const mergeSyncRuntimeState = (currentValue = {}, patch = {}) => {
  const current = normalizeSyncRuntimeState(currentValue);
  const next = {
    ...current,
    ...patch,
    profiles: {
      ...current.profiles,
      ...(patch?.profiles && typeof patch.profiles === "object" && !Array.isArray(patch.profiles)
        ? patch.profiles
        : {}),
    },
    preferences: normalizeSyncPreferences({
      ...current.preferences,
      ...(patch?.preferences && typeof patch.preferences === "object" ? patch.preferences : {}),
    }),
  };

  return normalizeSyncRuntimeState(next);
};

export const getProfileRuntimeState = (runtimeState = {}, profileScope = GUEST_PROFILE_SCOPE) => {
  const normalizedRuntimeState = normalizeSyncRuntimeState(runtimeState);
  const normalizedProfileScope = normalizeProfileScope(profileScope);

  return (
    normalizedRuntimeState.profiles[normalizedProfileScope] ||
    normalizeProfileRuntimeState({}, normalizedProfileScope)
  );
};
