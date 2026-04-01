import "./NavTab.css";
import { NavLink } from "react-router";

export const NavTab = ({
  to = "/",
  title = "TabTitle",
  icon: Icon,
  compact = false,
}) => {
  const resolveClassName = ({ isActive }) =>
    `nav-tab ${compact ? "nav-tab--compact" : ""} ${isActive ? "is-active" : ""}`;

  return (
    <NavLink to={to} className={resolveClassName}>
      {Icon && <Icon />}
      <span>{title}</span>
    </NavLink>
  );
};
