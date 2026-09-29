import { memo, useCallback, useMemo } from "react";
import {
  isRouteErrorResponse,
  useNavigate,
  useRouteError,
} from "react-router";
import { ROUTE_PATHS } from "@shared/config/routes";
import { useI18n } from "@shared/lib/i18n";
import "./RouteErrorBoundary.css";

const resolveErrorPayload = (routeError, t) => {
  if (isRouteErrorResponse(routeError)) {
    return {
      title: `${routeError.status} ${routeError.statusText || t("errors.route.title")}`,
      message:
        typeof routeError.data === "string"
          ? routeError.data
          : t("errors.route.message"),
      stack: "",
    };
  }

  if (routeError instanceof Error) {
    return {
      title: t("errors.unexpected.title"),
      message: routeError.message || t("errors.unexpected.message"),
      stack: routeError.stack || "",
    };
  }

  return {
    title: t("errors.unexpected.title"),
    message: t("errors.unexpected.message"),
    stack: "",
  };
};

export const RouteErrorBoundary = memo(() => {
  const navigate = useNavigate();
  const routeError = useRouteError();
  const { t } = useI18n();
  const { title, message, stack } = useMemo(
    () => resolveErrorPayload(routeError, t),
    [routeError, t],
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
        <p className="route-error-boundary__kicker">{t("errors.kicker")}</p>
        <h1 className="route-error-boundary__title">{title}</h1>
        <p className="route-error-boundary__message">{message}</p>

        <div className="route-error-boundary__actions">
          <button type="button" onClick={goToLearn}>
            {t("errors.goToLearn")}
          </button>
          <button
            type="button"
            className="route-error-boundary__button-secondary"
            onClick={reloadApp}
          >
            {t("errors.reload")}
          </button>
        </div>

        {import.meta.env.DEV && stack && (
          <details className="route-error-boundary__details">
            <summary>{t("errors.stack")}</summary>
            <pre>{stack}</pre>
          </details>
        )}
      </article>
    </section>
  );
});

RouteErrorBoundary.displayName = "RouteErrorBoundary";
