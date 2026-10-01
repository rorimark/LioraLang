// Suggestions for the rest of a card once someone has typed a word: what
// is asked, and what of the answer may reach the card. Pure, so the web,
// the desktop app and the server agree on it.
//
// The assistant only ever fills what is empty. What the person typed is
// theirs and is never replaced.

export const SUGGEST_MIN_LENGTH = 2;
export const SUGGEST_MAX_LENGTH = 80;
export const SUGGEST_MAX_WORDS = 8;
export const SUGGEST_MAX_EXAMPLES = 2;
export const SUGGEST_MAX_FIELD_LENGTH = 160;

export const SUGGEST_LEVELS = Object.freeze(["A1", "A2", "B1", "B2", "C1", "C2"]);
export const SUGGEST_PARTS_OF_SPEECH = Object.freeze([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "phrase",
  "other",
]);

// The fields of a word draft a suggestion can fill, in the order they are
// shown.
export const SUGGEST_FIELDS = Object.freeze(["source", "target", "tertiary", "level", "part_of_speech", "examplesInput"]);

const LEVELS = new Set(SUGGEST_LEVELS);
const PARTS = new Set(SUGGEST_PARTS_OF_SPEECH);
const PICTURE_SIDES = new Set(["source", "target"]);

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const clip = (value, limit = SUGGEST_MAX_FIELD_LENGTH) => {
  const text = clean(value);
  return text.length > limit ? "" : text;
};

// Something worth asking about: a word or a short phrase with letters in
// it, not a sentence, a number or a stray key.
export const isSuggestableText = (value) => {
  const text = clean(value);

  if (text.length < SUGGEST_MIN_LENGTH || text.length > SUGGEST_MAX_LENGTH) {
    return false;
  }

  if (!/\p{L}/u.test(text)) {
    return false;
  }

  return text.split(" ").length <= SUGGEST_MAX_WORDS;
};

// Which side the person has written, so the assistant knows what to
// translate from. The first side wins; the back is used when only the back
// is written, and asks for the front.
export const resolveSuggestionAnchor = (draft = {}, pictureSide = "") => {
  const side = PICTURE_SIDES.has(pictureSide) ? pictureSide : "";
  const source = side === "source" ? "" : clean(draft?.source);
  const target = side === "target" ? "" : clean(draft?.target);

  if (source) {
    return isSuggestableText(source) ? { side: "source", text: source } : null;
  }

  if (target) {
    return isSuggestableText(target) ? { side: "target", text: target } : null;
  }

  return null;
};

export const buildSuggestionRequest = ({ anchor, deck = {} }) => {
  const pictureSide = PICTURE_SIDES.has(deck?.pictureSide) ? deck.pictureSide : "";

  return {
    text: clean(anchor?.text),
    side: anchor?.side === "target" ? "target" : "source",
    sourceLanguage: pictureSide === "source" ? "" : clean(deck?.sourceLanguage),
    targetLanguage: pictureSide === "target" ? "" : clean(deck?.targetLanguage),
    tertiaryLanguage: clean(deck?.tertiaryLanguage),
    pictureSide,
    usesWordLevels: deck?.usesWordLevels !== false,
  };
};

export const suggestionCacheKey = (request = {}) =>
  [
    request.side,
    request.sourceLanguage,
    request.targetLanguage,
    request.tertiaryLanguage,
    request.pictureSide,
    request.usesWordLevels ? "levels" : "",
    clean(request.text).toLowerCase(),
  ].join("\u0000");

const sameText = (first, second) => clean(first).toLowerCase() === clean(second).toLowerCase();

// The answer, kept to what this card can hold. Anything the deck has no
// place for, anything not in the lists, and anything too long is dropped.
export const normalizeSuggestion = (raw = {}, request = {}) => {
  const correction = clip(raw?.correction, SUGGEST_MAX_LENGTH);
  const result = {
    recognized: raw?.recognized !== false,
    correction: correction && !sameText(correction, request.text) ? correction : "",
    source: "",
    target: "",
    tertiary: "",
    level: "",
    part_of_speech: "",
    examples: [],
  };

  if (!result.recognized) {
    return result;
  }

  const hasSource = request.pictureSide !== "source" && Boolean(request.sourceLanguage);
  const hasTarget = request.pictureSide !== "target" && Boolean(request.targetLanguage);

  if (request.side === "target" && hasSource) {
    result.source = clip(raw?.source);
  }

  if (request.side === "source" && hasTarget) {
    result.target = clip(raw?.target);
  }

  if (request.tertiaryLanguage) {
    result.tertiary = clip(raw?.tertiary);
  }

  const level = clean(raw?.level).toUpperCase();
  result.level = request.usesWordLevels !== false && LEVELS.has(level) ? level : "";

  const part = clean(raw?.partOfSpeech ?? raw?.part_of_speech).toLowerCase();
  result.part_of_speech = PARTS.has(part) ? part : "";

  const seen = new Set();
  result.examples = (Array.isArray(raw?.examples) ? raw.examples : [])
    .map((example) => clip(example, 200))
    .filter((example) => example && !seen.has(example.toLowerCase()) && seen.add(example.toLowerCase()))
    .slice(0, SUGGEST_MAX_EXAMPLES);

  return result;
};

export const hasSuggestionContent = (suggestion) =>
  Boolean(
    suggestion &&
      (suggestion.source ||
        suggestion.target ||
        suggestion.tertiary ||
        suggestion.level ||
        suggestion.part_of_speech ||
        suggestion.examples?.length),
  );

// A field is open to a suggestion while it is empty, or still holds the
// default it started with (a level of A1 nobody chose), and the person has
// not changed it themselves.
const isOpenField = (draft, field, defaults, locked) => {
  if (locked?.has?.(field)) {
    return false;
  }

  const value = clean(draft?.[field]);
  return !value || (Boolean(defaults?.[field]) && value === clean(defaults[field]));
};

// What a suggestion would put into this draft: only the fields still open
// to it, under the draft's own field names.
export const resolveSuggestionFills = (draft = {}, suggestion = null, { defaults = {}, locked = null } = {}) => {
  if (!suggestion?.recognized) {
    return {};
  }

  const offered = {
    source: suggestion.source,
    target: suggestion.target,
    tertiary: suggestion.tertiary,
    level: suggestion.level,
    part_of_speech: suggestion.part_of_speech,
    examplesInput: (suggestion.examples || []).join("\n"),
  };

  return Object.fromEntries(
    SUGGEST_FIELDS.filter(
      (field) => offered[field] && offered[field] !== clean(draft?.[field]) && isOpenField(draft, field, defaults, locked),
    ).map((field) => [
      field,
      offered[field],
    ]),
  );
};
