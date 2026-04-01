import { getPlatformServices } from "@shared/platform";

const SYSTEM_THEME_MEDIA_QUERY = "(prefers-color-scheme: dark)";

export const APP_THEMES = {
  light: "light",
  dark: "dark",
};

export const APP_THEME_MODES = {
  system: "system",
  light: "light",
  dark: "dark",
};

const isBrowser = typeof window !== "undefined";

const normalizeThemeMode = (themeMode) => {
  if (
    themeMode === APP_THEME_MODES.system ||
    themeMode === APP_THEME_MODES.light ||
    themeMode === APP_THEME_MODES.dark
  ) {
    return themeMode;
  }

  return APP_THEME_MODES.system;
};

const getSystemTheme = () => {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return APP_THEMES.light;
  }

  return window.matchMedia(SYSTEM_THEME_MEDIA_QUERY).matches
    ? APP_THEMES.dark
    : APP_THEMES.light;
};

export const getSavedThemeMode = () => {
  return APP_THEME_MODES.system;
};

export const saveThemeMode = () => {};

export const resolveAppliedTheme = (themeMode) => {
  const normalizedMode = normalizeThemeMode(themeMode);

  if (normalizedMode === APP_THEME_MODES.dark) {
    return APP_THEMES.dark;
  }

  if (normalizedMode === APP_THEME_MODES.light) {
    return APP_THEMES.light;
  }

  return getSystemTheme();
};

export const isDarkThemeActive = (themeMode) => {
  return resolveAppliedTheme(themeMode) === APP_THEMES.dark;
};

export const applyThemeMode = (themeMode) => {
  const resolvedTheme = resolveAppliedTheme(themeMode);
  const runtimeGateway = getPlatformServices().runtimeGateway;

  if (typeof document === "undefined") {
    return resolvedTheme;
  }

  const root = document.documentElement;

  if (resolvedTheme === APP_THEMES.dark) {
    root.setAttribute("theme", APP_THEMES.dark);
    void runtimeGateway.applyWindowTheme(APP_THEMES.dark).catch(() => {});
    return resolvedTheme;
  }

  root.removeAttribute("theme");
  void runtimeGateway.applyWindowTheme(APP_THEMES.light).catch(() => {});

  return resolvedTheme;
};

export const getSystemThemeMediaQuery = () => {
  if (!isBrowser || typeof window.matchMedia !== "function") {
    return null;
  }

  return window.matchMedia(SYSTEM_THEME_MEDIA_QUERY);
};

export const getSavedTheme = () => resolveAppliedTheme(getSavedThemeMode());

export const saveTheme = () => {};

export const applyTheme = (theme) => {
  if (theme === APP_THEMES.dark) {
    return applyThemeMode(APP_THEME_MODES.dark);
  }

  return applyThemeMode(APP_THEME_MODES.light);
};
