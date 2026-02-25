import { Outlet, useLocation } from "react-router";
import { NavBar, PageHeader } from "@widgets";
import { resolvePageMeta } from "@shared/config/routes";
import "./AppLayout.css";

const normalizePathname = (pathname) => {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
};

export const AppLayout = () => {
  const { pathname } = useLocation();
  const normalizedPathname = normalizePathname(pathname);
  const pageMeta = resolvePageMeta(normalizedPathname);

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <NavBar />
      </aside>

      <div className="app-shell__main">
        <PageHeader title={pageMeta.title} subtitle={pageMeta.subtitle} />
        <main className="app-shell__content">
          <Outlet />
        </main>
      </div>

      <div className="app-shell__mobile-nav">
        <NavBar mobile />
      </div>
    </div>
  );
};
