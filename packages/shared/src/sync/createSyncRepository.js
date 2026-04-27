import { createSupabaseSyncApi } from "@shared/api";
import {
  buildUserProfileScope,
  createDeckSyncId,
  DEFAULT_SYNC_PREFERENCES,
  getProfileRuntimeState,
  GUEST_PROFILE_SCOPE,
  normalizeSyncPreferences,
} from "@shared/core/usecases/sync";
import {
  getDeckImportMetadata,
  normalizeWordsForImport,
  parseDeckPackageFileText,
  resolveImportConfig,
  validateDeckPackageObject,
} from "@shared/core/usecases/importExport";
import { normalizeAppPreferences } from "@shared/lib/appPreferences/appPreferences";

const SYNC_TICK_INTERVAL_MS = 90_000;
const ONLINE_RETRY_DEBOUNCE_MS = 1_200;

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

  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("offline") ||
    message.includes("load failed")
  );
};

const resolveSyncPreferencesFromSettings = (settings = {}) => {
  const appPreferences = normalizeAppPreferences(settings?.appPreferences || {});
  return normalizeSyncPreferences(appPreferences.sync || DEFAULT_SYNC_PREFERENCES);
};

const resolveProfileScope = (authSnapshot) => {
  const userId = toCleanString(authSnapshot?.user?.id);

  if (!userId) {
    return GUEST_PROFILE_SCOPE;
  }

  return buildUserProfileScope(userId);
};

const resolveLocalDeckName = (desiredName, existingDecks = [], excludedDeckId = null) => {
  const baseName = toCleanString(desiredName) || "Imported Deck";
  const existingKeys = new Set(
    (Array.isArray(existingDecks) ? existingDecks : [])
      .filter((deck) => Number(deck?.id) !== Number(excludedDeckId))
      .map((deck) => toCleanString(deck?.name || deck?.title).toLowerCase())
      .filter(Boolean),
  );

  if (!existingKeys.has(baseName.toLowerCase())) {
    return baseName;
  }

  let counter = 2;

  while (existingKeys.has(`${baseName} (${counter})`.toLowerCase())) {
    counter += 1;
  }

  return `${baseName} (${counter})`;
};

const buildDeckShadowBySyncId = (profileState) => {
  return profileState?.deckShadowBySyncId && typeof profileState.deckShadowBySyncId === "object"
    ? profileState.deckShadowBySyncId
    : {};
};

const toNormalizedSyncIdList = (value = []) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return [...new Set(
    value
      .map((item) => toCleanString(item).toLowerCase())
      .filter(Boolean),
  )];
};

const addSyncIdToList = (value = [], syncId = "") => {
  const normalizedSyncId = toCleanString(syncId).toLowerCase();

  if (!normalizedSyncId) {
    return toNormalizedSyncIdList(value);
  }

  return toNormalizedSyncIdList([...value, normalizedSyncId]);
};

const removeSyncIdFromList = (value = [], syncId = "") => {
  const normalizedSyncId = toCleanString(syncId).toLowerCase();

  if (!normalizedSyncId) {
    return toNormalizedSyncIdList(value);
  }

  return toNormalizedSyncIdList(
    (Array.isArray(value) ? value : []).filter(
      (item) => toCleanString(item).toLowerCase() !== normalizedSyncId,
    ),
  );
};

const buildStatus = (patch = {}) => ({
  configured: false,
  signedIn: false,
  autoSync: true,
  syncOnLaunch: true,
  notifyOnError: true,
  keepLocalCopyOnConflict: true,
  online: isBrowserOnline(),
  syncing: false,
  phase: "idle",
  deviceId: "",
  deviceName: "",
  accountEmail: "",
  profileScope: GUEST_PROFILE_SCOPE,
  pendingDeckChanges: 0,
  pendingProgressChanges: 0,
  lastSuccessfulSyncAt: "",
  lastSuccessfulPushAt: "",
  lastSuccessfulPullAt: "",
  lastErrorAt: "",
  lastErrorMessage: "",
  autoResolvedConflictsCount: 0,
  lastSummary: "",
  ...patch,
});

const downloadDeckPackageText = async (syncApi, filePath) => {
  const signedUrl = await syncApi.createLibraryDeckDownloadUrl(filePath);
  const response = await fetch(signedUrl, { method: "GET" });

  if (!response.ok) {
    throw new Error(`Failed to download synced deck package (${response.status})`);
  }

  return response.text();
};

const toSaveDeckPayloadFromPackage = ({
  parsedPackage,
  existingDeck,
  existingDecks,
  overrideName = "",
  originKind = "account",
  originRef = "",
}) => {
  const metadata = getDeckImportMetadata({
    parsedPackage,
    fileName: overrideName || parsedPackage?.deck?.name || "Imported Deck",
  });
  const importConfig = resolveImportConfig({
    parsedPackage,
    fallbackDeckName: overrideName || metadata.suggestedDeckName,
    payload: {
      deckName: overrideName || metadata.suggestedDeckName,
      sourceLanguage: metadata.sourceLanguage,
      targetLanguage: metadata.targetLanguage,
      tertiaryLanguage: metadata.tertiaryLanguage,
      syncId: metadata.syncId,
      originKind,
      originRef,
      contentHash: metadata.contentHash,
    },
  });
  const normalizedWords = normalizeWordsForImport({
    parsedPackage,
    sourceLanguage: importConfig.sourceLanguage,
    targetLanguage: importConfig.targetLanguage,
    tertiaryLanguage: importConfig.tertiaryLanguage,
    duplicateStrategy: importConfig.duplicateStrategy,
    includeExamples: importConfig.includeExamples,
    includeTags: importConfig.includeTags,
  });

  return {
    deckId: existingDeck?.id || undefined,
    name: resolveLocalDeckName(
      importConfig.deckName,
      existingDecks,
      existingDeck?.id || null,
    ),
    description: importConfig.description,
    sourceLanguage: importConfig.sourceLanguage,
    targetLanguage: importConfig.targetLanguage,
    tertiaryLanguage: importConfig.tertiaryLanguage,
    usesWordLevels: Boolean(parsedPackage?.deck?.usesWordLevels ?? true),
    tags: importConfig.tags,
    syncId: importConfig.syncId,
    originKind,
    originRef,
    words: normalizedWords.words,
  };
};

export const createSyncRepository = ({
  authRepository,
  deckRepository,
  settingsRepository,
  syncLocalRepository,
  appVersion = "",
  platform = "app",
  deviceName = "LioraLang",
} = {}) => {
  const syncApi = createSupabaseSyncApi();
  const subscribers = new Set();
  let status = buildStatus({
    configured: syncApi.isConfigured(),
  });
  let authSnapshot = null;
  let isInitialized = false;
  let syncTimerId = null;
  let scheduledSyncTimeoutId = null;
  let syncInFlightPromise = null;
  let rerunAfterCurrentSync = false;

  const notifySubscribers = () => {
    subscribers.forEach((listener) => {
      listener(status);
    });
  };

  const setStatus = (patch) => {
    status = buildStatus({
      ...status,
      ...patch,
    });
    notifySubscribers();
    return status;
  };

  const loadSyncPreferences = async () => {
    const settings = await settingsRepository.getAppSettings();
    return resolveSyncPreferencesFromSettings(settings);
  };

  const persistProfileState = async (profileScope, updater) => {
    const currentProfileState = await syncLocalRepository.getProfileState(profileScope);
    const nextProfileState = typeof updater === "function" ? updater(currentProfileState) : updater;
    await syncLocalRepository.setProfileState(profileScope, nextProfileState || {});
    return syncLocalRepository.getProfileState(profileScope);
  };

  const computePendingDeckChanges = async (profileScope) => {
    const [localDecks, profileState] = await Promise.all([
      deckRepository.listDecks(),
      syncLocalRepository.getProfileState(profileScope),
    ]);
    const shadowBySyncId = buildDeckShadowBySyncId(profileState);
    const pendingLibraryDeletionSyncIds = new Set(
      toNormalizedSyncIdList(profileState?.pendingLibraryDeletionSyncIds),
    );
    const localSyncIds = new Set();
    let pendingCount = 0;

    localDecks.forEach((deck) => {
      const syncId = toCleanString(deck?.syncId).toLowerCase();

      if (!syncId) {
        pendingCount += 1;
        return;
      }

      localSyncIds.add(syncId);
      const shadow = shadowBySyncId[syncId];

      if (!shadow || shadow.lastSyncedContentHash !== toCleanString(deck?.contentHash)) {
        pendingCount += 1;
      }
    });

    Object.entries(shadowBySyncId).forEach(([syncId, shadow]) => {
      if (
        !localSyncIds.has(syncId) &&
        !toCleanString(shadow?.deletedAt) &&
        pendingLibraryDeletionSyncIds.has(syncId)
      ) {
        pendingCount += 1;
      }
    });

    return pendingCount;
  };

  const computePendingProgressChanges = async (profileScope) => {
    const pendingEvents = await syncLocalRepository.listPendingProgressEvents(profileScope, 500);
    return pendingEvents.length;
  };

  const refreshIdleStatus = async () => {
    const preferences = await loadSyncPreferences();
    const profileScope = resolveProfileScope(authSnapshot);
    const runtimeState = await syncLocalRepository.ensureDeviceIdentity({
      platform,
      deviceName,
      appVersion,
    });
    const profileState = getProfileRuntimeState(runtimeState, profileScope);
    const [pendingDeckChanges, pendingProgressChanges] = await Promise.all([
      computePendingDeckChanges(profileScope),
      computePendingProgressChanges(profileScope),
    ]);

    setStatus({
      configured: syncApi.isConfigured(),
      signedIn: Boolean(authSnapshot?.isAuthenticated),
      accountEmail: toCleanString(authSnapshot?.email),
      profileScope,
      deviceId: toCleanString(runtimeState?.deviceId),
      deviceName: toCleanString(runtimeState?.deviceName),
      autoSync: preferences.autoSync,
      syncOnLaunch: preferences.syncOnLaunch,
      notifyOnError: preferences.notifyOnError,
      keepLocalCopyOnConflict: preferences.keepLocalCopyOnConflict,
      pendingDeckChanges,
      pendingProgressChanges,
      lastSuccessfulSyncAt: toCleanString(profileState?.lastSuccessfulSyncAt),
      lastSuccessfulPushAt: toCleanString(profileState?.lastSuccessfulPushAt),
      lastSuccessfulPullAt: toCleanString(profileState?.lastSuccessfulPullAt),
      lastErrorAt: toCleanString(profileState?.lastErrorAt),
      lastErrorMessage: toCleanString(profileState?.lastErrorMessage),
      autoResolvedConflictsCount: toPositiveInteger(profileState?.autoResolvedConflictsCount, 0),
      online: isBrowserOnline(),
    });
  };

  const createLocalConflictCopy = async (localDeck, existingDecks) => {
    const [deckDetails, deckWords] = await Promise.all([
      deckRepository.getDeckById(localDeck.id),
      deckRepository.getDeckWords(localDeck.id),
    ]);

    await deckRepository.saveDeck({
      name: resolveLocalDeckName(`${localDeck.name} (Local copy)`, existingDecks),
      description: deckDetails?.description || "",
      sourceLanguage: deckDetails?.sourceLanguage,
      targetLanguage: deckDetails?.targetLanguage,
      tertiaryLanguage: deckDetails?.tertiaryLanguage,
      usesWordLevels: Boolean(deckDetails?.usesWordLevels),
      tags: Array.isArray(deckDetails?.tags) ? deckDetails.tags : JSON.parse(deckDetails?.tagsJson || "[]"),
      syncId: createDeckSyncId(),
      originKind: "account",
      originRef: "",
      words: deckWords,
    });
  };

  const persistRemoteShadow = async ({
    profileScope,
    syncId,
    remoteDeck,
    deckShadowBySyncId = {},
    autoResolvedConflictsDelta = 0,
    removeLocalRemoval = false,
    removePendingLibraryDeletion = false,
  }) => {
    const safeShadowBySyncId =
      deckShadowBySyncId && typeof deckShadowBySyncId === "object"
        ? deckShadowBySyncId
        : {};

    await persistProfileState(profileScope, (currentProfileState) => ({
      ...currentProfileState,
      autoResolvedConflictsCount:
        toPositiveInteger(currentProfileState?.autoResolvedConflictsCount, 0) +
        autoResolvedConflictsDelta,
      removedLocalSyncIds: removeLocalRemoval
        ? removeSyncIdFromList(currentProfileState?.removedLocalSyncIds, syncId)
        : toNormalizedSyncIdList(currentProfileState?.removedLocalSyncIds),
      pendingLibraryDeletionSyncIds: removePendingLibraryDeletion
        ? removeSyncIdFromList(currentProfileState?.pendingLibraryDeletionSyncIds, syncId)
        : toNormalizedSyncIdList(currentProfileState?.pendingLibraryDeletionSyncIds),
      deckShadowBySyncId: {
        ...buildDeckShadowBySyncId(currentProfileState),
        [syncId]: {
          syncId,
          lastSyncedContentHash: toCleanString(remoteDeck?.contentHash),
          lastSyncedVersion: toPositiveInteger(remoteDeck?.latestVersion, 0),
          lastSyncedAt: toIsoTimestamp(),
          lastRemoteUpdatedAt: toCleanString(remoteDeck?.updatedAt),
          deletedAt: toCleanString(remoteDeck?.deletedAt),
          localForkCreatedAt:
            autoResolvedConflictsDelta > 0
              ? toIsoTimestamp()
              : toCleanString(safeShadowBySyncId[syncId]?.localForkCreatedAt),
        },
      },
    }));
  };

  const resolveDeckSnapshot = async (deckOrId) => {
    if (deckOrId && typeof deckOrId === "object" && Number(deckOrId?.id) > 0) {
      return deckOrId;
    }

    const deckId = Number(deckOrId);

    if (!Number.isInteger(deckId) || deckId <= 0) {
      throw new Error("Invalid deck id");
    }

    const deck = await deckRepository.getDeckById(deckId);

    if (!deck) {
      throw new Error("Deck not found");
    }

    return deck;
  };

  const applyRemoteDeckToLocal = async ({ remoteDeck, existingDeck, existingDecks }) => {
    const packageText = await downloadDeckPackageText(syncApi, remoteDeck?.latestPackage?.filePath);
    const parsedPackage = parseDeckPackageFileText(packageText);
    validateDeckPackageObject(parsedPackage);

    const savePayload = toSaveDeckPayloadFromPackage({
      parsedPackage,
      existingDeck,
      existingDecks,
      overrideName: remoteDeck.title,
      originKind: remoteDeck.deckKind,
      originRef: remoteDeck.hubDeckId,
    });

    return deckRepository.saveDeck(savePayload);
  };

  const pullRemoteDecks = async (profileScope) => {
    const [remoteDecks, localDecks, profileState] = await Promise.all([
      syncApi.listLibraryDecks(),
      deckRepository.listDecks(),
      syncLocalRepository.getProfileState(profileScope),
    ]);
    const previouslyKnownRemoteSyncIds = new Set(
      toNormalizedSyncIdList(profileState?.knownRemoteSyncIds),
    );
    const removedLocalSyncIds = new Set(
      toNormalizedSyncIdList(profileState?.removedLocalSyncIds),
    );
    const pendingLibraryDeletionSyncIds = new Set(
      toNormalizedSyncIdList(profileState?.pendingLibraryDeletionSyncIds),
    );
    const currentRemoteSyncIds = new Set();
    const shadowBySyncId = buildDeckShadowBySyncId(profileState);
    const localDeckBySyncId = new Map(
      localDecks
        .map((deck) => [toCleanString(deck?.syncId).toLowerCase(), deck])
        .filter(([syncId]) => Boolean(syncId)),
    );
    let autoResolvedConflicts = 0;

    for (const remoteDeck of remoteDecks) {
      const syncId = toCleanString(remoteDeck?.syncId).toLowerCase();

      if (!syncId) {
        continue;
      }

      currentRemoteSyncIds.add(syncId);

      const localDeck = localDeckBySyncId.get(syncId) || null;
      const shadow = shadowBySyncId[syncId] || null;
      const remoteDeleted = Boolean(toCleanString(remoteDeck?.deletedAt));
      const localChangedSinceShadow = Boolean(
        localDeck &&
          shadow?.lastSyncedContentHash &&
          toCleanString(localDeck?.contentHash) !== toCleanString(shadow?.lastSyncedContentHash),
      );
      const remoteChangedSinceShadow = Boolean(
        shadow?.lastSyncedVersion &&
          toPositiveInteger(remoteDeck?.latestVersion, 0) > toPositiveInteger(shadow?.lastSyncedVersion, 0),
      );
      const wasRemovedLocally = removedLocalSyncIds.has(syncId);
      const hasPendingLibraryDeletion = pendingLibraryDeletionSyncIds.has(syncId);
      const wasPreviouslyKnownRemoteDeck = previouslyKnownRemoteSyncIds.has(syncId);

      if (!localDeck) {
        if (remoteDeleted) {
          await persistRemoteShadow({
            profileScope,
            syncId,
            remoteDeck,
            deckShadowBySyncId: shadowBySyncId,
            removeLocalRemoval: true,
            removePendingLibraryDeletion: true,
          });
          continue;
        }

        if (wasRemovedLocally || hasPendingLibraryDeletion || wasPreviouslyKnownRemoteDeck) {
          await persistRemoteShadow({
            profileScope,
            syncId,
            remoteDeck,
            deckShadowBySyncId: shadowBySyncId,
          });
          continue;
        }

        if (!remoteDeleted && remoteDeck?.latestPackage?.filePath) {
          await applyRemoteDeckToLocal({
            remoteDeck,
            existingDeck: null,
            existingDecks: await deckRepository.listDecks(),
          });
        }

        await persistRemoteShadow({
          profileScope,
          syncId,
          remoteDeck,
          deckShadowBySyncId: shadowBySyncId,
        });
        continue;
      }

      if (!shadow && toCleanString(remoteDeck?.contentHash) === toCleanString(localDeck?.contentHash)) {
        await persistRemoteShadow({
          profileScope,
          syncId,
          remoteDeck,
          deckShadowBySyncId: shadowBySyncId,
          removeLocalRemoval: true,
          removePendingLibraryDeletion: true,
        });
        continue;
      }

      if (remoteDeleted) {
        if (localChangedSinceShadow) {
          await createLocalConflictCopy(localDeck, await deckRepository.listDecks());
          autoResolvedConflicts += 1;
        }

        await deckRepository.deleteDeck(localDeck.id);

        await persistRemoteShadow({
          profileScope,
          syncId,
          remoteDeck,
          deckShadowBySyncId: shadowBySyncId,
          autoResolvedConflictsDelta: localChangedSinceShadow ? 1 : 0,
          removeLocalRemoval: true,
          removePendingLibraryDeletion: true,
        });
        continue;
      }

      if (remoteChangedSinceShadow) {
        if (localChangedSinceShadow) {
          await createLocalConflictCopy(localDeck, await deckRepository.listDecks());
          autoResolvedConflicts += 1;
        }

        await applyRemoteDeckToLocal({
          remoteDeck,
          existingDeck: localDeck,
          existingDecks: await deckRepository.listDecks(),
        });
      }

      await persistRemoteShadow({
        profileScope,
        syncId,
        remoteDeck,
        deckShadowBySyncId: shadowBySyncId,
        autoResolvedConflictsDelta: localChangedSinceShadow && remoteChangedSinceShadow ? 1 : 0,
        removeLocalRemoval: true,
        removePendingLibraryDeletion: true,
      });
    }

    await persistProfileState(profileScope, (currentProfileState) => ({
      ...currentProfileState,
      knownRemoteSyncIds: [...currentRemoteSyncIds],
    }));

    return autoResolvedConflicts;
  };

  const pushLocalDecks = async (profileScope) => {
    const [localDecks, remoteDecks, profileState] = await Promise.all([
      deckRepository.listDecks(),
      syncApi.listLibraryDecks(),
      syncLocalRepository.getProfileState(profileScope),
    ]);
    const remoteDeckBySyncId = new Map(
      remoteDecks
        .map((deck) => [toCleanString(deck?.syncId).toLowerCase(), deck])
        .filter(([syncId]) => Boolean(syncId)),
    );
    const shadowBySyncId = buildDeckShadowBySyncId(profileState);
    const removedLocalSyncIds = new Set(
      toNormalizedSyncIdList(profileState?.removedLocalSyncIds),
    );
    const pendingLibraryDeletionSyncIds = new Set(
      toNormalizedSyncIdList(profileState?.pendingLibraryDeletionSyncIds),
    );
    const localDeckBySyncId = new Map(
      localDecks
        .map((deck) => [toCleanString(deck?.syncId).toLowerCase(), deck])
        .filter(([syncId]) => Boolean(syncId)),
    );
    let pushedCount = 0;

    for (const localDeck of localDecks) {
      const syncId = toCleanString(localDeck?.syncId).toLowerCase();

      if (!syncId) {
        continue;
      }

      if (pendingLibraryDeletionSyncIds.has(syncId)) {
        continue;
      }

      const shadow = shadowBySyncId[syncId] || null;

      if (shadow && toCleanString(shadow?.lastSyncedContentHash) === toCleanString(localDeck?.contentHash)) {
        continue;
      }

      const exportResult = await deckRepository.exportDeckPackage(localDeck.id, {
        includeExamples: true,
        includeTags: true,
      });
      const deckDetails = await deckRepository.getDeckById(localDeck.id);
      const deckWords = await deckRepository.getDeckWords(localDeck.id);
      const remoteResult = await syncApi.upsertLibraryDeck({
        deck: {
          ...deckDetails,
          syncId: localDeck.syncId,
          originKind: localDeck.originKind,
          originRef: localDeck.originRef,
          contentHash: localDeck.contentHash,
          wordsCount: localDeck.wordsCount,
          tags: JSON.parse(localDeck.tagsJson || "[]"),
        },
        words: deckWords,
        packageObject: exportResult.package,
      });

      pushedCount += 1;
      remoteDeckBySyncId.set(syncId, {
        ...(remoteDeckBySyncId.get(syncId) || {}),
        syncId,
        contentHash: localDeck.contentHash,
        latestVersion: remoteResult.version,
        updatedAt: toIsoTimestamp(),
      });

      await persistProfileState(profileScope, (currentProfileState) => ({
        ...currentProfileState,
        deckShadowBySyncId: {
          ...buildDeckShadowBySyncId(currentProfileState),
          [syncId]: {
            syncId,
            lastSyncedContentHash: toCleanString(localDeck?.contentHash),
            lastSyncedVersion: toPositiveInteger(remoteResult?.version, 0),
            lastSyncedAt: toIsoTimestamp(),
            lastRemoteUpdatedAt: toIsoTimestamp(),
            deletedAt: "",
          },
        },
      }));
    }

    for (const [syncId, shadow] of Object.entries(shadowBySyncId)) {
      if (localDeckBySyncId.has(syncId) || toCleanString(shadow?.deletedAt)) {
        continue;
      }

      if (removedLocalSyncIds.has(syncId)) {
        continue;
      }

      if (!pendingLibraryDeletionSyncIds.has(syncId)) {
        continue;
      }

      if (remoteDeckBySyncId.has(syncId)) {
        await syncApi.markLibraryDeckDeleted(syncId);
      }

      await persistProfileState(profileScope, (currentProfileState) => ({
        ...currentProfileState,
        pendingLibraryDeletionSyncIds: removeSyncIdFromList(
          currentProfileState?.pendingLibraryDeletionSyncIds,
          syncId,
        ),
        deckShadowBySyncId: {
          ...buildDeckShadowBySyncId(currentProfileState),
          [syncId]: {
            ...(buildDeckShadowBySyncId(currentProfileState)[syncId] || { syncId }),
            deletedAt: toIsoTimestamp(),
            lastSyncedAt: toIsoTimestamp(),
          },
        },
      }));
      pushedCount += 1;
    }

    return pushedCount;
  };

  const pullRemoteProgress = async (profileScope) => {
    const profileState = await syncLocalRepository.getProfileState(profileScope);
    const events = await syncApi.listProgressEvents({
      sinceServerSeq: profileState?.lastPulledProgressServerSeq || 0,
    });

    if (events.length === 0) {
      return {
        importedCount: 0,
        skippedCount: 0,
        missingCount: 0,
      };
    }

    const applyResult = await syncLocalRepository.applyRemoteProgressEvents(profileScope, events);

    if (applyResult.missingCount === 0) {
      const lastEvent = events[events.length - 1];
      await persistProfileState(profileScope, (currentProfileState) => ({
        ...currentProfileState,
        lastPulledProgressServerSeq: toPositiveInteger(lastEvent?.serverSeq, 0),
        lastSuccessfulPullAt: toIsoTimestamp(),
      }));
    }

    return applyResult;
  };

  const pushLocalProgress = async (profileScope) => {
    const pendingEvents = await syncLocalRepository.listPendingProgressEvents(profileScope, 500);

    if (pendingEvents.length === 0) {
      return 0;
    }

    const syncResults = await syncApi.pushProgressEvents(pendingEvents);
    await syncLocalRepository.markProgressEventsSynced(syncResults);
    await persistProfileState(profileScope, (currentProfileState) => ({
      ...currentProfileState,
      lastSuccessfulPushAt: toIsoTimestamp(),
    }));
    return syncResults.length;
  };

  const runSyncOnce = async (reason = "manual") => {
    const preferences = await loadSyncPreferences();
    const configured = syncApi.isConfigured();
    const signedIn = Boolean(authSnapshot?.isAuthenticated);
    const profileScope = resolveProfileScope(authSnapshot);

    setStatus({
      configured,
      signedIn,
      profileScope,
      autoSync: preferences.autoSync,
      syncOnLaunch: preferences.syncOnLaunch,
      notifyOnError: preferences.notifyOnError,
      keepLocalCopyOnConflict: preferences.keepLocalCopyOnConflict,
      online: isBrowserOnline(),
    });

    if (!configured || !signedIn) {
      await syncLocalRepository.activateProfile(profileScope);
      await refreshIdleStatus();
      return status;
    }

    if (!isBrowserOnline()) {
      await refreshIdleStatus();
      return status;
    }

    await syncLocalRepository.activateProfile(profileScope);
    const runtimeState = await syncLocalRepository.ensureDeviceIdentity({
      platform,
      deviceName,
      appVersion,
    });
    setStatus({
      syncing: true,
      phase: "registering",
      deviceId: toCleanString(runtimeState?.deviceId),
      deviceName: toCleanString(runtimeState?.deviceName),
      lastSummary: "Registering this device for sync…",
    });

    try {
      await syncApi.registerDevice({
        deviceId: runtimeState?.deviceId,
        deviceName: runtimeState?.deviceName,
        platform: runtimeState?.platform,
        appVersion: runtimeState?.appVersion,
      });

      setStatus({ phase: "pulling-decks", lastSummary: "Pulling remote deck changes…" });
      const autoResolvedConflicts = await pullRemoteDecks(profileScope);

      setStatus({ phase: "pulling-progress", lastSummary: "Pulling remote study progress…" });
      const pulledProgress = await pullRemoteProgress(profileScope);

      setStatus({ phase: "pushing-decks", lastSummary: "Pushing local deck changes…" });
      const pushedDecks = await pushLocalDecks(profileScope);

      setStatus({ phase: "pushing-progress", lastSummary: "Pushing local study progress…" });
      const pushedProgress = await pushLocalProgress(profileScope);

      await persistProfileState(profileScope, (currentProfileState) => ({
        ...currentProfileState,
        lastSuccessfulSyncAt: toIsoTimestamp(),
        lastErrorAt: "",
        lastErrorMessage: "",
        autoResolvedConflictsCount:
          toPositiveInteger(currentProfileState?.autoResolvedConflictsCount, 0) + autoResolvedConflicts,
      }));

      await refreshIdleStatus();
      setStatus({
        syncing: false,
        phase: "idle",
        lastSummary: `Synced ${pushedDecks} deck change${pushedDecks === 1 ? "" : "s"} and ${pushedProgress} progress event${pushedProgress === 1 ? "" : "s"}.`,
      });
      return {
        pushedDecks,
        pulledProgress,
        pushedProgress,
        autoResolvedConflicts,
        reason,
      };
    } catch (error) {
      const errorMessage = toCleanString(error?.message) || "Sync failed";
      await persistProfileState(profileScope, (currentProfileState) => ({
        ...currentProfileState,
        lastErrorAt: toIsoTimestamp(),
        lastErrorMessage: errorMessage,
      }));
      await refreshIdleStatus();
      setStatus({
        syncing: false,
        phase: isOfflineLikeError(error) ? "offline" : "error",
        lastErrorAt: toIsoTimestamp(),
        lastErrorMessage: errorMessage,
        lastSummary: errorMessage,
      });
      throw error;
    } finally {
      setStatus({ syncing: false });
    }
  };

  const scheduleSync = (reason = "background") => {
    if (typeof window === "undefined") {
      return;
    }

    if (scheduledSyncTimeoutId || syncInFlightPromise) {
      rerunAfterCurrentSync = true;
      return;
    }

    scheduledSyncTimeoutId = window.setTimeout(() => {
      scheduledSyncTimeoutId = null;
      void repository.runNow({ reason });
    }, ONLINE_RETRY_DEBOUNCE_MS);
  };

  const initLifecycle = () => {
    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("online", () => {
      setStatus({ online: true });
      scheduleSync("online");
    });
    window.addEventListener("offline", () => {
      setStatus({ online: false, phase: "offline" });
    });
    window.addEventListener("focus", () => {
      scheduleSync("focus");
    });

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        scheduleSync("visible");
      }
    });
  };

  const startTicker = async () => {
    const preferences = await loadSyncPreferences();

    if (!preferences.autoSync || syncTimerId || typeof window === "undefined") {
      return;
    }

    syncTimerId = window.setInterval(() => {
      scheduleSync("interval");
    }, SYNC_TICK_INTERVAL_MS);
  };

  const stopTicker = () => {
    if (syncTimerId && typeof window !== "undefined") {
      window.clearInterval(syncTimerId);
    }

    syncTimerId = null;
  };

  const bootstrap = async () => {
    if (isInitialized) {
      return;
    }

    isInitialized = true;
    authSnapshot = syncApi.isConfigured() ? await authRepository.getSnapshot().catch(() => null) : null;
    initLifecycle();
    await refreshIdleStatus();
    await startTicker();

    if (syncApi.isConfigured()) {
      authRepository.subscribe((nextSnapshot) => {
        authSnapshot = nextSnapshot || null;
        void refreshIdleStatus();
        scheduleSync("auth-change");
      });
    }

    const preferences = await loadSyncPreferences();

    if (preferences.autoSync && preferences.syncOnLaunch) {
      scheduleSync("launch");
    }
  };

  const repository = {
    isConfigured: () => syncApi.isConfigured(),
    async getStatus() {
      await bootstrap();
      return status;
    },
    subscribe(callback) {
      if (typeof callback !== "function") {
        return () => {};
      }

      subscribers.add(callback);
      callback(status);

      void bootstrap();

      return () => {
        subscribers.delete(callback);
      };
    },
    async runNow({ reason = "manual" } = {}) {
      await bootstrap();

      if (syncInFlightPromise) {
        rerunAfterCurrentSync = true;
        return syncInFlightPromise;
      }

      syncInFlightPromise = runSyncOnce(reason)
        .finally(async () => {
          syncInFlightPromise = null;

          if (rerunAfterCurrentSync) {
            rerunAfterCurrentSync = false;
            scheduleSync("rerun");
          }
        });

      return syncInFlightPromise;
    },
    async clearError() {
      await bootstrap();
      const profileScope = resolveProfileScope(authSnapshot);
      await persistProfileState(profileScope, (currentProfileState) => ({
        ...currentProfileState,
        lastErrorAt: "",
        lastErrorMessage: "",
      }));
      await refreshIdleStatus();
    },
    async updatePreferences(patch = {}) {
      const settings = await settingsRepository.getAppSettings();
      const appPreferences = normalizeAppPreferences(settings?.appPreferences || {});
      const nextSyncPreferences = normalizeSyncPreferences({
        ...appPreferences.sync,
        ...(patch && typeof patch === "object" ? patch : {}),
      });

      await settingsRepository.updateAppSettings({
        ...settings,
        appPreferences: {
          ...appPreferences,
          sync: nextSyncPreferences,
        },
      });

      if (!nextSyncPreferences.autoSync) {
        stopTicker();
      } else {
        await startTicker();
        scheduleSync("preferences");
      }

      await refreshIdleStatus();
      return nextSyncPreferences;
    },
    async removeDeckFromDevice(deckOrId) {
      await bootstrap();
      const deck = await resolveDeckSnapshot(deckOrId);
      const syncId = toCleanString(deck?.syncId).toLowerCase();

      if (!syncId || !status.configured || !status.signedIn) {
        await deckRepository.deleteDeck(deck.id);
        await refreshIdleStatus();
        return { queued: false };
      }

      const profileScope = resolveProfileScope(authSnapshot);
      const previousProfileState = await syncLocalRepository.getProfileState(profileScope);

      await persistProfileState(profileScope, (currentProfileState) => ({
        ...currentProfileState,
        removedLocalSyncIds: addSyncIdToList(currentProfileState?.removedLocalSyncIds, syncId),
        pendingLibraryDeletionSyncIds: removeSyncIdFromList(
          currentProfileState?.pendingLibraryDeletionSyncIds,
          syncId,
        ),
      }));

      try {
        await deckRepository.deleteDeck(deck.id);
      } catch (error) {
        await syncLocalRepository.setProfileState(profileScope, previousProfileState);
        throw error;
      }

      await refreshIdleStatus();
      return { queued: false };
    },
    async deleteDeckFromSyncedLibrary(deckOrId) {
      await bootstrap();

      if (!status.configured || !status.signedIn) {
        throw new Error("Sign in to delete this deck from your synced library");
      }

      const deck = await resolveDeckSnapshot(deckOrId);
      const syncId = toCleanString(deck?.syncId).toLowerCase();

      if (!syncId) {
        throw new Error("This deck is missing sync metadata");
      }

      const profileScope = resolveProfileScope(authSnapshot);
      const previousProfileState = await syncLocalRepository.getProfileState(profileScope);

      await persistProfileState(profileScope, (currentProfileState) => ({
        ...currentProfileState,
        removedLocalSyncIds: removeSyncIdFromList(currentProfileState?.removedLocalSyncIds, syncId),
        pendingLibraryDeletionSyncIds: addSyncIdToList(
          currentProfileState?.pendingLibraryDeletionSyncIds,
          syncId,
        ),
        knownRemoteSyncIds: addSyncIdToList(currentProfileState?.knownRemoteSyncIds, syncId),
      }));

      try {
        await deckRepository.deleteDeck(deck.id);
      } catch (error) {
        await syncLocalRepository.setProfileState(profileScope, previousProfileState);
        throw error;
      }

      await refreshIdleStatus();

      if (!isBrowserOnline()) {
        return { queued: true };
      }

      try {
        await repository.runNow({ reason: "delete-library" });
        return { queued: false };
      } catch (error) {
        if (isOfflineLikeError(error)) {
          return { queued: true };
        }

        throw error;
      }
    },
  };

  return repository;
};
