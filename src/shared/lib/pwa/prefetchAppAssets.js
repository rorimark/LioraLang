const APP_MANIFEST_PATH = "/asset-manifest.json";
const APP_ROUTE_CHUNK_MATCHERS = [
  "LearnPage",
  "DecksPage",
  "DeckEditorPage",
  "DeckDetailsPage",
  "BrowsePage",
  "ProgressPage",
  "SettingsPage",
  "AccountPage",
];

let prefetchPromise = null;

const canPrefetchAssets = () => {
  if (import.meta.env.VITE_APP_TARGET !== "web") {
    return false;
  }

  if (!import.meta.env.PROD) {
    return false;
  }

  return typeof window !== "undefined" && typeof document !== "undefined";
};

const isAppRouteChunk = (key = "") => {
  return APP_ROUTE_CHUNK_MATCHERS.some((matcher) => key.includes(matcher));
};

const ensurePreloadLink = (href, rel, as) => {
  if (!href) {
    return;
  }

  const selector = as
    ? `link[rel="${rel}"][href="${href}"][as="${as}"]`
    : `link[rel="${rel}"][href="${href}"]`;

  if (document.querySelector(selector)) {
    return;
  }

  const linkElement = document.createElement("link");
  linkElement.rel = rel;
  linkElement.href = href;

  if (as) {
    linkElement.as = as;
  }

  document.head.append(linkElement);
};

const preloadAppAssetsFromManifest = async () => {
  const response = await fetch(APP_MANIFEST_PATH, {
    cache: "no-store",
  });

  if (!response.ok) {
    return 0;
  }

  const manifest = await response.json();

  if (!manifest || typeof manifest !== "object") {
    return 0;
  }

  const entryChunks = Object.entries(manifest).filter(([key]) => isAppRouteChunk(key));
  const modulePreloadSet = new Set();
  const stylePreloadSet = new Set();

  entryChunks.forEach(([, value]) => {
    if (!value || typeof value !== "object") {
      return;
    }

    if (typeof value.file === "string" && value.file.trim()) {
      modulePreloadSet.add(value.file.trim());
    }

    if (Array.isArray(value.css)) {
      value.css
        .filter((item) => typeof item === "string" && item.trim())
        .forEach((item) => stylePreloadSet.add(item.trim()));
    }
  });

  modulePreloadSet.forEach((assetPath) => {
    ensurePreloadLink(assetPath, "modulepreload");
  });

  stylePreloadSet.forEach((assetPath) => {
    ensurePreloadLink(assetPath, "preload", "style");
  });

  return modulePreloadSet.size + stylePreloadSet.size;
};

export const prefetchAppAssets = async () => {
  if (!canPrefetchAssets()) {
    return 0;
  }

  if (!prefetchPromise) {
    prefetchPromise = preloadAppAssetsFromManifest()
      .catch(() => 0)
      .finally(() => {
        prefetchPromise = null;
      });
  }

  return prefetchPromise;
};
