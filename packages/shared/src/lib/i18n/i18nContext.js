import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, resolveDeckLanguageCode } from "./locales.js";
import { ENGLISH_MESSAGES } from "./loadMessages.js";
import { createTranslator } from "./translator.js";

const capitalize = (text, locale) =>
  text ? text.charAt(0).toLocaleUpperCase(locale) + text.slice(1) : text;

// Everything a component needs to speak the interface's language.
export const buildI18nValue = (locale, messages) => {
  const t = createTranslator({ locale, messages, fallbackMessages: ENGLISH_MESSAGES });
  const numberFormat = new Intl.NumberFormat(locale);
  let languageNames = null;

  try {
    languageNames = new Intl.DisplayNames([locale], { type: "language" });
  } catch {
    languageNames = null;
  }

  const unitFormats = {};
  const formatUnit = (value, unit) => {
    if (!unitFormats[unit]) {
      unitFormats[unit] = new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "short" });
    }

    return unitFormats[unit].format(value);
  };

  const longUnitFormats = {};
  // "3 months", "1 year": a whole unit, written out.
  const formatUnitLong = (value, unit) => {
    if (!longUnitFormats[unit]) {
      longUnitFormats[unit] = new Intl.NumberFormat(locale, { style: "unit", unit, unitDisplay: "long" });
    }

    return longUnitFormats[unit].format(value);
  };

  return {
    locale,
    t,
    formatUnitLong,
    // "10m", "12h", "7d" as the scheduler writes them, the language's way:
    // "10 мин", "12 Std.", "7日".
    formatInterval: (compact) => {
      const match = /^(\d+)([mhd])$/.exec(String(compact || "").trim());

      if (!match) {
        return String(compact || "");
      }

      return formatUnit(Number(match[1]), { m: "minute", h: "hour", d: "day" }[match[2]]);
    },
    // A part of speech as stored ("noun") in the interface's language, or
    // as written when it is not one the app knows.
    partOfSpeechName: (value) => {
      const key = `partOfSpeech.${String(value || "").trim().toLowerCase()}`;
      const name = t(key);
      return name === key ? String(value || "") : name;
    },
    // What went wrong, said in the interface's language. An error may carry
    // its own message key; otherwise the caller's is used. The technical
    // cause goes to the console, where it helps and does not confuse.
    errorText: (error, fallbackKey, params) => {
      if (error) {
        console.warn(error);
      }

      return error?.i18nKey ? t(error.i18nKey, error.i18nParams) : t(fallbackKey, params);
    },
    // A file size the language's way: "12,4 kB", "1.25 MB".
    formatBytes: (bytes) => {
      const value = Number(bytes);

      if (!Number.isFinite(value) || value <= 0) {
        return "";
      }

      if (value < 1024) {
        return formatUnit(value, "byte");
      }

      return value < 1024 * 1024
        ? formatUnit(Math.round((value / 1024) * 10) / 10, "kilobyte")
        : formatUnit(Math.round((value / 1024 / 1024) * 100) / 100, "megabyte");
    },
    formatPercent: (value) =>
      new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }).format((Number(value) || 0) / 100),
    formatNumber: (value) => numberFormat.format(Number(value) || 0),
    formatDate: (value, options = { dateStyle: "medium" }) => {
      const date = value instanceof Date ? value : new Date(value);
      return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(locale, options).format(date);
    },
    // A deck language ("Ukrainian", as stored) named in the interface's
    // language: "Ukrainisch", "Украинский", "ウクライナ語".
    languageName: (name) => {
      const code = resolveDeckLanguageCode(name);
      const localized = code && languageNames ? languageNames.of(code) : "";
      return localized ? capitalize(localized, locale) : String(name || "");
    },
  };
};

export const I18nContext = createContext(buildI18nValue(DEFAULT_LOCALE, ENGLISH_MESSAGES));

export const useI18n = () => useContext(I18nContext);
