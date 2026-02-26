import { memo, useCallback, useMemo } from "react";
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router";
import { ROUTE_PATHS } from "@shared/config/routes";
import "./RouteErrorBoundary.css";

const resolveErrorPayload = (routeError) => {
  if (isRouteErrorResponse(routeError)) {
    return {
      title: `${routeError.status} ${routeError.statusText || "Route error"}`,
      message:
        typeof routeError.data === "string"
          ? routeError.data
          : "The requested route failed to render.",
      stack: "",
    };
  }

  if (routeError instanceof Error) {
    return {
      title: "Unexpected Application Error",
      message: routeError.message || "Unknown runtime error",
      stack: routeError.stack || "",
    };
  }

  return {
    title: "Unexpected Application Error",
    message: "Unknown runtime error",
    stack: "",
  };
};

export const RouteErrorBoundary = memo(() => {
  const navigate = useNavigate();
  const routeError = useRouteError();
  const { title, message, stack } = useMemo(
    () => resolveErrorPayload(routeError),
    [routeError],
  );

  const goToLearn = useCallback(() => {
    navigate(ROUTE_PATHS.learn, { replace: true });
  }, [navigate]);

  const reloadApp = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <section className="route-error-boundary" role="alert">
      <article className="route-error-boundary__card">
        <p className="route-error-boundary__kicker">LioraLang runtime guard</p>
        <h1 className="route-error-boundary__title">{title}</h1>
        <p className="route-error-boundary__message">{message}</p>

        <div className="route-error-boundary__actions">
          <button type="button" onClick={goToLearn}>
            Go to Learn
          </button>
          <button
            type="button"
            className="route-error-boundary__button-secondary"
            onClick={reloadApp}
          >
            Reload app
          </button>
        </div>

        {import.meta.env.DEV && stack && (
          <details className="route-error-boundary__details">
            <summary>Stack trace</summary>
            <pre>{stack}</pre>
          </details>
        )}
      </article>
    </section>
  );
});

RouteErrorBoundary.displayName = "RouteErrorBoundary";
