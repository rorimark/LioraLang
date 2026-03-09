import { Navigate } from "react-router";
import { ROUTE_PATHS } from "@shared/config/routes";
import { appRoute, legacyRoutes } from "./routes.base";

export const routes = [
  { path: ROUTE_PATHS.root, element: <Navigate to={ROUTE_PATHS.learn} replace /> },
  appRoute,
  ...legacyRoutes,
  { path: "*", element: <Navigate to={ROUTE_PATHS.learn} replace /> },
];

