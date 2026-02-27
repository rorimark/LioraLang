import { desktopApi } from "@shared/api";

const THEME_STORAGE_KEY = "lioralang-theme";

export const APP_THEMES = {
  light: "light",
  dark: "dark",
};

const isBrowser = typeof window !== "undefined";

export const getSavedTheme = () => {
  if (!isBrowser) {
    return APP_THEMES.light;
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === APP_THEMES.dark) {
    return APP_THEMES.dark;
  }

  return APP_THEMES.light;
};

export const saveTheme = (theme) => {
  if (!isBrowser) {
    return;
  }

  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
};

export const applyTheme = (theme) => {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;

  if (theme === APP_THEMES.dark) {
    root.setAttribute("theme", APP_THEMES.dark);
    void desktopApi.applyWindowTheme(APP_THEMES.dark).catch(() => {});
    return;
  }

  root.removeAttribute("theme");
  void desktopApi.applyWindowTheme(APP_THEMES.light).catch(() => {});
};
