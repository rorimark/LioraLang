import { Navigate } from "react-router";
import { AppLayout } from "@app/layouts/AppLayout";
import {
  BrowsePage,
  DeckDetailsPage,
  DeckEditorPage,
  DecksPage,
  LearnPage,
  ProgressPage,
  SettingsPage,
} from "@pages";
import { ROUTE_PATHS } from "@shared/config/routes";
import { RouteErrorBoundary, RouteHydrateFallback } from "@shared/ui";

const toChildPath = (path) => path.replace(/^\//, "");
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
        element: <LearnPage />,
      },
      {
        path: toChildPath(ROUTE_PATHS.browse),
        element: <BrowsePage />,
      },
      {
        path: toChildPath(ROUTE_PATHS.decks),
        element: <DecksPage />,
      },
      {
        path: toChildPath(ROUTE_PATHS.deckCreate),
        element: <DeckEditorPage />,
      },
      {
        path: toChildPath(ROUTE_PATHS.deckEdit),
        element: <DeckEditorPage />,
      },
      {
        path: toChildPath(ROUTE_PATHS.deckDetails),
        element: <DeckDetailsPage />,
      },
      {
        path: toChildPath(ROUTE_PATHS.progress),
        element: <ProgressPage />,
      },
      {
        path: toChildPath(ROUTE_PATHS.settings),
        element: <SettingsPage />,
      },
      { path: "*", element: <Navigate to={ROUTE_PATHS.learn} replace /> },
    ],
  },
];
