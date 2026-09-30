import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  LANGUAGE_OPTIONS,
} from "@shared/config/languages";
import {
  normalizePictureSide,
  normalizeWordImage,
  PICTURE_SIDES,
} from "@shared/core/usecases/cardContent";

// The deck editor's data, without React: what the form holds, what a word
// draft holds, and what goes to storage. Everything here is pure.

export const LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const PART_OF_SPEECH_OPTIONS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "phrase",
  "other",
];
export const MAX_DECK_TAGS = 10;
export const MAX_WORD_TAGS = 10;

const LEVELS = new Set(LEVEL_OPTIONS);
const PARTS = new Set(PART_OF_SPEECH_OPTIONS);
const clean = (value) => (typeof value === "string" ? value.trim() : "");

const uniqueList = (items) => {
  const seen = new Set();

  return items
    .map(clean)
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
};

export const parseTagsInput = (value, limit = MAX_WORD_TAGS) =>
  uniqueList(clean(value) ? value.split(",") : []).slice(0, limit);

export const parseTags = (value) => {
  if (Array.isArray(value)) {
    return uniqueList(value);
  }

  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? uniqueList(parsed) : [];
  } catch {
    return [];
  }
};

export const parseExamplesInput = (value) => {
  const seen = new Set();

  return (clean(value) ? value.split("\n") : [])
    .map(clean)
    .filter((line) => line && !seen.has(line) && seen.add(line));
};

// A word nobody has seen yet gets a name of its own at once, so it is the
// same word before and after it is saved.
export const createExternalId = () =>
  `manual-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createDefaultDeckForm = (deckDefaults = {}) => {
  const preferredSource = clean(deckDefaults?.sourceLanguage) || DEFAULT_SOURCE_LANGUAGE;
  const preferredTarget = clean(deckDefaults?.targetLanguage);
  const targetLanguage =
    preferredTarget && preferredTarget.toLowerCase() !== preferredSource.toLowerCase()
      ? preferredTarget
      : LANGUAGE_OPTIONS.find((language) => language !== preferredSource) || DEFAULT_TARGET_LANGUAGE;

  return {
    name: "",
    description: "",
    sourceLanguage: preferredSource,
    targetLanguage,
    tertiaryLanguage: "",
    pictureSide: "",
    usesWordLevels: true,
    tagsInput: parseTags(deckDefaults?.tags).slice(0, MAX_DECK_TAGS).join(", "),
  };
};

export const toDeckForm = (deck = {}) => ({
  name: deck?.name || "",
  description: deck?.description || "",
  sourceLanguage: deck?.sourceLanguage || DEFAULT_SOURCE_LANGUAGE,
  targetLanguage: deck?.targetLanguage || DEFAULT_TARGET_LANGUAGE,
  tertiaryLanguage: deck?.tertiaryLanguage || "",
  pictureSide: normalizePictureSide(deck?.pictureSide),
  usesWordLevels: deck?.usesWordLevels !== false,
  tagsInput: parseTags(deck?.tags ?? deck?.tagsJson).join(", "),
});

export const createEmptyWordDraft = (deckDefaults = {}) => ({
  source: "",
  target: "",
  tertiary: "",
  // An unknown word stays unknown: no level or part of speech is assumed
  // beyond what the person chose as their default.
  level: LEVELS.has(clean(deckDefaults?.level)) ? clean(deckDefaults.level) : "",
  part_of_speech: PARTS.has(clean(deckDefaults?.partOfSpeech)) ? clean(deckDefaults.partOfSpeech) : "",
  examplesInput: "",
  tagsInput: "",
  image: null,
});

const toExamples = (word) =>
  uniqueList([...(Array.isArray(word?.examples) ? word.examples : []), word?.example || ""]);

// A stored word as the editor keeps it.
export const toEditableWord = (word = {}) => ({
  id: word?.id ?? null,
  externalId: clean(word?.externalId) || createExternalId(),
  source: word?.source || "",
  target: word?.target || "",
  tertiary: word?.tertiary || "",
  level: word?.level || "",
  part_of_speech: word?.part_of_speech || "",
  tags: parseTags(word?.tags),
  examples: toExamples(word),
  image: normalizeWordImage(word?.image),
});

export const toWordDraft = (word = {}) => ({
  source: word?.source || "",
  target: word?.target || "",
  tertiary: word?.tertiary || "",
  level: word?.level || "",
  part_of_speech: word?.part_of_speech || "",
  examplesInput: toExamples(word).join("\n"),
  tagsInput: parseTags(word?.tags).join(", "),
  image: normalizeWordImage(word?.image),
});

// What is missing before a draft can be a word, as a message key; "" when
// nothing is. A picture side needs its picture, a language side its text.
export const validateWordDraft = (draft, pictureSide = "") => {
  const side = normalizePictureSide(pictureSide);

  if (side && !normalizeWordImage(draft?.image)) {
    return "editor.errors.emptyPicture";
  }

  if (side !== PICTURE_SIDES.source && !clean(draft?.source)) {
    return "editor.errors.emptyWord";
  }

  // Opposite a picture the text is the word itself, not its translation.
  if (side !== PICTURE_SIDES.target && !clean(draft?.target)) {
    return side === PICTURE_SIDES.source ? "editor.errors.emptyWord" : "editor.errors.emptyTranslation";
  }

  return "";
};

export const draftToWord = (draft, { base = {}, pictureSide = "", usesWordLevels = true, hasTertiary = false } = {}) => {
  const examples = parseExamplesInput(draft?.examplesInput);

  return {
    ...base,
    externalId: base.externalId || createExternalId(),
    source: clean(draft?.source),
    target: clean(draft?.target),
    tertiary: hasTertiary ? clean(draft?.tertiary) : "",
    level: usesWordLevels && LEVELS.has(draft?.level) ? draft.level : "",
    part_of_speech: PARTS.has(draft?.part_of_speech) ? draft.part_of_speech : "",
    tags: parseTagsInput(draft?.tagsInput),
    examples,
    image: normalizePictureSide(pictureSide) ? normalizeWordImage(draft?.image) : null,
  };
};

// What is wrong with the deck's own settings, as a message key.
export const validateDeckForm = (form = {}) => {
  const side = normalizePictureSide(form.pictureSide);

  if (!clean(form.name)) {
    return "editor.errors.nameRequired";
  }

  const source = side === PICTURE_SIDES.source ? "" : clean(form.sourceLanguage);
  const target = side === PICTURE_SIDES.target ? "" : clean(form.targetLanguage);
  const tertiary = clean(form.tertiaryLanguage);

  if ((side !== PICTURE_SIDES.source && !source) || (side !== PICTURE_SIDES.target && !target)) {
    return "import.errors.languagesRequired";
  }

  const languages = [source, target, tertiary].filter(Boolean).map((language) => language.toLowerCase());

  if (new Set(languages).size !== languages.length) {
    return "editor.errors.sameLanguages";
  }

  return "";
};

export const buildSavePayload = ({ deckId = null, form = {}, words = [] }) => {
  const pictureSide = normalizePictureSide(form.pictureSide);
  const tertiaryLanguage = clean(form.tertiaryLanguage);

  return {
    ...(deckId ? { deckId } : {}),
    name: clean(form.name),
    description: clean(form.description),
    sourceLanguage: pictureSide === PICTURE_SIDES.source ? "" : clean(form.sourceLanguage),
    targetLanguage: pictureSide === PICTURE_SIDES.target ? "" : clean(form.targetLanguage),
    tertiaryLanguage,
    pictureSide,
    tags: parseTagsInput(form.tagsInput, MAX_DECK_TAGS),
    usesWordLevels: form.usesWordLevels !== false,
    words: words.map((word) => ({
      id: Number.isInteger(Number(word.id)) && Number(word.id) > 0 ? Number(word.id) : null,
      externalId: word.externalId,
      source: word.source,
      target: word.target,
      tertiary: tertiaryLanguage ? word.tertiary : "",
      level: form.usesWordLevels !== false ? word.level || null : null,
      part_of_speech: word.part_of_speech,
      tags: word.tags,
      examples: word.examples,
      image: pictureSide ? word.image : null,
    })),
  };
};

// After a save, the words the editor holds take the ids storage gave them.
// Words are matched by their external id, so a word added while the save
// was on its way keeps waiting for the next one.
export const applySavedIds = (localWords = [], savedWords = []) => {
  const savedByExternalId = new Map(savedWords.map((word) => [word.externalId, word]));
  let changed = false;

  const next = localWords.map((word) => {
    const saved = savedByExternalId.get(word.externalId);

    if (saved && String(saved.id) !== String(word.id)) {
      changed = true;
      return { ...word, id: saved.id };
    }

    return word;
  });

  return changed ? next : localWords;
};

export const matchesWordQuery = (word, query) => {
  const needle = clean(query).toLowerCase();

  if (!needle) {
    return true;
  }

  return [word.source, word.target, word.tertiary, word.image?.alt, ...(word.tags || [])]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
};
