import { NavLink } from "react-router-dom";
import "./SidebarTab.css";

export default function SidebarTab({ label, path, icon }) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `sidebar-tab ${isActive ? "sidebar-tab--active" : ""}`
      }
    >
      {icon && <img src={icon} alt={label} className="sidebar-tab__icon" />}
      <span className="sidebar-tab__label">{label}</span>
    </NavLink>
  );
}
