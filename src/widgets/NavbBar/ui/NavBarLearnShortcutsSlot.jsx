import { memo } from "react";
import { useLocation } from "react-router";
import { useShortcutSettings } from "@shared/lib/shortcutSettings";
import { ROUTE_PATHS } from "@shared/config/routes";
import { NavBarLearnShortcuts } from "./NavBarLearnShortcuts";

const normalizePathname = (pathname) => {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
};

export const NavBarLearnShortcutsSlot = memo(() => {
  const { pathname } = useLocation();
  const { shortcutSettings } = useShortcutSettings();
  const normalizedPathname = normalizePathname(pathname);

  if (normalizedPathname !== ROUTE_PATHS.learn) {
    return null;
  }

  if (!shortcutSettings.showLearnShortcuts) {
    return null;
  }

  return <NavBarLearnShortcuts />;
});

NavBarLearnShortcutsSlot.displayName = "NavBarLearnShortcutsSlot";
