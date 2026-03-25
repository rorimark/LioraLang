import { Navigate, redirect } from "react-router";
import { AppLayout } from "@app/layouts/AppLayout";
import {
  buildDeckDetailsRoute,
  buildDeckEditRoute,
  LEGACY_ROUTE_PATHS,
  ROUTE_PATHS,
} from "@shared/config/routes";
import { RouteErrorBoundary, RouteHydrateFallback } from "@shared/ui";

export const loadRouteComponent = (loader) => async () => {
  const module = await loader();
  const Component = module?.default;

  if (!Component) {
    throw new Error("Route component is missing default export");
  }

  return {
    Component,
    HydrateFallback: RouteHydrateFallback,
  };
};

export const appRoute = {
  path: ROUTE_PATHS.appRoot,
  element: <AppLayout />,
  errorElement: <RouteErrorBoundary />,
  HydrateFallback: RouteHydrateFallback,
  children: [
    { index: true, element: <Navigate to={ROUTE_PATHS.learn} replace /> },
    {
      path: "learn",
      lazy: loadRouteComponent(() => import("@pages/learn/ui/LearnPage")),
    },
    {
      path: "account",
      lazy: loadRouteComponent(() => import("@pages/account/ui/AccountPage")),
    },
    {
      path: "browse",
      lazy: loadRouteComponent(() => import("@pages/browse/ui/BrowsePage")),
    },
    {
      path: "browse/:deckSlug",
      lazy: loadRouteComponent(() => import("@pages/browse/ui/BrowsePage")),
    },
    {
      path: "decks",
      lazy: loadRouteComponent(() => import("@pages/decks/ui/DecksPage")),
    },
    {
      path: "decks/new",
      lazy: loadRouteComponent(() => import("@pages/deck-editor/ui/DeckEditorPage")),
    },
    {
      path: "decks/:deckId/edit",
      lazy: loadRouteComponent(() => import("@pages/deck-editor/ui/DeckEditorPage")),
    },
    {
      path: "decks/:deckId",
      lazy: loadRouteComponent(() => import("@pages/deck-details/ui/DeckDetailsPage")),
    },
    {
      path: "progress",
      lazy: loadRouteComponent(() => import("@pages/progress/ui/ProgressPage")),
    },
    {
      path: "settings",
      lazy: loadRouteComponent(() => import("@pages/settings/ui/SettingsPage")),
    },
    { path: "*", element: <Navigate to={ROUTE_PATHS.learn} replace /> },
  ],
};

export const legacyRoutes = [
  { path: LEGACY_ROUTE_PATHS.learn, element: <Navigate to={ROUTE_PATHS.learn} replace /> },
  { path: LEGACY_ROUTE_PATHS.browse, element: <Navigate to={ROUTE_PATHS.browse} replace /> },
  { path: LEGACY_ROUTE_PATHS.decks, element: <Navigate to={ROUTE_PATHS.decks} replace /> },
  { path: LEGACY_ROUTE_PATHS.deckCreate, element: <Navigate to={ROUTE_PATHS.deckCreate} replace /> },
  {
    path: LEGACY_ROUTE_PATHS.deckEdit,
    loader: ({ params }) => redirect(buildDeckEditRoute(params?.deckId)),
  },
  {
    path: LEGACY_ROUTE_PATHS.deckDetails,
    loader: ({ params }) => redirect(buildDeckDetailsRoute(params?.deckId)),
  },
  { path: LEGACY_ROUTE_PATHS.progress, element: <Navigate to={ROUTE_PATHS.progress} replace /> },
  { path: LEGACY_ROUTE_PATHS.account, element: <Navigate to={ROUTE_PATHS.account} replace /> },
  { path: LEGACY_ROUTE_PATHS.settings, element: <Navigate to={ROUTE_PATHS.settings} replace /> },
];
