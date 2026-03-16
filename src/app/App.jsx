import { useEffect } from "react";
import "./styles/App.css";
import { AppRouter } from "@app/router";
import { useStartupPreferences } from "@shared/lib/appPreferences";
import { usePointerFocusGuard } from "@shared/lib/a11y";
import { useActionLogger } from "@shared/lib/debug";
import {
  APP_THEME_MODES,
  applyThemeMode,
  getSystemThemeMediaQuery,
} from "@shared/lib/theme";

export const App = () => {
  usePointerFocusGuard();
  useActionLogger();

  const { startupPreferences } = useStartupPreferences();
  const themeMode = startupPreferences.uiAccessibility.themeMode;

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  useEffect(() => {
    if (themeMode !== APP_THEME_MODES.system) {
      return undefined;
    }

    const mediaQuery = getSystemThemeMediaQuery();

    if (!mediaQuery) {
      return undefined;
    }

    const handleChange = () => {
      applyThemeMode(APP_THEME_MODES.system);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    }

    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleChange);

      return () => {
        mediaQuery.removeListener(handleChange);
      };
    }

    return undefined;
  }, [themeMode]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const accessibility = startupPreferences.uiAccessibility;

    root.setAttribute("ui-font-scale", accessibility.fontScale);
    root.setAttribute("ui-compact", String(accessibility.compactMode));
    root.setAttribute("ui-reduced-motion", String(accessibility.reducedMotion));
    root.setAttribute("ui-high-contrast", String(accessibility.highContrast));
  }, [startupPreferences.uiAccessibility]);

  return <AppRouter />;
};
