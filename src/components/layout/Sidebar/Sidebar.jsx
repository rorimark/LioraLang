import "./Sidebar.css";
import { ROUTES } from "../../../router/routes.jsx";
import SidebarTab from "../../ui/SidebarTab/SidebarTab";
import Logo from "../../ui/Logo/Logo.jsx";

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <header>
        <Logo />
        <h1 className="sidebar-title">LioraLang</h1>
        {/* <hr /> */}
      </header>
      <ul className="sidebar-list">
        {ROUTES.slice(1).map((route) => (
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
