const CACHE_NAME = "lioralang-web-v4";
const BUILD_MANIFEST_FILE = "asset-manifest.json";
// The app's shell; index.html is the English landing, written as static
// HTML at build time (scripts/prerender-landing.mjs).
const APP_SHELL_PATH = "app.html";
const OFFLINE_PAGE_PATH = "offline.html";
const PRECACHE_PATHS = [
  "app/",
  APP_SHELL_PATH,
  OFFLINE_PAGE_PATH,
  "manifest.webmanifest",
  BUILD_MANIFEST_FILE,
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
];

// Built files live at the site's root (/assets/…, /app.html), not under
// the worker's /app/ scope: resolved against the scope they would be
// rewritten to the app's HTML, and nothing would be cached for offline.
const resolveScopeAssetUrl = (path) => {
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return new URL(`/${normalizedPath}`, self.location.origin).toString();
};

const addAllSettled = async (cache, urls = []) => {
  await Promise.allSettled(
    urls.map((url) => cache.add(url)),
  );
};

const cacheBuildAssetsFromManifest = async (cache) => {
  const manifestUrl = resolveScopeAssetUrl(BUILD_MANIFEST_FILE);
  const manifestResponse = await fetch(manifestUrl, {
    cache: "no-store",
  });

  if (!manifestResponse.ok) {
    return;
  }

  const manifest = await manifestResponse.json();

  if (!manifest || typeof manifest !== "object") {
    return;
  }

  const assetPaths = new Set();

  Object.values(manifest).forEach((entry) => {
    if (!entry || typeof entry !== "object") {
      return;
    }

    if (typeof entry.file === "string" && entry.file.trim()) {
      assetPaths.add(entry.file.trim());
    }

    if (Array.isArray(entry.css)) {
      entry.css
        .filter((item) => typeof item === "string" && item.trim())
        .forEach((item) => assetPaths.add(item.trim()));
    }

    if (Array.isArray(entry.assets)) {
      entry.assets
        .filter((item) => typeof item === "string" && item.trim())
        .forEach((item) => assetPaths.add(item.trim()));
    }
  });

  const assetUrls = Array.from(assetPaths).map((assetPath) =>
    resolveScopeAssetUrl(assetPath),
  );
  await addAllSettled(cache, assetUrls);
};

const isCacheableResponse = (response) => {
  if (!response || !response.ok) {
    return false;
  }

  return response.type === "basic";
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const precacheUrls = PRECACHE_PATHS.map((path) => resolveScopeAssetUrl(path));
      await addAllSettled(cache, precacheUrls);
      await cacheBuildAssetsFromManifest(cache).catch(() => {});
    }),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )),
  );

  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event?.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (isSameOrigin && isCacheableResponse(response)) {
            const responseClone = response.clone();
            void caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(async () => {
          const cachedMatch = await caches.match(request);

          if (cachedMatch) {
            return cachedMatch;
          }

          const appShellMatch = await caches.match(
            resolveScopeAssetUrl(APP_SHELL_PATH),
          );

          if (appShellMatch) {
            return appShellMatch;
          }

          return caches.match(resolveScopeAssetUrl(OFFLINE_PAGE_PATH));
        }),
    );
    return;
  }

  if (!isSameOrigin) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkRequest = fetch(request)
        .then((response) => {
          if (isCacheableResponse(response)) {
            const responseClone = response.clone();
            void caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }

          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkRequest;
    }),
  );
});
