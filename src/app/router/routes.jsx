import { Navigate } from "react-router";
import { AppLayout } from "@app/layouts/AppLayout";
import { ROUTE_PATHS } from "@shared/config/routes";
import { RouteErrorBoundary, RouteHydrateFallback } from "@shared/ui";

const toChildPath = (path) => path.replace(/^\//, "");
const loadRouteComponent = (loader) => async () => {
  const module = await loader();
  const Component = module?.default;

  if (!Component) {
    throw new Error("Route component is missing default export");
  }

  return {
    Component,
  };
};

export const routes = [
  {
    path: ROUTE_PATHS.root,
    element: <AppLayout />,
    errorElement: <RouteErrorBoundary />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    children: [
      { index: true, element: <Navigate to={ROUTE_PATHS.learn} replace /> },
      {
        path: toChildPath(ROUTE_PATHS.learn),
        lazy: loadRouteComponent(() => import("@pages/learn/ui/LearnPage")),
      },
      {
        path: toChildPath(ROUTE_PATHS.account),
        lazy: loadRouteComponent(() => import("@pages/account/ui/AccountPage")),
      },
      {
        path: toChildPath(ROUTE_PATHS.browse),
        lazy: loadRouteComponent(() => import("@pages/browse/ui/BrowsePage")),
      },
      {
        path: toChildPath(ROUTE_PATHS.decks),
        lazy: loadRouteComponent(() => import("@pages/decks/ui/DecksPage")),
      },
      {
        path: toChildPath(ROUTE_PATHS.deckCreate),
        lazy: loadRouteComponent(() => import("@pages/deck-editor/ui/DeckEditorPage")),
      },
      {
        path: toChildPath(ROUTE_PATHS.deckEdit),
        lazy: loadRouteComponent(() => import("@pages/deck-editor/ui/DeckEditorPage")),
      },
      {
        path: toChildPath(ROUTE_PATHS.deckDetails),
        lazy: loadRouteComponent(() => import("@pages/deck-details/ui/DeckDetailsPage")),
      },
      {
        path: toChildPath(ROUTE_PATHS.progress),
        lazy: loadRouteComponent(() => import("@pages/progress/ui/ProgressPage")),
      },
      {
        path: toChildPath(ROUTE_PATHS.settings),
        lazy: loadRouteComponent(() => import("@pages/settings/ui/SettingsPage")),
      },
      { path: "*", element: <Navigate to={ROUTE_PATHS.learn} replace /> },
    ],
  },
];
