import { Navigate } from "react-router";
import { ROUTE_PATHS } from "@shared/config/routes";
import { appRoute, legacyRoutes, loadRouteComponent } from "./routes.base";

export const routes = [
  {
    path: ROUTE_PATHS.root,
    lazy: loadRouteComponent(() => import("@pages/landing/ui/LandingPage")),
  },
  {
    path: ROUTE_PATHS.shareDeck,
    lazy: loadRouteComponent(() => import("@pages/share/ui/ShareDeckRedirectPage")),
  },
  appRoute,
  ...legacyRoutes,
  { path: "*", element: <Navigate to={ROUTE_PATHS.landing} replace /> },
];
