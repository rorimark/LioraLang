/* global __APP_TARGET__ */
import { createBrowserRouter, createHashRouter, RouterProvider } from "react-router";
import { routes } from "@app-router-routes";

const isDesktopTarget = __APP_TARGET__ === "desktop";
const router = isDesktopTarget
  ? createHashRouter(routes)
  : createBrowserRouter(routes);

export const AppRouter = () => {
  // Loading states come from each route's HydrateFallback; React Router 7
  // has no fallbackElement prop.
  return <RouterProvider router={router} />;
};
