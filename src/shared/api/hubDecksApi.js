import { getSupabaseClient, hasSupabaseConfig } from "./supabaseClient";
import {
  buildDeckSlug,
  HUB_DOWNLOADS_RPC_NAME,
  isInvalidHubFilePath,
  isRpcMissingError,
  normalizeTextArray,
  resolveDownloadsCountFromRpcData,
  resolveExistingDeckByTitle,
  sanitizeFileName,
  toCleanString,
  toCountNumber,
  toHubDeck,
  toPublishableDeck,
  validatePublishableDeck,
} from "@shared/core/usecases/hub";
import { validateDeckPackageObject } from "@shared/core/usecases/importExport";

const HUB_STORAGE_BUCKET = "decks";
const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 120;
const MAX_HUB_PACKAGE_BYTES = 50 * 1024 * 1024;

const isAnonymousUser = (user) => {
  if (!user || typeof user !== "object") {
    return false;
  }

  if (user.is_anonymous) {
    return true;
  }

  const appMetadata =
    user.app_metadata && typeof user.app_metadata === "object"
      ? user.app_metadata
      : {};

  return toCleanString(appMetadata.provider) === "anonymous";
};

const isUserEmailVerified = (user) => {
  if (!user || typeof user !== "object") {
    return false;
  }

  if (user.email_confirmed_at || user.confirmed_at || user.confirmedAt) {
    return true;
  }

  if (Array.isArray(user.identities)) {
    return user.identities.some((identity) => toCleanString(identity?.provider) !== "email");
  }

  return false;
};

const ensureAuthenticatedSession = async (supabaseClient) => {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || "Failed to resolve account session");
  }

  const user = sessionData?.session?.user || null;

  if (!user?.id || isAnonymousUser(user)) {
    throw new Error("Sign in on the Account page to manage LioraLangHub decks.");
  }

  return user;
};

const ensureVerifiedOwnerSession = async (supabaseClient) => {
  const user = await ensureAuthenticatedSession(supabaseClient);

  if (!isUserEmailVerified(user)) {
    throw new Error("Verify your email before publishing or managing Hub decks.");
  }

  return user;
};

const sha256Hex = async (value) => {
  const bytes = value instanceof Uint8Array ? value : new TextEncoder().encode(String(value));

  if (!globalThis?.crypto?.subtle?.digest) {
    return String(bytes.length);
  }

  const digestBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digestBuffer))
    .map((valueByte) => valueByte.toString(16).padStart(2, "0"))
    .join("");
};

const createHubDeckId = () => {
  if (globalThis?.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  throw new Error("Secure UUID generation is unavailable in this browser.");
};

const ensureSupabaseClient = () => {
  if (!hasSupabaseConfig()) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to .env.",
    );
  }

  const supabaseClient = getSupabaseClient();

  if (!supabaseClient) {
    throw new Error("Failed to initialize Supabase client");
  }

  return supabaseClient;
};

export const hubDecksApi = {
  isConfigured() {
    return hasSupabaseConfig();
  },

  async listDecks({ page = 1, pageSize = 8, search = "" } = {}) {
    const supabase = ensureSupabaseClient();
    const normalizedPage = Number.isInteger(Number(page))
      ? Math.max(1, Number(page))
      : 1;
    const normalizedPageSize = Number.isInteger(Number(pageSize))
      ? Math.min(Math.max(1, Number(pageSize)), 50)
      : 8;
    const normalizedSearch = typeof search === "string" ? search.trim() : "";
    const from = (normalizedPage - 1) * normalizedPageSize;
    const to = from + normalizedPageSize - 1;

    let decksQuery = supabase
      .from("hub_decks")
      .select(
        "id,slug,title,description,source_language,target_languages,tags,words_count,downloads_count,created_at",
        { count: "exact" },
      )
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (normalizedSearch) {
      decksQuery = decksQuery.ilike("title", `%${normalizedSearch}%`);
    }

    const { data: decks, error: decksError, count } = await decksQuery;

    if (decksError) {
      throw new Error(decksError.message || "Failed to load Hub decks");
    }

    const deckList = Array.isArray(decks) ? decks : [];
    const deckIds = deckList
      .map((deck) => (deck?.id ? String(deck.id) : ""))
      .filter(Boolean);

    if (deckIds.length === 0) {
      return {
        items: [],
        total: Number.isFinite(Number(count)) ? Number(count) : 0,
        page: normalizedPage,
        pageSize: normalizedPageSize,
      };
    }

    const { data: versions, error: versionsError } = await supabase
      .from("hub_deck_versions")
      .select("deck_id,version,file_path,file_format,file_size_bytes,created_at")
      .in("deck_id", deckIds)
      .order("version", { ascending: false });

    if (versionsError) {
      throw new Error(versionsError.message || "Failed to load Hub deck versions");
    }

    const latestVersionByDeckId = new Map();

    (Array.isArray(versions) ? versions : []).forEach((version) => {
      const deckId = String(version?.deck_id || "");

      if (!deckId || latestVersionByDeckId.has(deckId)) {
        return;
      }

      latestVersionByDeckId.set(deckId, version);
    });

    return {
      items: deckList.map((deck) =>
        toHubDeck(deck, latestVersionByDeckId.get(String(deck?.id || "")), normalizeTextArray),
      ),
      total: Number.isFinite(Number(count)) ? Number(count) : 0,
      page: normalizedPage,
      pageSize: normalizedPageSize,
    };
  },

  async getDeckBySlug(slug) {
    const supabase = ensureSupabaseClient();
    const normalizedSlug = toCleanString(slug).toLowerCase();

    if (!normalizedSlug) {
      throw new Error("Hub deck slug is required");
    }

    const { data: deck, error: deckError } = await supabase
      .from("hub_decks")
      .select(
        "id,slug,title,description,source_language,target_languages,tags,words_count,downloads_count,created_at",
      )
      .eq("slug", normalizedSlug)
      .eq("is_published", true)
      .single();

    if (deckError) {
      throw new Error(deckError.message || "Failed to load Hub deck");
    }

    const { data: versions, error: versionsError } = await supabase
      .from("hub_deck_versions")
      .select("deck_id,version,file_path,file_format,file_size_bytes,created_at")
      .eq("deck_id", deck?.id)
      .order("version", { ascending: false })
      .limit(1);

    if (versionsError) {
      throw new Error(versionsError.message || "Failed to load Hub deck versions");
    }

    const latestVersion = Array.isArray(versions) ? versions[0] : null;

    return toHubDeck(deck, latestVersion, normalizeTextArray);
  },

  async listOwnDecks() {
    const supabase = ensureSupabaseClient();
    const user = await ensureAuthenticatedSession(supabase);

    const { data: decks, error: decksError } = await supabase
      .from("hub_decks")
      .select(
        "id,slug,title,description,source_language,target_languages,tags,words_count,downloads_count,created_at",
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (decksError) {
      throw new Error(decksError.message || "Failed to load your Hub decks");
    }

    const deckList = Array.isArray(decks) ? decks : [];
    const deckIds = deckList
      .map((deck) => (deck?.id ? String(deck.id) : ""))
      .filter(Boolean);

    if (deckIds.length === 0) {
      return [];
    }

    const { data: versions, error: versionsError } = await supabase
      .from("hub_deck_versions")
      .select("deck_id,version,file_path,file_format,file_size_bytes,created_at")
      .in("deck_id", deckIds)
      .order("version", { ascending: false });

    if (versionsError) {
      throw new Error(versionsError.message || "Failed to load your Hub deck versions");
    }

    const latestVersionByDeckId = new Map();

    (Array.isArray(versions) ? versions : []).forEach((version) => {
      const deckId = String(version?.deck_id || "");

      if (!deckId || latestVersionByDeckId.has(deckId)) {
        return;
      }

      latestVersionByDeckId.set(deckId, version);
    });

    return deckList.map((deck) =>
      toHubDeck(deck, latestVersionByDeckId.get(String(deck?.id || "")), normalizeTextArray),
    );
  },

  async createDownloadUrl(filePath, expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS) {
    const supabase = ensureSupabaseClient();
    const normalizedFilePath = toCleanString(filePath);

    if (!normalizedFilePath) {
      throw new Error("Hub deck file path is required");
    }

    if (isInvalidHubFilePath(normalizedFilePath)) {
      throw new Error("Hub deck file path is invalid");
    }

    const { data, error } = await supabase.storage
      .from(HUB_STORAGE_BUCKET)
      .createSignedUrl(normalizedFilePath, Math.max(30, Number(expiresInSeconds) || 120));

    if (error || !data?.signedUrl) {
      throw new Error(error?.message || "Failed to generate deck download link");
    }

    return data.signedUrl;
  },

  async incrementDeckDownloads(deckId, currentDownloadsCount = 0) {
    const supabase = ensureSupabaseClient();
    const normalizedDeckId =
      typeof deckId === "string" ? deckId.trim() : String(deckId || "").trim();

    if (!normalizedDeckId) {
      throw new Error("Hub deck id is required to update downloads");
    }

    const fallbackCurrentDownloads = toCountNumber(currentDownloadsCount, 0);
    const fallbackNextDownloads = fallbackCurrentDownloads + 1;
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      HUB_DOWNLOADS_RPC_NAME,
      {
        p_deck_id: normalizedDeckId,
      },
    );

    if (!rpcError) {
      return resolveDownloadsCountFromRpcData(rpcData, fallbackNextDownloads);
    }

    if (!isRpcMissingError(rpcError)) {
      throw new Error(rpcError.message || "Failed to update deck downloads");
    }

    const { data: updateData, error: updateError } = await supabase
      .from("hub_decks")
      .update({
        downloads_count: fallbackNextDownloads,
      })
      .eq("id", normalizedDeckId)
      .eq("is_published", true)
      .select("downloads_count")
      .single();

    if (updateError) {
      throw new Error(
        "Downloads counter is not configured. Add RPC increment_hub_deck_downloads in Supabase.",
      );
    }

    return toCountNumber(updateData?.downloads_count, fallbackNextDownloads);
  },

  async publishDeck({
    deck,
    deckPackage,
  } = {}) {
    const supabase = ensureSupabaseClient();
    const user = await ensureVerifiedOwnerSession(supabase);
    const publishableDeck = toPublishableDeck(deck);
    validatePublishableDeck(publishableDeck);
    const packageMetadata = validateDeckPackageObject(deckPackage);

    const normalizedWordsCount = Math.max(
      Number.isFinite(Number(publishableDeck.wordsCount))
        ? Number(publishableDeck.wordsCount)
        : 0,
      Number(packageMetadata.wordsCount || 0),
    );
    const serializedPackage = JSON.stringify(deckPackage);
    const packageBytes = new TextEncoder().encode(serializedPackage);
    if (packageBytes.byteLength === 0) {
      throw new Error("Deck package is empty");
    }
    if (packageBytes.byteLength > MAX_HUB_PACKAGE_BYTES) {
      throw new Error("Deck package is too large to publish (max 50 MB)");
    }
    const packageChecksum = await sha256Hex(packageBytes);
    const baseFileName = sanitizeFileName(publishableDeck.title);

    const {
      data: ownerDecks,
      error: ownerDecksError,
    } = await supabase
      .from("hub_decks")
      .select("id,title,slug")
      .eq("owner_id", user.id)
      .limit(500);

    if (ownerDecksError) {
      throw new Error(ownerDecksError.message || "Failed to check existing Hub deck");
    }

    const existingDeck = resolveExistingDeckByTitle(ownerDecks, publishableDeck);
    let hubDeckId = existingDeck?.id || "";
    const shouldUpdateSlug = !toCleanString(existingDeck?.slug);

    if (!hubDeckId) {
      const nextDeckId = createHubDeckId();
      const nextSlug = buildDeckSlug(publishableDeck.title, nextDeckId);
      const {
        data: insertedDeck,
        error: insertDeckError,
      } = await supabase
        .from("hub_decks")
        .insert({
          id: nextDeckId,
          owner_id: user.id,
          slug: nextSlug,
          title: publishableDeck.title,
          description: publishableDeck.description,
          source_language: publishableDeck.sourceLanguage,
          target_languages: publishableDeck.targetLanguages,
          tags: publishableDeck.tags,
          words_count: normalizedWordsCount,
          is_published: true,
        })
        .select("id")
        .single();

      if (insertDeckError || !insertedDeck?.id) {
        throw new Error(insertDeckError?.message || "Failed to create Hub deck");
      }

      hubDeckId = insertedDeck.id;
    } else {
      const { error: updateDeckError } = await supabase
        .from("hub_decks")
        .update({
          description: publishableDeck.description,
          source_language: publishableDeck.sourceLanguage,
          target_languages: publishableDeck.targetLanguages,
          tags: publishableDeck.tags,
          words_count: normalizedWordsCount,
          is_published: true,
        })
        .eq("id", hubDeckId);

      if (updateDeckError) {
        throw new Error(updateDeckError.message || "Failed to update Hub deck");
      }

      if (shouldUpdateSlug) {
        const nextSlug = buildDeckSlug(publishableDeck.title, hubDeckId);

        if (nextSlug) {
          await supabase
            .from("hub_decks")
            .update({ slug: nextSlug })
            .eq("id", hubDeckId);
        }
      }
    }

    const {
      data: latestVersionRow,
      error: latestVersionError,
    } = await supabase
      .from("hub_deck_versions")
      .select("version,file_path,checksum_sha256,words_count")
      .eq("deck_id", hubDeckId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestVersionError) {
      throw new Error(latestVersionError.message || "Failed to resolve Hub deck version");
    }

    const latestChecksum = toCleanString(latestVersionRow?.checksum_sha256).toLowerCase();
    const latestWordsCount = Number.isFinite(Number(latestVersionRow?.words_count))
      ? Number(latestVersionRow.words_count)
      : 0;
    const latestVersion = Number.isFinite(Number(latestVersionRow?.version))
      ? Number(latestVersionRow.version)
      : 0;
    const latestFilePath = toCleanString(latestVersionRow?.file_path);

    if (
      latestVersion > 0 &&
      latestChecksum &&
      latestChecksum === packageChecksum.toLowerCase() &&
      latestWordsCount === normalizedWordsCount
    ) {
      return {
        deckId: hubDeckId,
        version: latestVersion,
        filePath: latestFilePath,
        wordsCount: normalizedWordsCount,
        title: publishableDeck.title,
        skippedAsDuplicate: true,
      };
    }

    const nextVersion = latestVersion > 0
      ? latestVersion + 1
      : 1;
    const filePath = `${user.id}/${baseFileName}-v${nextVersion}-${Date.now()}.lioradeck`;
    const uploadBlob = new Blob([packageBytes], { type: "application/octet-stream" });
    const { error: uploadError } = await supabase.storage
      .from(HUB_STORAGE_BUCKET)
      .upload(filePath, uploadBlob, {
        upsert: false,
        contentType: "application/octet-stream",
      });

    if (uploadError) {
      throw new Error(uploadError.message || "Failed to upload deck package");
    }

    const { error: insertVersionError } = await supabase
      .from("hub_deck_versions")
      .insert({
        deck_id: hubDeckId,
        version: nextVersion,
        file_path: filePath,
        file_format: "lioradeck",
        file_size_bytes: packageBytes.byteLength,
        checksum_sha256: packageChecksum,
        words_count: normalizedWordsCount,
      });

    if (insertVersionError) {
      await supabase.storage.from(HUB_STORAGE_BUCKET).remove([filePath]);
      throw new Error(insertVersionError.message || "Failed to create deck version");
    }

    return {
      deckId: hubDeckId,
      version: nextVersion,
      filePath,
      wordsCount: normalizedWordsCount,
      title: publishableDeck.title,
    };
  },

  async deleteDeck({ deckId } = {}) {
    const supabase = ensureSupabaseClient();
    const user = await ensureVerifiedOwnerSession(supabase);
    const normalizedDeckId = toCleanString(deckId);

    if (!normalizedDeckId) {
      throw new Error("Hub deck id is required");
    }

    const { data: deckRow, error: deckRowError } = await supabase
      .from("hub_decks")
      .select("id,owner_id")
      .eq("id", normalizedDeckId)
      .maybeSingle();

    if (deckRowError) {
      throw new Error(deckRowError.message || "Failed to resolve Hub deck");
    }

    if (!deckRow?.id) {
      throw new Error("Hub deck not found");
    }

    if (deckRow.owner_id !== user.id) {
      throw new Error("Only the owner can delete this Hub deck");
    }

    const { data: deckVersions, error: deckVersionsError } = await supabase
      .from("hub_deck_versions")
      .select("file_path")
      .eq("deck_id", normalizedDeckId);

    if (deckVersionsError) {
      throw new Error(deckVersionsError.message || "Failed to load Hub deck versions");
    }

    const filePaths = (Array.isArray(deckVersions) ? deckVersions : [])
      .map((version) => toCleanString(version?.file_path))
      .filter(Boolean);

    if (filePaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from(HUB_STORAGE_BUCKET)
        .remove(filePaths);

      if (removeError) {
        throw new Error(removeError.message || "Failed to remove Hub deck files");
      }
    }

    const { error: deleteVersionsError } = await supabase
      .from("hub_deck_versions")
      .delete()
      .eq("deck_id", normalizedDeckId);

    if (deleteVersionsError) {
      throw new Error(deleteVersionsError.message || "Failed to delete Hub deck versions");
    }

    const { error: deleteDeckError } = await supabase
      .from("hub_decks")
      .delete()
      .eq("id", normalizedDeckId);

    if (deleteDeckError) {
      throw new Error(deleteDeckError.message || "Failed to delete Hub deck");
    }

    return {
      deckId: normalizedDeckId,
      deletedFiles: filePaths.length,
    };
  },
};
