import { Navigate } from "react-router";
import { AppLayout } from "@app/layouts/AppLayout";
import { ROUTE_PATHS } from "@shared/config/routes";
import { RouteHydrateFallback } from "@shared/ui";

const toChildPath = (path) => path.replace(/^\//, "");
export const routes = [
  {
    path: ROUTE_PATHS.root,
    element: <AppLayout />,
    hydrateFallbackElement: <RouteHydrateFallback />,
    children: [
      { index: true, element: <Navigate to={ROUTE_PATHS.learn} replace /> },
      {
        path: toChildPath(ROUTE_PATHS.learn),
        lazy: async () => {
          const module = await import("@pages/learn");
          return { Component: module.LearnPage };
        },
      },
      {
        path: toChildPath(ROUTE_PATHS.decks),
        lazy: async () => {
          const module = await import("@pages/decks");
          return { Component: module.DecksPage };
        },
      },
      {
        path: toChildPath(ROUTE_PATHS.deckDetails),
        lazy: async () => {
          const module = await import("@pages/deck-details");
          return { Component: module.DeckDetailsPage };
        },
      },
      {
        path: toChildPath(ROUTE_PATHS.progress),
        lazy: async () => {
          const module = await import("@pages/progress");
          return { Component: module.ProgressPage };
        },
      },
      {
        path: toChildPath(ROUTE_PATHS.settings),
        lazy: async () => {
          const module = await import("@pages/settings");
          return { Component: module.SettingsPage };
        },
      },
      { path: "*", element: <Navigate to={ROUTE_PATHS.learn} replace /> },
    ],
  },
];
