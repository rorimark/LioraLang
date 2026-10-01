import english from "./messages/landing/en.js";
import { ENGLISH_MESSAGES, loadMessages } from "./loadMessages.js";

// The landing's copy is its own catalogue, so the desktop app, which has
// no landing, never ships it. Import this file only from the landing.
const LOADERS = {
  uk: () => import("./messages/landing/uk.js"),
  ru: () => import("./messages/landing/ru.js"),
  pl: () => import("./messages/landing/pl.js"),
  de: () => import("./messages/landing/de.js"),
  es: () => import("./messages/landing/es.js"),
  fr: () => import("./messages/landing/fr.js"),
  it: () => import("./messages/landing/it.js"),
  pt: () => import("./messages/landing/pt.js"),
  tr: () => import("./messages/landing/tr.js"),
  cs: () => import("./messages/landing/cs.js"),
  ja: () => import("./messages/landing/ja.js"),
};

const cache = { en: english };

export const LANDING_FALLBACK = { ...ENGLISH_MESSAGES, landing: english };

export const getLandingMessages = (locale) => cache[locale] || null;

export const loadLanding = async (locale) => {
  if (!cache[locale] && LOADERS[locale]) {
    try {
      cache[locale] = (await LOADERS[locale]()).default;
    } catch {
      cache[locale] = english;
    }
  }

  return cache[locale] || english;
};

// Preloads a language's landing and app messages, so the page renders in
// it at once: before the first render in the browser, and before the
// static HTML is written at build time.
export const preloadLandingMessages = async (locale) => {
  await Promise.all([loadMessages(locale), loadLanding(locale)]);
};
