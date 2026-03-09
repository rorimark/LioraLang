const ROUTE_PRELOADERS = [
  () => import("@pages/account/ui/AccountPage"),
  () => import("@pages/browse/ui/BrowsePage"),
  () => import("@pages/decks/ui/DecksPage"),
  () => import("@pages/deck-editor/ui/DeckEditorPage"),
  () => import("@pages/deck-details/ui/DeckDetailsPage"),
  () => import("@pages/learn/ui/LearnPage"),
  () => import("@pages/progress/ui/ProgressPage"),
  () => import("@pages/settings/ui/SettingsPage"),
];
let hasScheduledPreload = false;
let preloadInFlightPromise = null;

const shouldPreloadRoutes = () => {
  if (import.meta.env.VITE_APP_TARGET !== "web") {
    return false;
  }

  if (!import.meta.env.PROD) {
    return false;
  }

  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return navigator.onLine !== false;
};

const runRoutePreload = async () => {
  if (!preloadInFlightPromise) {
    preloadInFlightPromise = Promise.allSettled(
      ROUTE_PRELOADERS.map((loadRoute) => loadRoute()),
    ).finally(() => {
      preloadInFlightPromise = null;
    });
  }

  await preloadInFlightPromise;
};

export const preloadAppRoutesNow = () => {
  if (!shouldPreloadRoutes()) {
    return;
  }

  void runRoutePreload();
};

export const preloadRoutesForOffline = () => {
  if (hasScheduledPreload || !shouldPreloadRoutes()) {
    return;
  }

  hasScheduledPreload = true;

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => {
      void runRoutePreload();
    }, { timeout: 4000 });
    return;
  }

  window.setTimeout(() => {
    void runRoutePreload();
  }, 900);
};
