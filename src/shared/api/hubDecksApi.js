import { getSupabaseClient, hasSupabaseConfig } from "./supabaseClient";

const HUB_STORAGE_BUCKET = "decks";
const DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS = 120;
const INCREMENT_DOWNLOADS_RPC_NAME = "increment_hub_deck_downloads";

const normalizeTextArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
};

const sanitizeFileName = (value) => {
  if (typeof value !== "string") {
    return "deck";
  }

  const normalizedName = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalizedName || "deck";
};

const parseTags = (value) => {
  if (Array.isArray(value)) {
    return normalizeTextArray(value);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return normalizeTextArray(parsed);
  } catch {
    return [];
  }
};

const toPublishableDeck = (value = {}) => {
  const title =
    typeof value?.name === "string" && value.name.trim()
      ? value.name.trim()
      : typeof value?.title === "string"
        ? value.title.trim()
        : "";
  const sourceLanguage =
    typeof value?.sourceLanguage === "string" ? value.sourceLanguage.trim() : "";
  const targetLanguage =
    typeof value?.targetLanguage === "string" ? value.targetLanguage.trim() : "";
  const tertiaryLanguage =
    typeof value?.tertiaryLanguage === "string" ? value.tertiaryLanguage.trim() : "";
  const targetLanguages = [targetLanguage, tertiaryLanguage].filter(Boolean);

  return {
    title,
    description:
      typeof value?.description === "string" ? value.description.trim() : "",
    sourceLanguage,
    targetLanguages,
    tags: parseTags(value?.tags ?? value?.tagsJson),
    wordsCount: Number.isFinite(Number(value?.wordsCount))
      ? Number(value.wordsCount)
      : 0,
  };
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
    throw new Error(signInError?.message || "Failed to sign in to LioraLangHub");
  }

  return signInData.user;
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

const toHubDeck = (deck, latestVersion) => {
  const targetLanguages = normalizeTextArray(deck?.target_languages);
  const languages = [deck?.source_language, ...targetLanguages]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
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
    id: String(deck?.id || ""),
    title: typeof deck?.title === "string" ? deck.title.trim() : "",
    description: typeof deck?.description === "string" ? deck.description.trim() : "",
    sourceLanguage:
      typeof deck?.source_language === "string" ? deck.source_language.trim() : "",
    targetLanguages,
    languages: uniqueLanguages,
    tags: normalizeTextArray(deck?.tags),
    wordsCount: Number.isFinite(Number(deck?.words_count))
      ? Number(deck.words_count)
      : 0,
    downloadsCount: Number.isFinite(Number(deck?.downloads_count))
      ? Number(deck.downloads_count)
      : 0,
    createdAt: typeof deck?.created_at === "string" ? deck.created_at : "",
    latestVersion: latestVersion
      ? {
          version: Number.isFinite(Number(latestVersion?.version))
            ? Number(latestVersion.version)
            : 1,
          filePath:
            typeof latestVersion?.file_path === "string"
              ? latestVersion.file_path
              : "",
          fileFormat:
            typeof latestVersion?.file_format === "string"
              ? latestVersion.file_format
              : "lioradeck",
          fileSizeBytes: Number.isFinite(Number(latestVersion?.file_size_bytes))
            ? Number(latestVersion.file_size_bytes)
            : 0,
          createdAt:
            typeof latestVersion?.created_at === "string"
              ? latestVersion.created_at
              : "",
        }
      : null,
  };
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

const toCountNumber = (value, fallback = 0) => {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(numberValue));
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
        toHubDeck(deck, latestVersionByDeckId.get(String(deck?.id || ""))),
      ),
      total: Number.isFinite(Number(count)) ? Number(count) : 0,
      page: normalizedPage,
      pageSize: normalizedPageSize,
    };
  },

  async createDownloadUrl(filePath, expiresInSeconds = DEFAULT_SIGNED_URL_EXPIRES_IN_SECONDS) {
    const supabase = ensureSupabaseClient();
    const normalizedFilePath =
      typeof filePath === "string" ? filePath.trim() : "";

    if (!normalizedFilePath) {
      throw new Error("Hub deck file path is required");
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
  },

  async publishDeck({
    deck,
    deckPackage,
  } = {}) {
    const supabase = ensureSupabaseClient();
    const user = await ensureAnonymousSession(supabase);
    const publishableDeck = toPublishableDeck(deck);

    if (!publishableDeck.title) {
      throw new Error("Deck title is required for publish");
    }

    if (!publishableDeck.sourceLanguage || publishableDeck.targetLanguages.length === 0) {
      throw new Error("Deck languages are missing");
    }

    if (!deckPackage || typeof deckPackage !== "object" || !Array.isArray(deckPackage.words)) {
      throw new Error("Deck package payload is invalid");
    }

    const normalizedWordsCount = Math.max(
      Number.isFinite(Number(publishableDeck.wordsCount))
        ? Number(publishableDeck.wordsCount)
        : 0,
      Array.isArray(deckPackage.words) ? deckPackage.words.length : 0,
    );
    const serializedPackage = JSON.stringify(deckPackage);
    const packageBytes = new TextEncoder().encode(serializedPackage);
    const packageChecksum = await sha256Hex(packageBytes);
    const baseFileName = sanitizeFileName(publishableDeck.title);

    const {
      data: existingDeck,
      error: existingDeckError,
    } = await supabase
      .from("hub_decks")
      .select("id,title")
      .eq("owner_id", user.id)
      .eq("title", publishableDeck.title)
      .maybeSingle();

    if (existingDeckError) {
      throw new Error(existingDeckError.message || "Failed to check existing Hub deck");
    }

    let hubDeckId = existingDeck?.id || "";

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
      .select("version")
      .eq("deck_id", hubDeckId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestVersionError) {
      throw new Error(latestVersionError.message || "Failed to resolve Hub deck version");
    }

    const nextVersion = Number.isFinite(Number(latestVersionRow?.version))
      ? Number(latestVersionRow.version) + 1
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
};
