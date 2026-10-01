// A hint for a word missed in Learn: which word to explain, in which
// language, and the key it is remembered under. Pure.

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

// The word being learned is the deck's source, as everywhere in the app:
// examples are written in the source language, and the target is its
// translation. The interface language says nothing about it: someone
// learning English may well use the app in English.
//
// What was asked is the side the card hid. With the source on the front
// the learner missed its meaning; with the target on the front they missed
// the word itself. `direction` is the direction the card was shown in
// ("source_to_target" or "target_to_source"); without it, `recall` is left
// empty and the hint does not lean either way.
const RECALL_BY_DIRECTION = { source_to_target: "meaning", target_to_source: "word" };

export const buildHintRequest = ({ word, deck, explainIn = "", direction = "" } = {}) => {
  const sourceLanguage = clean(deck?.sourceLanguage);
  const targetLanguage = clean(deck?.targetLanguage);
  const source = clean(word?.source);
  const target = clean(word?.target);

  if (deck?.pictureSide || !sourceLanguage || !targetLanguage || !source || !target) {
    return null;
  }

  return {
    word: source,
    translation: target,
    wordLanguage: sourceLanguage,
    translationLanguage: targetLanguage,
    explainIn: clean(explainIn),
    recall: RECALL_BY_DIRECTION[direction] || "",
    examples: (Array.isArray(word?.examples) ? word.examples : []).map(clean).filter(Boolean).slice(0, 2),
  };
};

export const hintCacheKey = (request) =>
  request
    ? [request.word, request.translation, request.wordLanguage, request.translationLanguage, request.explainIn, request.recall]
        .map((part) => clean(part).toLowerCase())
        .join("\u0000")
    : "";
