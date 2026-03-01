import { Outlet, useLocation, useNavigate } from "react-router";
import { DesktopTitleBar, NavBar, PageHeader } from "@widgets";
import { RuntimeErrorPresenter } from "@features/runtime-error";
import { desktopApi } from "@shared/api";
import { resolvePageMeta, ROUTE_PATHS } from "@shared/config/routes";
import { ToastViewport } from "@shared/ui";
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
  const { pathname } = useLocation();
  const normalizedPathname = normalizePathname(pathname);
  const pageMeta = resolvePageMeta(normalizedPathname);
  const isDesktopMode = desktopApi.isDesktopMode();
  const isLearnPage = normalizedPathname === "/learn";

  useEffect(() => {
    if (!isDesktopMode) {
      return undefined;
    }

    if (
      desktopApi.hasPendingImportDeckFileRequest() &&
      normalizedPathname !== ROUTE_PATHS.decks
    ) {
      navigate(ROUTE_PATHS.decks);
    }

    return desktopApi.subscribeImportDeckFileRequested(() => {
      if (normalizedPathname !== ROUTE_PATHS.decks) {
        navigate(ROUTE_PATHS.decks);
      }
    });
  }, [isDesktopMode, navigate, normalizedPathname]);

  useEffect(() => {
    if (!isDesktopMode) {
      return undefined;
    }

    return desktopApi.subscribeNavigationRequested((payload) => {
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
  }, [isDesktopMode, navigate]);

  return (
    <div className={isDesktopMode ? "app-frame app-frame--desktop" : "app-frame"}>
      <DesktopTitleBar />
      <div className="app-shell">
        <aside className="app-shell__sidebar">
          <NavBar />
        </aside>

        <div className="app-shell__main">
          <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} />
          <main
            className={
              isLearnPage ? "app-shell__content app-shell__content--learn" : "app-shell__content"
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
