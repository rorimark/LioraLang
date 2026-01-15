import "./Sidebar.css";
import { ROUTES } from "../../../router/routes.jsx";
import SidebarTab from "../../ui/SidebarTab/SidebarTab";

export default function Sidebar() {
  return (
    <nav className="sidebar">
      <header>
        <h1 className="sidebar-title">LioraLang</h1>
        <hr />
      </header>
      <ul className="sidebar-list">
        {ROUTES.map((route) => (
          <li key={route.label}>
            <SidebarTab
              label={route.label}
              path={route.path}
              icon={route.icon}
            />
          </li>
        ))}
      </ul>
      <hr />
      <p className="copyright-text">
        Copyright © 2026 Mark Storchovyi. All rights reserved.
      </p>
    </nav>
  );
}
