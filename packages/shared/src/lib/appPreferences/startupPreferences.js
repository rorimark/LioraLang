import { AUTO_LOCALE, LOCALE_CODES } from "../i18n/locales.js";

const THEME_MODE_OPTIONS = new Set(["system", "light", "dark"]);
const INTERFACE_LANGUAGE_OPTIONS = new Set([AUTO_LOCALE, ...LOCALE_CODES]);
const FONT_SCALE_OPTIONS = new Set(["small", "normal", "large"]);

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
};

const toOneOf = (value, options, fallback) => {
  return options.has(value) ? value : fallback;
};

export const DEFAULT_STARTUP_PREFERENCES = {
  uiAccessibility: {
    interfaceLanguage: AUTO_LOCALE,
    themeMode: "system",
    fontScale: "normal",
    compactMode: false,
    reducedMotion: false,
    highContrast: false,
  },
};

export const normalizeStartupPreferences = (value = {}) => {
  const uiAccessibility = value?.uiAccessibility || {};

  return {
    uiAccessibility: {
      interfaceLanguage: toOneOf(
        toCleanString(uiAccessibility.interfaceLanguage),
        INTERFACE_LANGUAGE_OPTIONS,
        DEFAULT_STARTUP_PREFERENCES.uiAccessibility.interfaceLanguage,
      ),
      themeMode: toOneOf(
        toCleanString(uiAccessibility.themeMode),
        THEME_MODE_OPTIONS,
        DEFAULT_STARTUP_PREFERENCES.uiAccessibility.themeMode,
      ),
      fontScale: toOneOf(
        toCleanString(uiAccessibility.fontScale),
        FONT_SCALE_OPTIONS,
        DEFAULT_STARTUP_PREFERENCES.uiAccessibility.fontScale,
      ),
      compactMode: toBoolean(
        uiAccessibility.compactMode,
        DEFAULT_STARTUP_PREFERENCES.uiAccessibility.compactMode,
      ),
      reducedMotion: toBoolean(
        uiAccessibility.reducedMotion,
        DEFAULT_STARTUP_PREFERENCES.uiAccessibility.reducedMotion,
      ),
      highContrast: toBoolean(
        uiAccessibility.highContrast,
        DEFAULT_STARTUP_PREFERENCES.uiAccessibility.highContrast,
      ),
    },
  };
};
