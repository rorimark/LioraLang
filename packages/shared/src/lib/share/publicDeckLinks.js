import { buildBrowseDeckRoute, buildShareDeckRoute } from "@shared/config/routes";

const toCleanString = (value) => {
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

export const resolvePublicAppBaseUrl = ({
  envBaseUrl = "",
  origin = "",
} = {}) => {
  const normalizedEnvBaseUrl = normalizeBaseUrl(envBaseUrl);

  if (normalizedEnvBaseUrl) {
    return normalizedEnvBaseUrl;
  }

  const normalizedOrigin = normalizeBaseUrl(origin);

  if (normalizedOrigin.startsWith("http://") || normalizedOrigin.startsWith("https://")) {
    return normalizedOrigin;
  }

  return "";
};

const buildAbsoluteUrl = (path, options = {}) => {
  const normalizedPath = toCleanString(path);

  if (!normalizedPath) {
    return "";
  }

  const baseUrl = resolvePublicAppBaseUrl(options);

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
};

const appendQueryParams = (path, params = {}) => {
  const normalizedPath = toCleanString(path);

  if (!normalizedPath) {
    return "";
  }

  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const normalizedKey = toCleanString(key);
    const normalizedValue = toCleanString(value);

    if (!normalizedKey || !normalizedValue) {
      return;
    }

    searchParams.set(normalizedKey, normalizedValue);
  });

  const queryString = searchParams.toString();

  if (!queryString) {
    return normalizedPath;
  }

  return `${normalizedPath}?${queryString}`;
};

export const buildPublicDeckBrowseUrl = (deckSlug, options = {}) => {
  const route = buildBrowseDeckRoute(deckSlug);
  return buildAbsoluteUrl(route, options);
};

export const buildPublicDeckShareUrl = (deckSlug, options = {}) => {
  const route = appendQueryParams(buildShareDeckRoute(deckSlug), {
    preview: options.previewKey,
  });
  return buildAbsoluteUrl(route, options);
};
