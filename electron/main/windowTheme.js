export const createWindowThemeManager = ({
  platform,
  windowTitleBarHeight,
  windowTitleBarTheme,
}) => {
  const resolveTitleBarTheme = (themeValue) => {
    if (themeValue === "dark") {
      return windowTitleBarTheme.dark;
    }

    return windowTitleBarTheme.light;
  };

  const applyWindowTitleBarTheme = (targetWindow, themeValue) => {
    if (!targetWindow || platform === "darwin") {
      return false;
    }

    const theme = resolveTitleBarTheme(themeValue);

    try {
      targetWindow.setTitleBarOverlay({
        color: theme.color,
        symbolColor: theme.symbolColor,
        height: windowTitleBarHeight,
      });

      return true;
    } catch {
      return false;
    }
  };

  return {
    applyWindowTitleBarTheme,
  };
};
