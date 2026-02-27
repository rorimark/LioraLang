import { useEffect } from "react";
import "./styles/App.css";
import { AppRouter } from "@app/router";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { applyTheme, getSavedTheme } from "@shared/lib/theme";

export const App = () => {
  const { appPreferences } = useAppPreferences();

  useEffect(() => {
    applyTheme(getSavedTheme());
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    const accessibility = appPreferences.uiAccessibility;

    root.setAttribute("ui-font-scale", accessibility.fontScale);
    root.setAttribute("ui-compact", String(accessibility.compactMode));
    root.setAttribute("ui-reduced-motion", String(accessibility.reducedMotion));
    root.setAttribute("ui-high-contrast", String(accessibility.highContrast));
  }, [appPreferences.uiAccessibility]);

  return <AppRouter />;
};
