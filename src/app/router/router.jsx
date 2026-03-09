import { createBrowserRouter, RouterProvider } from "react-router";
import { RouteHydrateFallback } from "@shared/ui";
import { routes } from "@app-router-routes";

const router = createBrowserRouter(routes);

export const AppRouter = () => {
  return <RouterProvider router={router} fallbackElement={<RouteHydrateFallback />} />;
};
