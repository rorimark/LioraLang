import { useCallback, useEffect, useState } from "react";
import { APP_THEMES, applyTheme, getSavedTheme, saveTheme } from "@shared/lib/theme";

export const useThemeSwitch = () => {
  const [theme, setTheme] = useState(() => getSavedTheme());

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) =>
      currentTheme === APP_THEMES.dark ? APP_THEMES.light : APP_THEMES.dark,
    );
  }, []);

  return {
    theme,
    isDarkTheme: theme === APP_THEMES.dark,
    toggleTheme,
  };
};
