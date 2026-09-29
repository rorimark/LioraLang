// The languages the interface speaks: the same twelve the decks can be
// in. Each is named in its own language in the picker, so a learner can
// always find theirs.
export const INTERFACE_LOCALES = [
  { code: "en", nativeName: "English", deckLanguage: "English" },
  { code: "uk", nativeName: "Українська", deckLanguage: "Ukrainian" },
  { code: "ru", nativeName: "Русский", deckLanguage: "Russian" },
  { code: "pl", nativeName: "Polski", deckLanguage: "Polish" },
  { code: "de", nativeName: "Deutsch", deckLanguage: "German" },
  { code: "es", nativeName: "Español", deckLanguage: "Spanish" },
  { code: "fr", nativeName: "Français", deckLanguage: "French" },
  { code: "it", nativeName: "Italiano", deckLanguage: "Italian" },
  { code: "pt", nativeName: "Português", deckLanguage: "Portuguese" },
  { code: "tr", nativeName: "Türkçe", deckLanguage: "Turkish" },
  { code: "cs", nativeName: "Čeština", deckLanguage: "Czech" },
  { code: "ja", nativeName: "日本語", deckLanguage: "Japanese" },
];

export const DEFAULT_LOCALE = "en";
export const AUTO_LOCALE = "auto";

export const LOCALE_CODES = INTERFACE_LOCALES.map((locale) => locale.code);

export const isSupportedLocale = (code) => LOCALE_CODES.includes(code);

// The first of the device's languages the interface speaks, by base
// language ("pt-BR" is Portuguese); English when none is.
export const detectLocale = (preferred = []) => {
  const list = Array.isArray(preferred) ? preferred : [preferred];

  for (const tag of list) {
    const base = String(tag || "").toLowerCase().split(/[-_]/)[0];

    if (isSupportedLocale(base)) {
      return base;
    }
  }

  return DEFAULT_LOCALE;
};

export const readDeviceLanguages = () => {
  if (typeof navigator === "undefined") {
    return [];
  }

  return navigator.languages?.length ? navigator.languages : [navigator.language];
};

// "auto" follows the device; anything else is a chosen language.
export const resolveLocale = (choice, deviceLanguages = readDeviceLanguages()) =>
  isSupportedLocale(choice) ? choice : detectLocale(deviceLanguages);

// Deck languages are stored by their English name ("Ukrainian"); this is
// the code to name them in the interface's language.
const DECK_LANGUAGE_CODES = Object.fromEntries(
  INTERFACE_LOCALES.map((locale) => [locale.deckLanguage, locale.code]),
);

export const resolveDeckLanguageCode = (name) => DECK_LANGUAGE_CODES[String(name || "").trim()] || "";
