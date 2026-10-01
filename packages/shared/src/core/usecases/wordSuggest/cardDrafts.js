// Cards the assistant drafts several at a time: the lines of a pasted
// list, filled in, and a deck on a topic. Pure, like the rest of the
// suggestions: what the person wrote on a line is theirs and is never
// replaced, and every card is checked the same way a single word is.

import { buildSuggestionRequest, normalizeSuggestion } from "./wordSuggest.js";

// One request carries this many lines; a longer list goes in parts.
export const AI_LIST_CHUNK = 30;
export const AI_TOPIC_COUNTS = Object.freeze([10, 20, 30]);
export const AI_TOPIC_MAX_LENGTH = 80;

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const hasLetter = (value) => /\p{L}/u.test(clean(value));

// What the function is told about the deck: its languages, whether it uses
// levels, the tags it already has and the language new tags are written in.
export const buildAiDeck = ({ languages = {}, usesWordLevels = true, tags = [], tagLanguage = "" } = {}) => ({
  sourceLanguage: clean(languages.sourceLanguage),
  targetLanguage: clean(languages.targetLanguage),
  tertiaryLanguage: clean(languages.tertiaryLanguage),
  usesWordLevels: usesWordLevels !== false,
  tags: Array.isArray(tags) ? tags : [],
  tagLanguage: clean(tagLanguage),
});

// A list can be filled in only where both sides are words.
export const canDraftCards = (deck) => Boolean(deck?.sourceLanguage && deck?.targetLanguage);

// The lines worth asking about: a word on either side, not answered yet.
export const rowsToDraft = (rows = []) =>
  rows.filter((row) => !row?.ai && (hasLetter(row?.source) || hasLetter(row?.target)));

export const chunkRows = (rows = [], size = AI_LIST_CHUNK) => {
  const chunks = [];

  for (let start = 0; start < rows.length; start += size) {
    chunks.push(rows.slice(start, start + size));
  }

  return chunks;
};

// The side a line was asked about: the word when there is one, otherwise
// the translation.
const anchorSide = (row) => (clean(row?.source) ? "source" : "target");

const detailsOf = (suggestion) => ({
  tertiary: suggestion.tertiary,
  level: suggestion.level,
  part_of_speech: suggestion.part_of_speech,
  examples: suggestion.examples,
  tags: suggestion.tags,
});

// A line with the assistant's card applied: an empty side is filled, a
// written one stays; the rest of the card is kept beside it until the line
// is added. A line whose word was changed while the answer was on its way
// is left alone.
export const applyCardToRow = (row, card, deck, { askedText = null } = {}) => {
  const side = anchorSide(row);
  const text = clean(row?.[side]);

  if (askedText !== null && clean(askedText) !== text) {
    return row;
  }

  const suggestion = normalizeSuggestion(card || {}, buildSuggestionRequest({ anchor: { side, text }, deck }));

  if (!suggestion.recognized) {
    return { ...row, ai: { side, correction: suggestion.correction, filled: [], details: null } };
  }

  const patch = {};
  const filled = [];

  if (side === "source" && !clean(row.target) && suggestion.target) {
    patch.target = suggestion.target;
    filled.push("target");
  }

  if (side === "target" && suggestion.source) {
    patch.source = suggestion.source;
    filled.push("source");
  }

  return { ...row, ...patch, ai: { side, correction: "", filled, details: detailsOf(suggestion) } };
};

// The assistant's deck on a topic as lines to look over, all of them
// drafted.
export const cardsToRows = (cards = [], deck, makeKey) =>
  cards
    .map((card) => {
      const source = clean(card?.source).slice(0, 80);
      const suggestion = normalizeSuggestion(card || {}, buildSuggestionRequest({ anchor: { side: "source", text: source }, deck }));
      return { source, suggestion };
    })
    .filter(({ source, suggestion }) => source && suggestion.target)
    .map(({ source, suggestion }, index) => ({
      key: makeKey(),
      line: index + 1,
      raw: source,
      source,
      target: suggestion.target,
      ai: { side: "source", correction: "", filled: ["source", "target"], details: detailsOf(suggestion) },
    }));

// Changing the word a card was drafted for makes the card stale.
export const editRow = (row, field, value) => {
  const next = { ...row, [field]: value };
  return row?.ai && row.ai.side === field ? { ...next, ai: null } : next;
};

// A line as a word for the deck, with the drafted card's details.
export const rowToWord = (row, { usesWordLevels = true } = {}) => {
  const details = row?.ai?.details;
  const word = { source: clean(row?.source), target: clean(row?.target) };

  if (!details) {
    return word;
  }

  return {
    ...word,
    tertiary: details.tertiary || "",
    examples: details.examples || [],
    part_of_speech: details.part_of_speech || "",
    level: usesWordLevels ? details.level || "" : "",
    tags: details.tags || [],
  };
};

// "kitchen", B1, 20: what a deck on a topic is asked with.
export const buildTopicRequest = ({ deck, topic, level = "", count = 20, avoid = [] }) => ({
  deck,
  topic: clean(topic).slice(0, AI_TOPIC_MAX_LENGTH),
  level: clean(level).toUpperCase(),
  count: AI_TOPIC_COUNTS.includes(Number(count)) ? Number(count) : AI_TOPIC_COUNTS[1],
  avoid: avoid.map(clean).filter((word) => word && word.length <= 40).slice(0, 200),
});

export const isTopicReady = (topic) => hasLetter(topic) && clean(topic).length <= AI_TOPIC_MAX_LENGTH;
