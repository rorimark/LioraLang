export const LANGUAGE_OPTIONS = [
  "English",
  "Ukrainian",
  "Russian",
  "Polish",
  "German",
  "Spanish",
  "French",
  "Italian",
  "Portuguese",
  "Turkish",
  "Czech",
  "Japanese",
];

// A visible initial choice for a new deck. Existing decks never acquire a
// language from the current interface implicitly.
export const defaultContentLanguage = (locale) => {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(String(locale || "en").split("-")[0]);
    return LANGUAGE_OPTIONS.includes(name) ? name : "English";
  } catch { return "English"; }
};

export const DEFAULT_SOURCE_LANGUAGE = "English";
export const DEFAULT_TARGET_LANGUAGE = "Ukrainian";
