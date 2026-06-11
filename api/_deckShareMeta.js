import { createClient } from "@supabase/supabase-js";
import { buildBrowseDeckRoute, buildShareDeckRoute } from "../packages/shared/src/config/routes.js";

export const APP_NAME = "LioraLang";

export const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const normalizeBaseUrl = (value) => {
  const normalizedValue = toCleanString(value);

  if (!normalizedValue) {
    return "";
  }

  return normalizedValue.replace(/\/+$/, "");
};

const firstHeaderValue = (value) => {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  return toCleanString(normalizedValue).split(",")[0]?.trim() || "";
};

export const resolveBaseUrl = (request) => {
  const envBaseUrl = normalizeBaseUrl(globalThis.process?.env?.VITE_PUBLIC_APP_URL || "");

  if (envBaseUrl) {
    return envBaseUrl;
  }

  const forwardedProto = firstHeaderValue(request.headers["x-forwarded-proto"]);
  const forwardedHost = firstHeaderValue(request.headers["x-forwarded-host"]);
  const host = forwardedHost || firstHeaderValue(request.headers.host);

  if (!host) {
    return "";
  }

  const protocol = forwardedProto || "https";
  return `${protocol}://${host}`;
};

const resolveRequestUrl = (request, baseUrl) => {
  const rawUrl = toCleanString(request.url);

  if (!rawUrl) {
    return null;
  }

  try {
    return new URL(rawUrl, baseUrl || "https://liora.local");
  } catch {
    return null;
  }
};

export const resolveDeckSlug = (request, baseUrl) => {
  const requestUrl = resolveRequestUrl(request, baseUrl);
  return toCleanString(requestUrl?.searchParams.get("deckSlug"));
};

export const buildAbsoluteUrl = (baseUrl, path) => {
  const normalizedPath = toCleanString(path);

  if (!normalizedPath) {
    return "";
  }

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
};

export const normalizeTextArray = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalizedItems = [];
  const seen = new Set();

  value.forEach((item) => {
    const normalizedItem = toCleanString(item);
    const key = normalizedItem.toLowerCase();

    if (!normalizedItem || seen.has(key)) {
      return;
    }

    seen.add(key);
    normalizedItems.push(normalizedItem);
  });

  return normalizedItems;
};

export const buildFallbackDescription = (deck) => {
  const parts = [];
  const wordsCount = Number(deck?.words_count);
  const sourceLanguage = toCleanString(deck?.source_language);
  const targetLanguages = normalizeTextArray(deck?.target_languages);

  if (Number.isFinite(wordsCount) && wordsCount > 0) {
    parts.push(`${wordsCount} words`);
  }

  if (sourceLanguage && targetLanguages.length > 0) {
    parts.push(`${sourceLanguage} → ${targetLanguages.join(", ")}`);
  }

  if (parts.length === 0) {
    return "Open this public deck in LioraLang.";
  }

  return `${parts.join(" • ")} on ${APP_NAME}.`;
};

export const trimMetaText = (value, maxLength = 180) => {
  const normalizedValue = toCleanString(value);

  if (!normalizedValue || normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength - 1).trimEnd()}…`;
};

export const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export const escapeAttribute = (value) => escapeHtml(value).replace(/"/g, "&quot;");

export const loadDeckBySlug = async (slug) => {
  const supabaseUrl = toCleanString(globalThis.process?.env?.VITE_SUPABASE_URL || "");
  const supabaseKey = toCleanString(
    globalThis.process?.env?.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY || "",
  );

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await supabase
    .from("hub_decks")
    .select("slug,title,description,source_language,target_languages,tags,words_count")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data || null;
};

export const resolveDeckShareContext = async (request) => {
  const baseUrl = resolveBaseUrl(request);
  const requestUrl = resolveRequestUrl(request, baseUrl);
  const deckSlug = resolveDeckSlug(request, baseUrl);
  const deck = deckSlug ? await loadDeckBySlug(deckSlug.toLowerCase()) : null;
  const deckTitle = toCleanString(deck?.title) || "Community Deck";
  const pageTitle = `${deckTitle} · ${APP_NAME}`;
  const pageDescription = trimMetaText(
    toCleanString(deck?.description) || buildFallbackDescription(deck),
  );

  return {
    deckSlug,
    deck,
    baseUrl,
    deckTitle,
    pageTitle,
    pageDescription,
    browseUrl: buildAbsoluteUrl(baseUrl, buildBrowseDeckRoute(deckSlug)),
    shareUrl:
      requestUrl && baseUrl
        ? `${baseUrl}${requestUrl.pathname}${requestUrl.search}`
        : buildAbsoluteUrl(baseUrl, buildShareDeckRoute(deckSlug)),
    imageUrl: buildAbsoluteUrl(baseUrl, "/og/deck-share-preview.png"),
  };
};
