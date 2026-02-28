import { useMemo } from "react";
import { useLocation } from "react-router";
import { NAV_ITEMS, ROUTE_PATHS } from "@shared/config/routes";
import { useShortcutSettings } from "@shared/lib/shortcutSettings";

const desktopNavItems = NAV_ITEMS.filter((item) => item.key !== "settings");
const settingsNavItem = NAV_ITEMS.find((item) => item.key === "settings");

const normalizePathname = (pathname) => {
  if (pathname === "/") {
    return pathname;
  }

  return pathname.replace(/\/+$/, "");
};

export const useNavBar = (mobile) => {
  const { pathname } = useLocation();
  const { shortcutSettings } = useShortcutSettings();
  const normalizedPathname = normalizePathname(pathname);

  const navItems = useMemo(
    () => (mobile ? NAV_ITEMS : desktopNavItems),
    [mobile],
  );
  const showLearnShortcuts =
    !mobile &&
    normalizedPathname === ROUTE_PATHS.learn &&
    shortcutSettings.showLearnShortcuts;

  return {
    navItems,
    settingsNavItem,
    showLearnShortcuts,
  };
};
