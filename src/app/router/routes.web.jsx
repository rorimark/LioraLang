import { Navigate } from "react-router";
import { ROUTE_PATHS } from "@shared/config/routes";
import { RouteHydrateFallback } from "@shared/ui";
import { appRoute, legacyRoutes, loadRouteComponent } from "./routes.base";

export const routes = [
  {
    path: ROUTE_PATHS.root,
    // Set here, not only inside lazy(): during the first render the lazy
    // module has not loaded yet, so React Router cannot see its fallback.
    HydrateFallback: RouteHydrateFallback,
    lazy: loadRouteComponent(() => import("@pages/landing/ui/LandingPage")),
  },
  {
    path: ROUTE_PATHS.shareDeck,
    HydrateFallback: RouteHydrateFallback,
    lazy: loadRouteComponent(() => import("@pages/share/ui/ShareDeckRedirectPage")),
  },
  appRoute,
  ...legacyRoutes,
  { path: "*", element: <Navigate to={ROUTE_PATHS.landing} replace /> },
];
