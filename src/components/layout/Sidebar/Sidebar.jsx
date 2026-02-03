import "./Sidebar.css";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../router/routes";
import SidebarTab from "../../ui/SidebarTab/SidebarTab";
import Logo from "../../ui/Logo/Logo";
import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const NAVIGABLE_ROUTES = ROUTES.filter((route) => route.path !== "*");

export default function Sidebar({ isMobileOpen = false, onClose }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", isCollapsed);
  }, [isCollapsed]);

  const toggleSidebar = () => {
    if (isMobile) {
      if (onClose) onClose();
    } else {
      setIsCollapsed(!isCollapsed);
    }
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <nav
      className={`sidebar ${isCollapsed ? "sidebar--collapsed" : ""} ${isMobileOpen ? "mobile-open" : ""}`}
      aria-label="Main navigation"
    >
      <header>
        <Link
          to="/"
          aria-label="Home"
          className="sidebar__header-link"
          onClick={handleLinkClick}
        >
          <Logo />
          {!isCollapsed && <h1 className="sidebar-title">LioraLang</h1>}
        </Link>

        {!isMobile && (
          <button
            className="sidebar__collapse-btn desktop-only"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Развернуть" : "Свернуть"}
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <ChevronLeft size={20} />
            )}
          </button>
        )}

        {/* {isMobile && (
          <button
            className="sidebar__close-btn mobile-only"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        )} */}
      </header>

      <ul className="sidebar-list">
        {NAVIGABLE_ROUTES.map((route) => (
          <li key={route.label}>
            <SidebarTab
              label={route.label}
              path={route.path}
              icon={route.icon}
              isCollapsed={isCollapsed}
              onClick={handleLinkClick}
            />
          </li>
        ))}
      </ul>

      <footer>
        {/* Всегда показываем копирайт, но в разном формате */}
        {!isCollapsed ? (
          <p className="copyright-text">
            Copyright © 2026 Mark Storchovyi. All rights reserved.
          </p>
        ) : (
          <div className="collapsed-copyright">© 2026</div>
        )}
      </footer>
    </nav>
  );
}
