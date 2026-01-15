// import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "./routes.jsx";
import { Routes, Route } from "react-router-dom";

// export const router = createBrowserRouter(ROUTES);

export default function RoutesComponent() {
  return (
    <Routes>
      {ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}
