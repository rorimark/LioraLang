import { useCallback, useMemo } from "react";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { APP_THEME_MODES, isDarkThemeActive } from "@shared/lib/theme";

const THEME_MODE_OPTIONS = [
  {
    value: APP_THEME_MODES.system,
    label: "System (Default)",
  },
  {
    value: APP_THEME_MODES.light,
    label: "Light",
  },
  {
    value: APP_THEME_MODES.dark,
    label: "Dark",
  },
];

const normalizeThemeMode = (value) => {
  if (
    value === APP_THEME_MODES.system ||
    value === APP_THEME_MODES.light ||
    value === APP_THEME_MODES.dark
  ) {
    return value;
  }

  return APP_THEME_MODES.system;
};

export const useThemeSwitch = () => {
  const { appPreferences, updateAppPreferences } = useAppPreferences();
  const themeMode = normalizeThemeMode(appPreferences.uiAccessibility.themeMode);

  const handleThemeModeChange = useCallback(
    (event) => {
      const nextThemeMode = normalizeThemeMode(event.target.value);

      updateAppPreferences({
        uiAccessibility: {
          themeMode: nextThemeMode,
        },
      });
    },
    [updateAppPreferences],
  );

  const themeModeOptions = useMemo(() => THEME_MODE_OPTIONS, []);

  const setThemeMode = useCallback(
    (nextThemeMode) => {
      updateAppPreferences({
        uiAccessibility: {
          themeMode: normalizeThemeMode(nextThemeMode),
        },
      });
    },
    [updateAppPreferences],
  );

  return {
    themeMode,
    themeModeOptions,
    isDarkTheme: isDarkThemeActive(themeMode),
    handleThemeModeChange,
    setThemeMode,
  };
};
