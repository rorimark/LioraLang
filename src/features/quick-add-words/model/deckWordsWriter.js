// Adds and removes words in a saved deck, straight to storage. It goes
// through the same saveDeck every platform already has, so the words are
// stored offline the moment they are added, the deck's content hash moves
// and sync sees the change like any other edit.
//
// Writes to one deck run one after another: pressing Enter three times
// quickly must give three cards, not the last one twice.

const queues = new Map();

const enqueue = (deckId, task) => {
  const key = String(deckId);
  const previous = queues.get(key) || Promise.resolve();
  const next = previous.catch(() => {}).then(task);
  const settled = next.catch(() => {});

  queues.set(key, settled);
  settled.then(() => {
    if (queues.get(key) === settled) {
      queues.delete(key);
    }
  });

  return next;
};

const parseTags = (tagsJson) => {
  if (Array.isArray(tagsJson)) {
    return tagsJson;
  }

  try {
    const parsed = JSON.parse(tagsJson || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const toStoredWord = (word) => ({
  id: word.id ?? null,
  externalId: word.externalId || "",
  source: word.source ?? "",
  target: word.target ?? "",
  tertiary: word.tertiary ?? "",
  level: word.level || null,
  part_of_speech: word.part_of_speech || "",
  tags: Array.isArray(word.tags) ? word.tags : [],
  examples: Array.isArray(word.examples) ? word.examples : [],
  image: word.image || null,
});

const buildSavePayload = (deck, words) => ({
  deckId: deck.id,
  name: deck.name,
  description: deck.description || "",
  sourceLanguage: deck.sourceLanguage,
  targetLanguage: deck.targetLanguage,
  tertiaryLanguage: deck.tertiaryLanguage || "",
  tags: parseTags(deck.tagsJson ?? deck.tags),
  usesWordLevels: deck.usesWordLevels !== false,
  words: words.map(toStoredWord),
});

const loadDeck = async (deckRepository, deckId) => {
  const [deck, words] = await Promise.all([
    deckRepository.getDeckById(deckId),
    deckRepository.getDeckWords(deckId),
  ]);

  if (!deck) {
    throw new Error("Deck not found");
  }

  return { deck, words: Array.isArray(words) ? words : [] };
};

const newExternalId = (index) =>
  `quick-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}-${index}`;

// A card as the add form describes it. Unknown fields stay unknown: no
// level, no part of speech is invented for a word nobody described.
export const toNewWord = (draft, index = 0) => ({
  id: null,
  externalId: newExternalId(index),
  source: String(draft?.source ?? "").trim(),
  target: String(draft?.target ?? "").trim(),
  tertiary: String(draft?.tertiary ?? "").trim(),
  level: draft?.level || null,
  part_of_speech: draft?.part_of_speech || "",
  tags: Array.isArray(draft?.tags) ? draft.tags : [],
  examples: Array.isArray(draft?.examples) ? draft.examples : [],
  image: draft?.image || null,
});

// Nothing was stored: said as an error, never as "Added".
const nothingAddedError = () =>
  Object.assign(new Error("No card was added"), { i18nKey: "quickAdd.errors.save" });

export const appendWordsToDeck = (deckRepository, deckId, drafts) =>
  enqueue(deckId, async () => {
    // A word of a picture deck may have no text on its first side: the
    // picture is that side.
    const newWords = (Array.isArray(drafts) ? drafts : [])
      .map((draft, index) => toNewWord(draft, index))
      .filter((word) => word.source || word.image);

    if (newWords.length === 0) {
      throw nothingAddedError();
    }

    const { deck, words } = await loadDeck(deckRepository, deckId);
    const knownIds = new Set(words.map((word) => String(word.id)));
    const result = await deckRepository.saveDeck(
      buildSavePayload(deck, [...words, ...newWords]),
    );
    const savedWords = Array.isArray(result?.words) ? result.words : [];
    const externalIds = new Set(newWords.map((word) => word.externalId));
    const added = savedWords.filter(
      (word) => !knownIds.has(String(word.id)) && externalIds.has(word.externalId),
    );

    if (added.length === 0) {
      throw nothingAddedError();
    }

    return { deck: result?.deck || deck, added, words: savedWords };
  });

export const removeWordsFromDeck = (deckRepository, deckId, wordIds) =>
  enqueue(deckId, async () => {
    const removeIds = new Set((wordIds || []).map((id) => String(id)));

    if (removeIds.size === 0) {
      return { deck: null, removed: 0, words: [] };
    }

    const { deck, words } = await loadDeck(deckRepository, deckId);
    const kept = words.filter((word) => !removeIds.has(String(word.id)));
    const result = await deckRepository.saveDeck(buildSavePayload(deck, kept));

    return {
      deck: result?.deck || deck,
      removed: words.length - kept.length,
      words: Array.isArray(result?.words) ? result.words : [],
    };
  });

export const createDeckForWords = (deckRepository, { name, sourceLanguage, targetLanguage }) =>
  deckRepository.saveDeck({
    name: String(name ?? "").trim(),
    description: "",
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage: "",
    tags: [],
    usesWordLevels: true,
    words: [],
  });
