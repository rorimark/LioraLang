import { memo } from "react";
import "./Panel.css";

export const Panel = memo(({ as: Component = "article", className = "", ...props }) => {
  const resolvedClassName = ["panel", "ui-panel", className]
    .filter(Boolean)
    .join(" ");

  return <Component className={resolvedClassName} {...props} />;
});

Panel.displayName = "Panel";
