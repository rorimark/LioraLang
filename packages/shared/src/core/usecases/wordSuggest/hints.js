// A hint for a word missed in Learn: which word to explain, in which
// language, and the key it is remembered under. Pure.

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const sameLanguage = (first, second) => clean(first).toLowerCase() === clean(second).toLowerCase();

// The word being learned is the side not in the person's own language: a
// Russian speaker with a Polish → Russian deck is learning the Polish word.
// When neither side is their language, the front is the word.
export const buildHintRequest = ({ word, deck, explainIn = "" } = {}) => {
  const sourceLanguage = clean(deck?.sourceLanguage);
  const targetLanguage = clean(deck?.targetLanguage);
  const source = clean(word?.source);
  const target = clean(word?.target);

  if (deck?.pictureSide || !sourceLanguage || !targetLanguage || !source || !target) {
    return null;
  }

  const learnsTarget = sameLanguage(explainIn, sourceLanguage) && !sameLanguage(explainIn, targetLanguage);
  const examples = (Array.isArray(word?.examples) ? word.examples : []).map(clean).filter(Boolean).slice(0, 2);

  return {
    word: learnsTarget ? target : source,
    translation: learnsTarget ? source : target,
    wordLanguage: learnsTarget ? targetLanguage : sourceLanguage,
    translationLanguage: learnsTarget ? sourceLanguage : targetLanguage,
    explainIn: clean(explainIn),
    examples,
  };
};

export const hintCacheKey = (request) =>
  request
    ? [request.word, request.translation, request.wordLanguage, request.translationLanguage, request.explainIn]
        .map((part) => clean(part).toLowerCase())
        .join("\u0000")
    : "";
