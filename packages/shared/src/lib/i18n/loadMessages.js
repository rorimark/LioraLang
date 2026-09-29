import en from "./messages/en.js";
import { DEFAULT_LOCALE, isSupportedLocale } from "./locales.js";

// English ships with the app; every other language is its own small
// chunk, fetched when chosen.
const LOADERS = {
  uk: () => import("./messages/uk.js"),
  ru: () => import("./messages/ru.js"),
  pl: () => import("./messages/pl.js"),
  de: () => import("./messages/de.js"),
  es: () => import("./messages/es.js"),
  fr: () => import("./messages/fr.js"),
  it: () => import("./messages/it.js"),
  pt: () => import("./messages/pt.js"),
  tr: () => import("./messages/tr.js"),
  cs: () => import("./messages/cs.js"),
  ja: () => import("./messages/ja.js"),
};

const cache = { en };

export const ENGLISH_MESSAGES = en;

export const loadMessages = async (locale) => {
  const code = isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;

  if (!cache[code]) {
    try {
      cache[code] = (await LOADERS[code]()).default;
    } catch {
      return en;
    }
  }

  return cache[code];
};

export const getLoadedMessages = (locale) => cache[locale] || null;
