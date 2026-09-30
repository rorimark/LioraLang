// Duplicates are pointed out, never removed. The same word can honestly
// mean two things ("bank" of a river, "bank" with money), so a word that is
// already in the deck with a different translation is only noted; the same
// word with the same translation is the one worth stopping for.

export const DUPLICATE_KIND = Object.freeze({
  none: "none",
  // Same word and same translation as a card already in the deck.
  exact: "exact",
  // Same word, another translation: most likely another meaning.
  otherMeaning: "other-meaning",
  // The same pair appears earlier in the list being added.
  repeatedInList: "repeated-in-list",
});

export const normalizeWordKey = (value) =>
  String(value ?? "")
    .normalize("NFC")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?;:,]+$/g, "")
    .trim();

export const buildDeckWordIndex = (words = []) => {
  const index = new Map();

  (Array.isArray(words) ? words : []).forEach((word) => {
    const key = normalizeWordKey(word?.source);

    if (!key) {
      return;
    }

    const list = index.get(key) || [];
    list.push({
      id: word?.id ?? null,
      source: String(word?.source ?? ""),
      target: String(word?.target ?? ""),
    });
    index.set(key, list);
  });

  return index;
};

// What the deck already has for this word, and how it relates.
export const findDuplicate = (index, { source, target }) => {
  const matches = index?.get(normalizeWordKey(source)) || [];

  if (matches.length === 0) {
    return { kind: DUPLICATE_KIND.none, matches: [] };
  }

  const targetKey = normalizeWordKey(target);
  const exact = targetKey
    ? matches.filter((match) => normalizeWordKey(match.target) === targetKey)
    : [];

  if (exact.length > 0) {
    return { kind: DUPLICATE_KIND.exact, matches: exact };
  }

  return { kind: DUPLICATE_KIND.otherMeaning, matches };
};

// For a whole list: each row against the deck, and against the rows above
// it, so pasting "apple — jabłko" twice is caught as well.
export const markListDuplicates = (rows = [], index) => {
  const seenPairs = new Set();

  return rows.map((row) => {
    const pairKey = `${normalizeWordKey(row.source)}\u0000${normalizeWordKey(row.target)}`;
    const deckDuplicate = findDuplicate(index, row);
    let duplicate = deckDuplicate;

    if (deckDuplicate.kind !== DUPLICATE_KIND.exact && row.source && seenPairs.has(pairKey)) {
      duplicate = { kind: DUPLICATE_KIND.repeatedInList, matches: [] };
    }

    if (row.source) {
      seenPairs.add(pairKey);
    }

    return { ...row, duplicate };
  });
};
