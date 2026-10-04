// Adds and removes words in a saved deck, straight to storage. It goes
// through the same saveDeck every platform already has, so the words are
// stored offline the moment they are added, the deck's content hash moves
// and sync sees the change like any other edit.
//
// Writes to one deck run one after another: pressing Enter three times
// quickly must give three cards, not the last one twice.

import { getSubjectProfile, storedSubject, normalizeDeckSubjectFields } from "@shared/core/usecases/subjects";

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
  // A subject's own fields (a programming card's code) go back as they
  // came; dropping them here would erase them from every other card.
  ...(word.subjectFields ? { subjectFields: word.subjectFields } : {}),
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
  subject: storedSubject(deck.subject),
  subjectFields: normalizeDeckSubjectFields(deck.subject, deck.subjectFields),
  pictureSide: deck.pictureSide || "",
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
  ...(draft?.subjectFields ? { subjectFields: draft.subjectFields } : {}),
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

// A deck drafted on a topic arrives with its description and tags.
export const createDeckForWords = (deckRepository, draft, cards = []) => {
  const subject = storedSubject(draft.subject);
  const profile = getSubjectProfile(subject);
  const pictureSide = profile.usesLanguages ? draft.pictureSide || "" : "";
  return deckRepository.saveDeck({
    name: String(draft.name ?? "").trim(),
    description: String(draft.description ?? "").trim(),
    sourceLanguage: profile.usesLanguages && pictureSide !== "source" ? draft.sourceLanguage : "",
    targetLanguage: profile.usesLanguages && pictureSide !== "target" ? draft.targetLanguage : "",
    pictureSide, subject, subjectFields: normalizeDeckSubjectFields(subject, draft.subjectFields),
    tertiaryLanguage: "",
    tags: Array.isArray(draft.tags) ? draft.tags.slice(0, 10) : [],
    usesWordLevels: profile.usesLanguages,
    words: cards.map((card, index) => toNewWord(card, index)),
  });
};
