import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { app } from "electron";
import {
  normalizeTextArray,
  resolveExistingDeckByTitle,
  toPublishableDeck,
  validatePublishableDeck,
} from "./hub-helpers.js";
import { validateDeckPackageObject } from "./hub-package.js";

const HUB_STORAGE_BUCKET = "decks";
const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 120;
const INCREMENT_DOWNLOADS_RPC_NAME = "increment_hub_deck_downloads";
const MAX_HUB_PACKAGE_BYTES = 50 * 1024 * 1024;
const HUB_AUTH_STORAGE_DIR = path.join("hub", "auth");

const supabaseClientCache = new Map();
const hubAuthStorageCache = new Map();

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toCountNumber = (value, fallback = 0) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(numberValue));
};

const sanitizeFileName = (value) => {
  const normalizedName = toCleanString(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedName || "deck";
};

const ensureDirectoryExists = (directoryPath) => {
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }
};

const createHubAuthStorage = (config = {}) => {
  const cacheKey = resolveSupabaseClientCacheKey(config);

  if (hubAuthStorageCache.has(cacheKey)) {
    return hubAuthStorageCache.get(cacheKey);
  }

  const userDataPath = app.getPath("userData");
  const storageDirectoryPath = path.join(userDataPath, HUB_AUTH_STORAGE_DIR);
  const storageFilePath = path.join(
    storageDirectoryPath,
    `${sanitizeFileName(cacheKey)}.json`,
  );

  const readStorageData = () => {
    try {
      if (!fs.existsSync(storageFilePath)) {
        return {};
      }

      const raw = fs.readFileSync(storageFilePath, "utf8");

      if (!raw.trim()) {
        return {};
      }

      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return {};
      }

      return parsed;
    } catch {
      return {};
    }
  };

  const writeStorageData = (nextData) => {
    try {
      ensureDirectoryExists(storageDirectoryPath);
      fs.writeFileSync(storageFilePath, JSON.stringify(nextData), "utf8");
    } catch {
      // If disk write fails, continue with in-memory session for this run.
    }
  };

  const storage = {
    getItem(key) {
      const normalizedKey = toCleanString(key);

      if (!normalizedKey) {
        return null;
      }

      const data = readStorageData();
      return typeof data[normalizedKey] === "string" ? data[normalizedKey] : null;
    },
    setItem(key, value) {
      const normalizedKey = toCleanString(key);

      if (!normalizedKey) {
        return;
      }

      const data = readStorageData();
      data[normalizedKey] = String(value ?? "");
      writeStorageData(data);
    },
    removeItem(key) {
      const normalizedKey = toCleanString(key);

      if (!normalizedKey) {
        return;
      }

      const data = readStorageData();

      if (!Object.hasOwn(data, normalizedKey)) {
        return;
      }

      delete data[normalizedKey];
      writeStorageData(data);
    },
  };

  hubAuthStorageCache.set(cacheKey, storage);
  return storage;
};

const normalizeHubConfig = (config = {}) => {
  return {
    url: toCleanString(config?.url),
    publishableKey: toCleanString(config?.publishableKey),
  };
};

export const hasHubConfig = (config = {}) => {
  const normalizedConfig = normalizeHubConfig(config);
  return Boolean(normalizedConfig.url && normalizedConfig.publishableKey);
};

const ensureHubConfig = (config = {}) => {
  const normalizedConfig = normalizeHubConfig(config);

  if (!normalizedConfig.url || !normalizedConfig.publishableKey) {
    throw new Error(
      "LLH is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to .env.",
    );
  }

  return normalizedConfig;
};

const resolveSupabaseClientCacheKey = (config = {}) => {
  return `${config.url}::${config.publishableKey}`;
};

const getSupabaseClient = (config = {}) => {
  const normalizedConfig = ensureHubConfig(config);
  const cacheKey = resolveSupabaseClientCacheKey(normalizedConfig);

  if (supabaseClientCache.has(cacheKey)) {
    return supabaseClientCache.get(cacheKey);
  }

  const client = createClient(
    normalizedConfig.url,
    normalizedConfig.publishableKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storage: createHubAuthStorage(normalizedConfig),
      },
    },
  );

  supabaseClientCache.set(cacheKey, client);
  return client;
};

const isAnonymousSignInDisabledError = (error) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = toCleanString(error.message).toLowerCase();
  return message.includes("anonymous sign-ins are disabled");
};

const resolveAnonymousSignInErrorMessage = (error) => {
  if (isAnonymousSignInDisabledError(error)) {
    return "Anonymous sign-ins are disabled in Supabase. Enable Auth > Providers > Anonymous.";
  }

  return toCleanString(error?.message) || "Failed to sign in to LioraLangHub";
};

const isRpcMissingError = (error) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  if (error.code === "PGRST202") {
    return true;
  }

  const message = typeof error.message === "string" ? error.message.toLowerCase() : "";

  return message.includes("does not exist") && message.includes(INCREMENT_DOWNLOADS_RPC_NAME);
};

const resolveDownloadsCountFromRpcData = (data, fallback = 0) => {
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return toCountNumber(fallback, 0);
    }

    const firstRow = data[0];

    if (firstRow && typeof firstRow === "object") {
      if (Object.hasOwn(firstRow, "downloads_count")) {
        return toCountNumber(firstRow.downloads_count, fallback);
      }

      if (Object.hasOwn(firstRow, INCREMENT_DOWNLOADS_RPC_NAME)) {
        return toCountNumber(firstRow[INCREMENT_DOWNLOADS_RPC_NAME], fallback);
      }
    }

    return toCountNumber(firstRow, fallback);
  }

  if (data && typeof data === "object") {
    if (Object.hasOwn(data, "downloads_count")) {
      return toCountNumber(data.downloads_count, fallback);
    }

    if (Object.hasOwn(data, INCREMENT_DOWNLOADS_RPC_NAME)) {
      return toCountNumber(data[INCREMENT_DOWNLOADS_RPC_NAME], fallback);
    }
  }

  return toCountNumber(data, fallback);
};

const ensureAnonymousSession = async (supabaseClient) => {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || "Failed to resolve Hub session");
  }

  if (sessionData?.session?.user?.id) {
    return sessionData.session.user;
  }

  const { data: signInData, error: signInError } = await supabaseClient.auth.signInAnonymously();

  if (signInError || !signInData?.user?.id) {
    throw new Error(resolveAnonymousSignInErrorMessage(signInError));
  }

  return signInData.user;
};

const toHubDeck = (deck, latestVersion) => {
  const targetLanguages = normalizeTextArray(deck?.target_languages);
  const languages = [deck?.source_language, ...targetLanguages]
    .map((item) => toCleanString(item))
    .filter(Boolean);
  const uniqueLanguageKeys = new Set();
  const uniqueLanguages = [];

  languages.forEach((language) => {
    const key = language.toLowerCase();

    if (!key || uniqueLanguageKeys.has(key)) {
      return;
    }

    uniqueLanguageKeys.add(key);
    uniqueLanguages.push(language);
  });

  return {
    id: toCleanString(deck?.id ? String(deck.id) : ""),
    title: toCleanString(deck?.title),
    description: toCleanString(deck?.description),
    sourceLanguage: toCleanString(deck?.source_language),
    targetLanguages,
    languages: uniqueLanguages,
    tags: normalizeTextArray(deck?.tags),
    wordsCount: Number.isFinite(Number(deck?.words_count))
      ? Number(deck.words_count)
      : 0,
    downloadsCount: Number.isFinite(Number(deck?.downloads_count))
      ? Number(deck.downloads_count)
      : 0,
    createdAt: toCleanString(deck?.created_at),
    latestVersion: latestVersion
      ? {
          version: Number.isFinite(Number(latestVersion?.version))
            ? Number(latestVersion.version)
            : 1,
          filePath: toCleanString(latestVersion?.file_path),
          fileFormat: toCleanString(latestVersion?.file_format) || "lioradeck",
          fileSizeBytes: Number.isFinite(Number(latestVersion?.file_size_bytes))
            ? Number(latestVersion.file_size_bytes)
            : 0,
          createdAt: toCleanString(latestVersion?.created_at),
        }
      : null,
  };
};

const sha256Hex = (buffer) =>
  crypto.createHash("sha256").update(buffer).digest("hex");

export const listHubDecks = async ({
  config,
  page = 1,
  pageSize = 8,
  search = "",
} = {}) => {
  const supabase = getSupabaseClient(config);
  const normalizedPage = Number.isInteger(Number(page))
    ? Math.max(1, Number(page))
    : 1;
  const normalizedPageSize = Number.isInteger(Number(pageSize))
    ? Math.min(Math.max(1, Number(pageSize)), 50)
    : 8;
  const normalizedSearch = toCleanString(search);
  const from = (normalizedPage - 1) * normalizedPageSize;
  const to = from + normalizedPageSize - 1;

  let decksQuery = supabase
    .from("hub_decks")
    .select(
      "id,title,description,source_language,target_languages,tags,words_count,downloads_count,created_at",
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
    .map((deck) => toCleanString(deck?.id ? String(deck.id) : ""))
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
    const deckId = toCleanString(version?.deck_id ? String(version.deck_id) : "");

    if (!deckId || latestVersionByDeckId.has(deckId)) {
      return;
    }

    latestVersionByDeckId.set(deckId, version);
  });

  return {
    items: deckList.map((deck) =>
      toHubDeck(deck, latestVersionByDeckId.get(toCleanString(deck?.id ? String(deck.id) : ""))),
    ),
    total: Number.isFinite(Number(count)) ? Number(count) : 0,
    page: normalizedPage,
    pageSize: normalizedPageSize,
  };
};

export const createHubDeckDownloadUrl = async ({
  config,
  filePath,
  expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS,
} = {}) => {
  const supabase = getSupabaseClient(config);
  const normalizedFilePath = toCleanString(filePath);

  if (!normalizedFilePath) {
    throw new Error("Hub deck file path is required");
  }

  if (
    normalizedFilePath.includes("..") ||
    normalizedFilePath.startsWith("/") ||
    normalizedFilePath.includes("\0")
  ) {
    throw new Error("Hub deck file path is invalid");
  }

  const { data, error } = await supabase.storage
    .from(HUB_STORAGE_BUCKET)
    .createSignedUrl(normalizedFilePath, Math.max(30, Number(expiresInSeconds) || 120));

  if (error || !data?.signedUrl) {
    throw new Error(error?.message || "Failed to generate deck download link");
  }

  return data.signedUrl;
};

export const incrementHubDeckDownloads = async ({
  config,
  deckId,
  currentDownloadsCount = 0,
} = {}) => {
  const supabase = getSupabaseClient(config);
  const normalizedDeckId = toCleanString(String(deckId || ""));

  if (!normalizedDeckId) {
    throw new Error("Hub deck id is required to update downloads");
  }

  const fallbackCurrentDownloads = toCountNumber(currentDownloadsCount, 0);
  const fallbackNextDownloads = fallbackCurrentDownloads + 1;
  const { data: rpcData, error: rpcError } = await supabase.rpc(
    INCREMENT_DOWNLOADS_RPC_NAME,
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
};

export const publishHubDeck = async ({
  config,
  deck,
  deckPackage,
} = {}) => {
  const supabase = getSupabaseClient(config);
  const user = await ensureAnonymousSession(supabase);
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
  const packageBytes = Buffer.from(serializedPackage, "utf8");
  if (packageBytes.byteLength === 0) {
    throw new Error("Deck package is empty");
  }
  if (packageBytes.byteLength > MAX_HUB_PACKAGE_BYTES) {
    throw new Error("Deck package is too large to publish (max 50 MB)");
  }
  const packageChecksum = sha256Hex(packageBytes);
  const baseFileName = sanitizeFileName(publishableDeck.title);

  const {
    data: ownerDecks,
    error: ownerDecksError,
  } = await supabase
    .from("hub_decks")
    .select("id,title")
    .eq("owner_id", user.id)
    .limit(500);

  if (ownerDecksError) {
    throw new Error(ownerDecksError.message || "Failed to check existing Hub deck");
  }

  const existingDeck = resolveExistingDeckByTitle(ownerDecks, publishableDeck);
  let hubDeckId = toCleanString(existingDeck?.id);

  if (!hubDeckId) {
    const {
      data: insertedDeck,
      error: insertDeckError,
    } = await supabase
      .from("hub_decks")
      .insert({
        owner_id: user.id,
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
  const { error: uploadError } = await supabase.storage
    .from(HUB_STORAGE_BUCKET)
    .upload(filePath, packageBytes, {
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
};
