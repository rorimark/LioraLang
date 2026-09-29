import { useEffect } from "react";
import "@fontsource-variable/nunito";
import "./styles/App.css";
import { AppRouter } from "@app/router";
import { useStartupPreferences } from "@shared/lib/appPreferences";
import { usePointerFocusGuard } from "@shared/lib/a11y";
import { useActionLogger } from "@shared/lib/debug";
import { usePlatformService } from "@shared/providers";
import { I18nProvider, readStoredLocaleChoice } from "@shared/lib/i18n";
import {
  APP_THEME_MODES,
  applyThemeMode,
  getSystemThemeMediaQuery,
} from "@shared/lib/theme";

export const App = ({ initialLocale }) => {
  usePointerFocusGuard();
  useActionLogger();
  const syncRepository = usePlatformService("syncRepository");

  const { startupPreferences, isLoaded } = useStartupPreferences();
  // The language this device started in, until the settings say which one
  // was chosen: no flash of another language while they load.
  const languageChoice = isLoaded
    ? startupPreferences.uiAccessibility.interfaceLanguage
    : readStoredLocaleChoice();
  const themeMode = startupPreferences.uiAccessibility.themeMode;

  useEffect(() => {
    void syncRepository.getStatus();

    const unsubscribe = syncRepository.subscribe(() => {});

    return () => {
      unsubscribe?.();
    };
  }, [syncRepository]);

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

  return (
    <I18nProvider choice={languageChoice} initialLocale={initialLocale}>
      <AppRouter />
    </I18nProvider>
  );
};
