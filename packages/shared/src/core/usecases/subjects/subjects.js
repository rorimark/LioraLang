// What a deck is about, and what that changes. A subject is a small
// profile: which fields a card has beyond the common core, whether its
// sides are languages, which directions make sense, and how a card is laid
// out to be recalled. It is configuration, read by the core and the UI
// alike; no component asks which subject it is.
//
// The common core of every entry stays the same: source (what is asked),
// target (what is recalled), tags. Anything a subject adds lives in the
// entry's subjectFields, an object whose keys the profile names, so the
// next subject brings its own keys rather than new columns.
//
// "language" is the app as it has always been: no profile fields, no block
// layout (cards are drawn exactly as before), every direction. Only other
// subjects are stored, so a language deck reads, exports and hashes as it
// did before subjects existed.

export const SUBJECTS = Object.freeze({
  language: "language",
  programming: "programming",
});

const DIRECTIONS = Object.freeze({
  sourceToTarget: "source_to_target",
  targetToSource: "target_to_source",
  mixed: "mixed",
});

export const DIFFICULTIES = Object.freeze(["easy", "medium", "hard"]);

// Labels, placeholders and errors are message keys, so the interface
// draws a subject's forms from its profile without knowing which it is.
const LANGUAGE_PROFILE = Object.freeze({
  id: SUBJECTS.language,
  nameKey: "subjects.names.language",
  usesLanguages: true,
  canPublishToHub: true,
  usesAssistant: true,
  directions: [DIRECTIONS.sourceToTarget, DIRECTIONS.targetToSource, DIRECTIONS.mixed],
  // Side names come from the deck's languages.
  sideLabels: null,
  // The Learn settings that show more of a card.
  cardDetails: ["showExamples", "showLevel", "showPartOfSpeech"],
  // The word form's own labels and errors are used.
  entryText: null,
  deckFields: {},
  entryFields: {},
  presentation: null,
});

// Programming: a term or a question, often about a piece of code, and a
// short answer. With code, the code is the thing to look at; without it, a
// term is the headline, the way a word is on a language card. The
// technology is the deck's context; difficulty is not CEFR.
const PROGRAMMING_PROFILE = Object.freeze({
  id: SUBJECTS.programming,
  nameKey: "subjects.names.programming",
  usesLanguages: false,
  // The Hub keeps languages in columns; until it knows subjects, these
  // decks stay in the library.
  canPublishToHub: false,
  usesAssistant: false,
  directions: [DIRECTIONS.sourceToTarget],
  // Message keys: the sides are a question and its answer.
  sideLabels: { source: "subjects.sides.question", target: "subjects.sides.answer" },
  cardDetails: [],
  deckText: { namePlaceholderKey: "subjects.fields.technologyPlaceholder" },
  entryText: {
    addKey: "subjects.addCard",
    listKey: "subjects.cards",
    enterHintKey: "subjects.enterHint",
    tagsKey: "subjects.tags",
    emptyKey: "subjects.empty",
    source: { labelKey: "subjects.fields.question", placeholderKey: "subjects.fields.questionPlaceholder", errorKey: "subjects.errors.emptyQuestion" },
    target: { multiline: true, labelKey: "subjects.fields.answer", placeholderKey: "subjects.fields.answerPlaceholder", errorKey: "subjects.errors.emptyAnswer" },
    examples: { labelKey: "subjects.fields.notes", placeholderKey: "subjects.fields.notesPlaceholder" },
  },
  deckFields: {
    technology: {
      type: "text",
      maxLength: 40,
      labelKey: "subjects.fields.technology",
      hintKey: "subjects.fields.technologyHint",
      placeholderKey: "subjects.fields.technologyPlaceholder",
    },
  },
  entryFields: {
    code: {
      type: "code",
      maxLength: 4000,
      labelKey: "subjects.fields.code",
      placeholderKey: "subjects.fields.codePlaceholder",
      placementField: "codeSide",
    },
    codeSide: {
      type: "choice",
      values: ["front", "back"],
      defaultValue: "front",
      attachedTo: "code",
      minPackageVersion: 3,
      labelKey: "subjects.fields.codeSide",
      valueKey: "subjects.codeSide",
    },
    difficulty: {
      type: "choice",
      values: DIFFICULTIES,
      labelKey: "subjects.fields.difficulty",
      valueKey: "subjects.difficulty",
    },
  },
  presentation: {
    layout: "code",
    front: [
      { block: "meta", items: [{ kind: "technology", from: "deck.technology" }, { kind: "difficulty", from: "entry.difficulty", labelKey: "subjects.difficulty", scale: DIFFICULTIES }] },
      { block: "text", role: "prompt", from: "entry.source", leadsWithout: "entry.code", leadsWhen: { from: "entry.codeSide", value: "back" } },
      { block: "code", emphasis: "primary", from: "entry.code", unless: { from: "entry.codeSide", value: "back" } },
    ],
    back: [
      { block: "text", role: "answer", from: "entry.target" },
      { block: "code", emphasis: "secondary", from: "entry.code", when: { from: "entry.codeSide", value: "back" } },
      { block: "list", role: "notes", from: "entry.examples" },
    ],
  },
});

const PROFILES = Object.freeze({
  [SUBJECTS.language]: LANGUAGE_PROFILE,
  [SUBJECTS.programming]: PROGRAMMING_PROFILE,
});

export const SUBJECT_IDS = Object.freeze(Object.keys(PROFILES));

export const normalizeSubject = (value) => (PROFILES[value] ? value : SUBJECTS.language);

// What a deck stores for its subject: nothing for language.
export const storedSubject = (value) => {
  const subject = normalizeSubject(value);
  return subject === SUBJECTS.language ? "" : subject;
};

export const getSubjectProfile = (subject) => PROFILES[normalizeSubject(subject)];

const parseObject = (value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }

  return {};
};

const normalizeFieldValue = (spec, value) => {
  if (spec.type === "choice") {
    return spec.values.includes(value) ? value : "";
  }

  if (typeof value !== "string") {
    return "";
  }

  // Code keeps its lines and indentation; only trailing blank space goes.
  const text = spec.type === "code" ? value.replace(/\r\n?/g, "\n").replace(/\s+$/, "") : value.replace(/\s+/g, " ").trim();
  return text.length > spec.maxLength ? text.slice(0, spec.maxLength) : text;
};

// The fields a profile allows, cleaned; empty ones are left out, and so is
// the whole object when nothing is set.
const normalizeFields = (specs, value) => {
  const raw = parseObject(value);
  const result = {};

  Object.entries(specs).forEach(([key, spec]) => {
    const normalized = normalizeFieldValue(spec, raw[key]);

    if (normalized && normalized !== spec.defaultValue) {
      result[key] = normalized;
    }
  });

  return result;
};

export const normalizeEntrySubjectFields = (subject, value) =>
  normalizeFields(getSubjectProfile(subject).entryFields, value);

export const normalizeDeckSubjectFields = (subject, value) =>
  normalizeFields(getSubjectProfile(subject).deckFields, value);

export const hasSubjectFields = (fields) => Boolean(fields && Object.keys(fields).length);

// The direction a subject is studied in: the one asked for when the
// subject allows it, else its first.
export const resolveSubjectDirection = (subject, direction) => {
  const { directions } = getSubjectProfile(subject);
  return directions.includes(direction) ? direction : directions[0];
};

const readSource = (from, { entry, deck, entryFields, deckFields }) => {
  const [scope, key] = String(from).split(".");

  if (scope === "deck") {
    return deckFields[key] ?? deck?.[key];
  }

  return entryFields[key] ?? entry?.[key];
};

const cleanText = (value) => (typeof value === "string" ? value.trim() : "");

const matchesCondition = (condition, context) => Boolean(condition) && readSource(condition.from, context) === condition.value;

const buildBlock = (spec, context) => {
  if ((spec.when && !matchesCondition(spec.when, context)) || matchesCondition(spec.unless, context)) return null;
  if (spec.block === "meta") {
    const items = spec.items
      .map((item) => {
        const value = cleanText(readSource(item.from, context));
        // A value from a fixed list is shown by its message key.
        const shown = item.labelKey && value ? { labelKey: `${item.labelKey}.${value}` } : {};
        // A value on a scale also says where on it it sits (2 of 3).
        const step = item.scale ? item.scale.indexOf(value) + 1 : 0;
        return { kind: item.kind, value, ...shown, ...(step ? { step, steps: item.scale.length } : {}) };
      })
      .filter((item) => item.value);
    return items.length ? { type: "meta", items } : null;
  }

  if (spec.block === "list") {
    const raw = readSource(spec.from, context);
    const items = (Array.isArray(raw) ? raw : []).map(cleanText).filter(Boolean);
    return items.length ? { type: "list", role: spec.role, items } : null;
  }

  const value = readSource(spec.from, context);
  // A text that stands alone on its face, with nothing it introduces, is
  // set as the headline.
  const leads = (Boolean(spec.leadsWithout) && !cleanText(readSource(spec.leadsWithout, context))) || matchesCondition(spec.leadsWhen, context);
  const text = spec.block === "code" ? (typeof value === "string" ? value.replace(/\s+$/, "") : "") : cleanText(value);

  if (!text) {
    return null;
  }

  return spec.block === "code"
    ? { type: "code", emphasis: spec.emphasis, text }
    : { type: "text", role: spec.role, text, ...(leads ? { emphasis: "lead" } : {}) };
};

// How one entry is shown on a card, as blocks the renderer draws with the
// app's common pieces. null means the subject has no block layout: the
// card is drawn the way language cards always have been.
export const buildCardPresentation = ({ entry = {}, deck = {} } = {}) => {
  const subject = normalizeSubject(deck?.subject);
  const profile = getSubjectProfile(subject);

  if (!profile.presentation) {
    return null;
  }

  const context = {
    entry,
    deck,
    entryFields: normalizeEntrySubjectFields(subject, entry?.subjectFields),
    deckFields: normalizeDeckSubjectFields(subject, deck?.subjectFields),
  };
  const build = (specs) => specs.map((spec) => buildBlock(spec, context)).filter(Boolean);

  return {
    subject,
    layout: profile.presentation.layout,
    labels: { front: profile.sideLabels?.source || "", back: profile.sideLabels?.target || "" },
    front: build(profile.presentation.front),
    back: build(profile.presentation.back),
  };
};
