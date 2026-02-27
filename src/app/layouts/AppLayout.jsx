import { Outlet, useLocation, useNavigate } from "react-router";
import { DesktopTitleBar, NavBar, PageHeader } from "@widgets";
import { desktopApi } from "@shared/api";
import { resolvePageMeta, ROUTE_PATHS } from "@shared/config/routes";
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
    </div>
  );
};
