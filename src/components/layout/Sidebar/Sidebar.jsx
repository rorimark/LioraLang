import "./Sidebar.css";
import { Link } from "react-router-dom";
import { ROUTES } from "../../../router/routes";
import SidebarTab from "../../ui/SidebarTab/SidebarTab";
import Logo from "../../ui/Logo/Logo";

const NAVIGABLE_ROUTES = ROUTES.filter((route) => route.path !== "*");

export default function Sidebar() {
  return (
    <nav className="sidebar" aria-label="Main navigation">
      <header>
        <Link to="/" aria-label="Home">
          <Logo />
        </Link>
        <h1 className="sidebar-title">LioraLang</h1>
      </header>
      <ul className="sidebar-list">
        {NAVIGABLE_ROUTES.map((route) => (
          <li key={route.label}>
            <SidebarTab
              label={route.label}
              path={route.path}
              icon={route.icon}
            />
          </li>
        ))}
      </ul>
      <footer>
        <p className="copyright-text">
          Copyright © 2026 Mark Storchovyi. All rights reserved.
        </p>
      </footer>
    </nav>
  );
}
