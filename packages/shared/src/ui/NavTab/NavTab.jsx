import "./NavTab.css";
import { NavLink } from "react-router";

export const NavTab = ({
  to = "/",
  title = "TabTitle",
  icon: Icon,
  activeIcon: ActiveIcon,
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
      {({ isActive }) => {
        // The section you are in shows its filled icon.
        const ShownIcon = isActive && ActiveIcon ? ActiveIcon : Icon;

        return (
          <>
            {ShownIcon && <ShownIcon aria-hidden="true" />}
            <span>{title}</span>
          </>
        );
      }}
    </NavLink>
  );
};
