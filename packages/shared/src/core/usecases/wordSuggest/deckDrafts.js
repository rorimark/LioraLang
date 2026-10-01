// A deck's own description and tags, drafted by the assistant from what
// the deck already has: its name, its sides and a sample of its words.
// Pure. The person always sees the draft before it is taken, and tags are
// added to the ones the deck has, never put in their place.

export const DECK_DESCRIPTION_MAX = 300;
export const DECK_TAGS_MAX = 10;
const SAMPLE_WORDS = 40;

const clean = (value) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "");
const hasLetter = (value) => /\p{L}/u.test(clean(value));

const splitTags = (value) =>
  (Array.isArray(value) ? value : String(value ?? "").split(","))
    .map(clean)
    .filter((tag) => tag && tag.length <= 30 && !tag.includes(","));

const uniqueTags = (tags) => {
  const seen = new Set();
  return tags.filter((tag) => {
    const key = tag.toLowerCase();
    return !seen.has(key) && seen.add(key);
  });
};

// Spread over the deck rather than its first words, so a long deck is
// described by all of it.
const sampleWords = (words = []) => {
  const usable = (Array.isArray(words) ? words : []).filter(
    (word) => hasLetter(word?.source) || hasLetter(word?.target),
  );
  const step = Math.max(1, usable.length / SAMPLE_WORDS);

  return Array.from({ length: Math.min(SAMPLE_WORDS, usable.length) }, (_, index) => usable[Math.floor(index * step)]).map(
    (word) => ({ source: clean(word.source).slice(0, 80), target: clean(word.target).slice(0, 80) }),
  );
};

export const buildDeckDescriptionRequest = ({ deck = {}, words = [], writeIn = "" } = {}) => ({
  name: clean(deck.name).slice(0, 120),
  sourceLanguage: clean(deck.sourceLanguage),
  targetLanguage: clean(deck.targetLanguage),
  pictureSide: deck.pictureSide === "source" || deck.pictureSide === "target" ? deck.pictureSide : "",
  words: sampleWords(words),
  tags: uniqueTags(splitTags(deck.tagsInput ?? deck.tags)),
  writeIn: clean(writeIn),
});

// Enough to go on: a name, or three words.
export const canDescribeDeck = (request) => Boolean(request && (hasLetter(request.name) || request.words.length >= 3));

export const normalizeDeckDescription = (raw = {}) => {
  const description = clean(raw?.description);

  return {
    description: description.length <= DECK_DESCRIPTION_MAX ? description : "",
    tags: uniqueTags(splitTags(raw?.tags ?? raw?.deckTags)).slice(0, 6),
  };
};

// The deck's tags with the drafted ones added after them, up to the
// deck's limit, as the tags field writes them.
export const mergeDeckTags = (current, added = []) =>
  uniqueTags([...splitTags(current), ...splitTags(added)])
    .slice(0, DECK_TAGS_MAX)
    .join(", ");
