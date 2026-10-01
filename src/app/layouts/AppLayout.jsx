import { Outlet, useLocation, useNavigate } from "react-router";
import { DesktopTitleBar } from "@widgets/DesktopTitleBar";
import { NavBar } from "@widgets/NavbBar";
import { PageHeader } from "@widgets/PageHeader";
import { RuntimeErrorPresenter } from "@features/runtime-error";
import { usePlatformService } from "@shared/providers";
import { preloadRoutesForOffline } from "@app/router/preloadRoutesForOffline";
import { resolvePageMeta, ROUTE_PATHS } from "@shared/config/routes";
import { registerWebPwa } from "@shared/lib/pwa";
import { usePageMeta } from "@shared/lib/seo";
import { ToastViewport } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import { useEffect } from "react";
import "./AppLayout.css";

const normalizePathname = (pathname) => {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
};

export const AppLayout = () => {
  const navigate = useNavigate();
  const runtimeGateway = usePlatformService("runtimeGateway");
  const { pathname } = useLocation();
  const normalizedPathname = normalizePathname(pathname);
  const { t } = useI18n();
  const pageMeta = resolvePageMeta(normalizedPathname);
  const pageTitle = t(`${pageMeta.key}.title`);
  const isDesktopMode = runtimeGateway.isDesktopMode();
  const isLearnPage = normalizedPathname === ROUTE_PATHS.learn;
  const isSettingsPage = normalizedPathname === ROUTE_PATHS.settings;

  usePageMeta({
    title: `${pageTitle} - LioraLang`,
    description: t(`${pageMeta.key}.subtitle`),
  });

  useEffect(() => {
    if (!isDesktopMode) {
      return undefined;
    }

    if (
      runtimeGateway.hasPendingImportDeckFileRequest() &&
      normalizedPathname !== ROUTE_PATHS.decks
    ) {
      navigate(ROUTE_PATHS.decks);
    }

    return runtimeGateway.subscribeImportDeckFileRequested(() => {
      if (normalizedPathname !== ROUTE_PATHS.decks) {
        navigate(ROUTE_PATHS.decks);
      }
    });
  }, [isDesktopMode, navigate, normalizedPathname, runtimeGateway]);

  useEffect(() => {
    if (!isDesktopMode) {
      return undefined;
    }

    return runtimeGateway.subscribeNavigationRequested((payload) => {
      const nextRoute = typeof payload?.to === "string" ? payload.to.trim() : "";

      if (!nextRoute) {
        return;
      }

      const isSettingsMenuNavigation =
        payload?.source === "app-menu" &&
        typeof payload?.settingsTab === "string" &&
        payload.settingsTab.trim().length > 0;

      if (!isSettingsMenuNavigation) {
        navigate(nextRoute);
        return;
      }

      navigate(nextRoute, {
        state: {
          settingsMenuFocus: {
            source: "app-menu",
            tab: payload.settingsTab,
            token: payload.highlightToken || Date.now(),
          },
        },
      });
    });
  }, [isDesktopMode, navigate, runtimeGateway]);

  useEffect(() => {
    void registerWebPwa();
    preloadRoutesForOffline();
  }, []);

  return (
    <div className={isDesktopMode ? "app-frame app-frame--desktop" : "app-frame"}>
      <DesktopTitleBar />
      <div className="app-shell">
        <aside className="app-shell__sidebar">
          <NavBar />
        </aside>

        <div className="app-shell__main">
          {/* Learn has its own strip above the card; a page title there would
              only take height from the card. */}
          {isLearnPage ? null : <PageHeader title={pageTitle} />}
          <main
            className={
              [
                "app-shell__content",
                isLearnPage ? "app-shell__content--learn" : "",
                isSettingsPage ? "app-shell__content--settings" : "",
              ].filter(Boolean).join(" ")
            }
          >
            <Outlet />
          </main>
        </div>

        <div className="app-shell__mobile-nav">
          <NavBar mobile />
        </div>
      </div>
      <RuntimeErrorPresenter />
      <ToastViewport />
    </div>
  );
};
