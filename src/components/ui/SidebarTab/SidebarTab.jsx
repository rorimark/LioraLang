import { NavLink } from "react-router-dom";
import "./SidebarTab.css";

export default function SidebarTab({
  label,
  path,
  icon,
  isCollapsed,
  onClick,
}) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        `sidebar-tab ${isActive ? "sidebar-tab--active" : ""} ${isCollapsed ? "sidebar-tab--collapsed" : ""} ${isCollapsed && isActive ? "sidebar-tab--collapsed--active" : ""}`
      }
      title={isCollapsed ? label : undefined}
      onClick={onClick}
    >
      {icon && (
        <img
          src={icon}
          alt={label}
          className={`sidebar-tab__icon ${isCollapsed ? "sidebar-tab__icon--collapsed" : ""}`}
        />
      )}
      {!isCollapsed && <span className="sidebar-tab__label">{label}</span>}
      {isCollapsed && <span className="sidebar-tab__tooltip">{label}</span>}
    </NavLink>
  );
}
