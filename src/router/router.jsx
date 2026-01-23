import { Routes, Route } from "react-router-dom";
import { ROUTES } from "./routes";

export default function RoutesComponent() {
  return (
    <Routes>
      {ROUTES.map((route) => (
        <Route key={route.path} path={route.path} element={route.element} />
      ))}
    </Routes>
  );
}
