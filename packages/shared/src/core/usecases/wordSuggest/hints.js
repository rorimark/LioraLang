// A hint for a word missed in Learn: which word to explain, in which
// language, and the key it is remembered under. Pure.

import { LEARNED_SIDES, normalizeLearnedSide } from "../cardContent/cardContent.js";

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");

// The word being learned is on the deck's learned side: the source unless
// the deck says its target is (deck.learnedSide). The interface language
// says nothing about it: someone learning English may well use the app in
// English.
//
// What was asked is the side the card hid. With the learned word on the
// front the learner missed its meaning; with its translation on the front
// they missed the word itself. `direction` is the direction the card was
// shown in ("source_to_target" or "target_to_source"); without it,
// `recall` is left empty and the hint does not lean either way.
const FRONT_BY_DIRECTION = { source_to_target: "source", target_to_source: "target" };

export const buildHintRequest = ({ word, deck, explainIn = "", direction = "" } = {}) => {
  const sourceLanguage = clean(deck?.sourceLanguage);
  const targetLanguage = clean(deck?.targetLanguage);
  const source = clean(word?.source);
  const target = clean(word?.target);

  if (deck?.pictureSide || !sourceLanguage || !targetLanguage || !source || !target) {
    return null;
  }

  const learnsTarget = normalizeLearnedSide(deck?.learnedSide) === LEARNED_SIDES.target;
  const learnedSide = learnsTarget ? "target" : "source";
  const front = FRONT_BY_DIRECTION[direction] || "";

  return {
    word: learnsTarget ? target : source,
    translation: learnsTarget ? source : target,
    wordLanguage: learnsTarget ? targetLanguage : sourceLanguage,
    translationLanguage: learnsTarget ? sourceLanguage : targetLanguage,
    explainIn: clean(explainIn),
    recall: front ? (front === learnedSide ? "meaning" : "word") : "",
    examples: (Array.isArray(word?.examples) ? word.examples : []).map(clean).filter(Boolean).slice(0, 2),
  };
};

export const hintCacheKey = (request) =>
  request
    ? [request.word, request.translation, request.wordLanguage, request.translationLanguage, request.explainIn, request.recall]
        .map((part) => clean(part).toLowerCase())
        .join("\u0000")
    : "";
