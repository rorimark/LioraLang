import { memo } from "react";
import appIconUrl from "./app-icon.png";

// The app's icon (the same art as the desktop build and the PWA install),
// imported as a module so it resolves under both the web and the desktop
// build, which load from different base paths. Decorative: the product
// name is always written next to it.
export const AppIcon = memo(({ size = 32, className = "" }) => (
  <img
    src={appIconUrl}
    alt=""
    width={size}
    height={size}
    className={["app-icon", className].filter(Boolean).join(" ")}
    draggable="false"
  />
));

AppIcon.displayName = "AppIcon";
