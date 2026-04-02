import "./NavTab.css";
import { NavLink } from "react-router";

export const NavTab = ({
  to = "/",
  title = "TabTitle",
  icon: Icon,
  compact = false,
  draggable = false,
  ...props
}) => {
  const resolveClassName = ({ isActive }) =>
    `nav-tab ${compact ? "nav-tab--compact" : ""} ${isActive ? "is-active" : ""}`;

  return (
    <NavLink
      to={to}
      className={resolveClassName}
      draggable={draggable}
      {...props}
    >
      {Icon && <Icon />}
      <span>{title}</span>
    </NavLink>
  );
};
