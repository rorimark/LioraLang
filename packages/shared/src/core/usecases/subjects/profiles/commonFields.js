import { LANGUAGE_OPTIONS } from "../../../../config/languages.js";

// Reusable by any subject with prose answers. A technology or a term's
// spelling does not determine the language of explanations.
export const CONTENT_LANGUAGE_FIELD = Object.freeze({
  type: "choice", values: LANGUAGE_OPTIONS, languageValues: true,
  labelKey: "subjects.fields.contentLanguage",
  hintKey: "subjects.fields.contentLanguageHint",
  placeholderKey: "subjects.fields.contentLanguagePlaceholder",
  minPackageVersion: 5,
});
