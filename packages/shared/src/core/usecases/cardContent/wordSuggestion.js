import { normalizeWordImage } from "./cardContent.js";

// A suggestion for an entry: what an assistant (or any other helper) offers
// once someone has typed a word. Every field is optional; the person
// accepts the ones they want, one by one or all at once.
//
//   {
//     target: "szparag",
//     level: "B1",
//     partOfSpeech: "noun",
//     tags: ["Food", "Vegetables"],
//     examples: ["I grilled some asparagus for dinner."],
//     image: { assetId: "<sha-256>", alt: "Green stalks on a plate" },
//   }
//
// A suggested picture is already a stored asset by the time it is offered:
// whoever proposes it downloads or generates it and passes it through the
// same prepare-and-save path as a picture someone chose themselves
// (lib/media prepareCardImage → mediaRepository.saveImage). A suggestion
// never carries a bare URL, so an accepted picture keeps working offline
// and after the address it came from disappears.

export const SUGGESTION_FIELDS = Object.freeze(["target", "level", "partOfSpeech", "tags", "examples", "image"]);

const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const cleanText = (value) => (typeof value === "string" ? value.trim() : "");
const cleanList = (value) =>
  Array.isArray(value) ? [...new Set(value.map(cleanText).filter(Boolean))] : [];

export const normalizeWordSuggestion = (value = {}) => {
  const level = cleanText(value?.level).toUpperCase();

  return {
    target: cleanText(value?.target),
    level: LEVELS.has(level) ? level : "",
    partOfSpeech: cleanText(value?.partOfSpeech ?? value?.part_of_speech).toLowerCase(),
    tags: cleanList(value?.tags),
    examples: cleanList(value?.examples),
    image: normalizeWordImage(value?.image),
  };
};

const isEmpty = (value) => (Array.isArray(value) ? value.length === 0 : !value);

// The entry with the accepted suggestions filled in. What the person has
// already written is theirs and is never replaced.
export const applyWordSuggestion = (word = {}, suggestion = {}, accepted = SUGGESTION_FIELDS) => {
  const offer = normalizeWordSuggestion(suggestion);
  const current = {
    target: word?.target,
    level: word?.level,
    partOfSpeech: word?.part_of_speech,
    tags: word?.tags,
    examples: word?.examples,
    image: normalizeWordImage(word?.image),
  };
  const next = { ...word };
  const keys = { partOfSpeech: "part_of_speech" };

  accepted
    .filter((field) => SUGGESTION_FIELDS.includes(field))
    .forEach((field) => {
      if (isEmpty(current[field]) && !isEmpty(offer[field])) {
        next[keys[field] || field] = offer[field];
      }
    });

  return next;
};
