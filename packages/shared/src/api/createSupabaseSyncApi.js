import {
  DECK_ORIGIN_KINDS,
  normalizeDeckOriginKind,
  normalizeDeckOriginRef,
  normalizeDeckSyncId,
} from "@shared/core/usecases/sync";
import { getSupabaseClient, hasSupabaseConfig } from "./supabaseClient";

const USER_LIBRARY_BUCKET = "user-library-decks";
const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 60;
const DEFAULT_PROGRESS_PULL_LIMIT = 500;

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

const normalizeDeckKindForSync = (originKind) => {
  const normalizedOriginKind = normalizeDeckOriginKind(originKind, DECK_ORIGIN_KINDS.local);

  if (normalizedOriginKind === DECK_ORIGIN_KINDS.hub) {
    return DECK_ORIGIN_KINDS.hub;
  }

  return DECK_ORIGIN_KINDS.account;
};

const ensureClient = () => {
  if (!hasSupabaseConfig()) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to .env.",
    );
  }

  const client = getSupabaseClient();

  if (!client) {
    throw new Error("Failed to initialize Supabase sync client");
  }

  return client;
};

const ensureAuthenticatedUser = async (client) => {
  const { data, error } = await client.auth.getUser();

  if (error) {
    throw new Error(error.message || "Failed to resolve sync account");
  }

  const user = data?.user || null;

  if (!user?.id) {
    throw new Error("Sign in to sync your library and progress.");
  }

  return user;
};

const groupVersionsByDeckId = (versions = []) => {
  return (Array.isArray(versions) ? versions : []).reduce((accumulator, version) => {
    const deckId = toCleanString(version?.library_deck_id || version?.libraryDeckId);

    if (!deckId) {
      return accumulator;
    }

    const currentVersions = accumulator.get(deckId) || [];
    currentVersions.push({
      id: toCleanString(version?.id),
      libraryDeckId: deckId,
      version: toPositiveInteger(version?.version, 0),
      filePath: toCleanString(version?.file_path || version?.filePath),
      fileFormat: toCleanString(version?.file_format || version?.fileFormat) || "lioradeck",
      fileSizeBytes: toPositiveInteger(version?.file_size_bytes || version?.fileSizeBytes, 0),
      checksumSha256: toCleanString(version?.checksum_sha256 || version?.checksumSha256),
      wordsCount: toPositiveInteger(version?.words_count || version?.wordsCount, 0),
      createdAt: toCleanString(version?.created_at || version?.createdAt),
    });
    accumulator.set(deckId, currentVersions);
    return accumulator;
  }, new Map());
};

const normalizeLibraryDeck = (deck, versionsByDeckId = new Map()) => {
  const deckId = toCleanString(deck?.id);
  const versions = [...(versionsByDeckId.get(deckId) || [])].sort(
    (left, right) => right.version - left.version,
  );

  return {
    id: deckId,
    syncId: normalizeDeckSyncId(deck?.sync_id || deck?.syncId),
    deckKind: normalizeDeckKindForSync(deck?.deck_kind || deck?.deckKind),
    hubDeckId: toCleanString(deck?.hub_deck_id || deck?.hubDeckId),
    title: toCleanString(deck?.title),
    description: toCleanString(deck?.description),
    sourceLanguage: toCleanString(deck?.source_language || deck?.sourceLanguage),
    targetLanguage: toCleanString(deck?.target_language || deck?.targetLanguage),
    tertiaryLanguage: toCleanString(deck?.tertiary_language || deck?.tertiaryLanguage),
    tags: Array.isArray(deck?.tags) ? deck.tags.filter((item) => typeof item === "string") : [],
    wordsCount: toPositiveInteger(deck?.words_count || deck?.wordsCount, 0),
    contentHash: toCleanString(deck?.content_hash || deck?.contentHash),
    latestVersion: toPositiveInteger(deck?.latest_version || deck?.latestVersion, 0),
    deletedAt: toCleanString(deck?.deleted_at || deck?.deletedAt),
    createdAt: toCleanString(deck?.created_at || deck?.createdAt),
    updatedAt: toCleanString(deck?.updated_at || deck?.updatedAt),
    latestPackage: versions[0] || null,
    versions,
  };
};

const uploadDeckPackage = async ({
  client,
  userId,
  syncId,
  version,
  packageObject,
}) => {
  const filePath = `${userId}/${syncId}/v${version}.lioradeck`;
  const payloadText = JSON.stringify(packageObject, null, 2);
  const fileSizeBytes = new TextEncoder().encode(payloadText).byteLength;
  const payloadBlob = new Blob([payloadText], {
    type: "application/json; charset=utf-8",
  });

  const { error } = await client.storage.from(USER_LIBRARY_BUCKET).upload(filePath, payloadBlob, {
    upsert: true,
    contentType: "application/json; charset=utf-8",
  });

  if (error) {
    throw new Error(error.message || "Failed to upload synced deck package");
  }

  return {
    filePath,
    fileSizeBytes,
  };
};

export const createSupabaseSyncApi = () => {
  return {
    isConfigured() {
      return hasSupabaseConfig();
    },

    async getCurrentUser() {
      const client = ensureClient();
      return ensureAuthenticatedUser(client);
    },

    async registerDevice({ deviceId, deviceName, platform, appVersion } = {}) {
      const client = ensureClient();
      const user = await ensureAuthenticatedUser(client);

      const payload = {
        user_id: user.id,
        device_id: toCleanString(deviceId).toLowerCase(),
        device_name: toCleanString(deviceName) || null,
        platform: toCleanString(platform) || null,
        app_version: toCleanString(appVersion) || null,
        last_seen_at: toIsoTimestamp(),
      };

      const { error } = await client
        .from("user_devices")
        .upsert(payload, {
          onConflict: "user_id,device_id",
          ignoreDuplicates: false,
        });

      if (error) {
        throw new Error(error.message || "Failed to register sync device");
      }

      return {
        userId: user.id,
        deviceId: payload.device_id,
      };
    },

    async listLibraryDecks() {
      const client = ensureClient();
      await ensureAuthenticatedUser(client);

      const { data: deckRows, error: decksError } = await client
        .from("user_library_decks")
        .select("*")
        .order("updated_at", { ascending: false });

      if (decksError) {
        throw new Error(decksError.message || "Failed to load synced library");
      }

      const deckIds = (Array.isArray(deckRows) ? deckRows : [])
        .map((deck) => toCleanString(deck?.id))
        .filter(Boolean);

      if (deckIds.length === 0) {
        return [];
      }

      const { data: versionRows, error: versionsError } = await client
        .from("user_library_deck_versions")
        .select("*")
        .in("library_deck_id", deckIds)
        .order("version", { ascending: false });

      if (versionsError) {
        throw new Error(versionsError.message || "Failed to load synced deck versions");
      }

      const versionsByDeckId = groupVersionsByDeckId(versionRows);

      return deckRows.map((deck) => normalizeLibraryDeck(deck, versionsByDeckId));
    },

    async upsertLibraryDeck({
      deck,
      words = [],
      packageObject,
      keepDeleted = false,
    } = {}) {
      const client = ensureClient();
      const user = await ensureAuthenticatedUser(client);
      const syncId = normalizeDeckSyncId(deck?.syncId || deck?.sync_id);

      if (!syncId) {
        throw new Error("Synced decks require a stable sync id");
      }

      const normalizedPackage = packageObject && typeof packageObject === "object"
        ? packageObject
        : {
            deck,
            words,
          };

      for (let attempt = 0; attempt < 3; attempt += 1) {
        const { data: existingDeck, error: existingDeckError } = await client
          .from("user_library_decks")
          .select("id, latest_version, content_hash")
          .eq("sync_id", syncId)
          .maybeSingle();

        if (existingDeckError) {
          throw new Error(existingDeckError.message || "Failed to inspect synced deck state");
        }

        const nextVersion = toPositiveInteger(existingDeck?.latest_version, 0) + 1;
        const uploadResult = await uploadDeckPackage({
          client,
          userId: user.id,
          syncId,
          version: nextVersion,
          packageObject: normalizedPackage,
        });

        const deckPayload = {
          user_id: user.id,
          sync_id: syncId,
          deck_kind: normalizeDeckKindForSync(deck?.originKind || deck?.origin_kind),
          hub_deck_id:
            normalizeDeckOriginKind(deck?.originKind || deck?.origin_kind) === DECK_ORIGIN_KINDS.hub
              ? normalizeDeckOriginRef(deck?.originRef || deck?.origin_ref) || null
              : null,
          title: toCleanString(deck?.name || deck?.title) || "Untitled deck",
          description: toCleanString(deck?.description) || null,
          source_language: toCleanString(deck?.sourceLanguage),
          target_language: toCleanString(deck?.targetLanguage),
          tertiary_language: toCleanString(deck?.tertiaryLanguage) || null,
          tags: Array.isArray(deck?.tags) ? deck.tags.filter((item) => typeof item === "string") : [],
          words_count: Array.isArray(words) ? words.length : toPositiveInteger(deck?.wordsCount, 0),
          content_hash: toCleanString(deck?.contentHash) || null,
          latest_version: nextVersion,
          deleted_at: keepDeleted ? toCleanString(deck?.deletedAt) || null : null,
        };

        const { data: upsertedDeck, error: upsertDeckError } = await client
          .from("user_library_decks")
          .upsert(deckPayload, {
            onConflict: "user_id,sync_id",
            ignoreDuplicates: false,
          })
          .select("id, latest_version")
          .single();

        if (upsertDeckError) {
          throw new Error(upsertDeckError.message || "Failed to update synced deck metadata");
        }

        const { error: insertVersionError } = await client
          .from("user_library_deck_versions")
          .insert({
            library_deck_id: upsertedDeck.id,
            version: nextVersion,
            file_path: uploadResult.filePath,
            file_format: "lioradeck",
            file_size_bytes: uploadResult.fileSizeBytes,
            checksum_sha256: toCleanString(normalizedPackage?.manifest?.checksumSha256) || null,
            words_count: Array.isArray(words) ? words.length : toPositiveInteger(deck?.wordsCount, 0),
          });

        if (!insertVersionError) {
          return {
            syncId,
            libraryDeckId: upsertedDeck.id,
            version: nextVersion,
            filePath: uploadResult.filePath,
          };
        }

        const message = toCleanString(insertVersionError.message).toLowerCase();

        if (message.includes("duplicate") || message.includes("unique")) {
          continue;
        }

        throw new Error(insertVersionError.message || "Failed to record synced deck version");
      }

      throw new Error("Failed to reserve a synced deck version after multiple retries");
    },

    async markLibraryDeckDeleted(syncId) {
      const client = ensureClient();
      await ensureAuthenticatedUser(client);

      const { error } = await client
        .from("user_library_decks")
        .update({
          deleted_at: toIsoTimestamp(),
        })
        .eq("sync_id", normalizeDeckSyncId(syncId));

      if (error) {
        throw new Error(error.message || "Failed to mark synced deck as deleted");
      }
    },

    async createLibraryDeckDownloadUrl(filePath, expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS) {
      const client = ensureClient();
      await ensureAuthenticatedUser(client);

      const normalizedFilePath = toCleanString(filePath);

      if (!normalizedFilePath) {
        throw new Error("Deck package path is missing");
      }

      const { data, error } = await client.storage
        .from(USER_LIBRARY_BUCKET)
        .createSignedUrl(normalizedFilePath, toPositiveInteger(expiresInSeconds, DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS));

      if (error) {
        throw new Error(error.message || "Failed to create synced deck download URL");
      }

      return toCleanString(data?.signedUrl);
    },

    async listProgressEvents({ sinceServerSeq = 0, limit = DEFAULT_PROGRESS_PULL_LIMIT } = {}) {
      const client = ensureClient();
      await ensureAuthenticatedUser(client);

      const safeSinceServerSeq = toPositiveInteger(sinceServerSeq, 0);
      const safeLimit = Math.min(Math.max(toPositiveInteger(limit, DEFAULT_PROGRESS_PULL_LIMIT), 1), 2000);

      const { data, error } = await client
        .from("progress_events")
        .select("*")
        .gt("server_seq", safeSinceServerSeq)
        .order("server_seq", { ascending: true })
        .limit(safeLimit);

      if (error) {
        throw new Error(error.message || "Failed to pull synced progress");
      }

      return (Array.isArray(data) ? data : []).map((item) => ({
        id: toCleanString(item?.id),
        opId: toCleanString(item?.op_id || item?.opId),
        deviceId: toCleanString(item?.device_id || item?.deviceId).toLowerCase(),
        deviceSeq: toPositiveInteger(item?.device_seq || item?.deviceSeq, 0),
        deckSyncId: normalizeDeckSyncId(item?.deck_sync_id || item?.deckSyncId),
        wordExternalId: toCleanString(item?.word_external_id || item?.wordExternalId),
        reviewedAt: toCleanString(item?.reviewed_at || item?.reviewedAt),
        rating: toCleanString(item?.rating),
        queueType: toCleanString(item?.queue_type || item?.queueType),
        payload: item?.payload_json && typeof item.payload_json === "object" ? item.payload_json : {},
        serverSeq: toPositiveInteger(item?.server_seq || item?.serverSeq, 0),
        createdAt: toCleanString(item?.created_at || item?.createdAt),
      }));
    },

    async pushProgressEvents(events = []) {
      const client = ensureClient();
      const user = await ensureAuthenticatedUser(client);
      const normalizedEvents = (Array.isArray(events) ? events : []).filter(Boolean);

      if (normalizedEvents.length === 0) {
        return [];
      }

      const payload = normalizedEvents.map((event) => ({
        user_id: user.id,
        op_id: toCleanString(event?.opId).toLowerCase(),
        device_id: toCleanString(event?.deviceId).toLowerCase(),
        device_seq: toPositiveInteger(event?.deviceSeq, 0),
        deck_sync_id: normalizeDeckSyncId(event?.deckSyncId),
        word_external_id: toCleanString(event?.wordExternalId),
        reviewed_at: toIsoTimestamp(event?.reviewedAt),
        rating: toCleanString(event?.rating),
        queue_type: toCleanString(event?.queueType),
        payload_json: event?.payload && typeof event.payload === "object" ? event.payload : {},
      }));

      const { data, error } = await client
        .from("progress_events")
        .upsert(payload, {
          onConflict: "user_id,op_id",
          ignoreDuplicates: false,
        })
        .select("op_id, server_seq, created_at");

      if (error) {
        throw new Error(error.message || "Failed to push progress events");
      }

      return (Array.isArray(data) ? data : []).map((item) => ({
        opId: toCleanString(item?.op_id || item?.opId).toLowerCase(),
        serverSeq: toPositiveInteger(item?.server_seq || item?.serverSeq, 0),
        createdAt: toCleanString(item?.created_at || item?.createdAt),
      }));
    },
  };
};
