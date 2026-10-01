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

const LANGUAGE_PROFILE = Object.freeze({
  id: SUBJECTS.language,
  usesLanguages: true,
  usesAssistant: true,
  directions: [DIRECTIONS.sourceToTarget, DIRECTIONS.targetToSource, DIRECTIONS.mixed],
  deckFields: {},
  entryFields: {},
  presentation: null,
});

// Programming: a question about a piece of code, the code itself as the
// thing to look at, and a short answer. The technology is the deck's
// context; difficulty is not CEFR.
const PROGRAMMING_PROFILE = Object.freeze({
  id: SUBJECTS.programming,
  usesLanguages: false,
  usesAssistant: false,
  directions: [DIRECTIONS.sourceToTarget],
  deckFields: {
    technology: { type: "text", maxLength: 40 },
  },
  entryFields: {
    code: { type: "code", maxLength: 4000 },
    difficulty: { type: "choice", values: DIFFICULTIES },
  },
  presentation: {
    layout: "code",
    front: [
      { block: "meta", items: [{ kind: "technology", from: "deck.technology" }, { kind: "difficulty", from: "entry.difficulty" }] },
      { block: "text", role: "prompt", from: "entry.source" },
      { block: "code", emphasis: "primary", from: "entry.code" },
    ],
    back: [
      { block: "text", role: "answer", from: "entry.target" },
      { block: "code", emphasis: "secondary", from: "entry.code" },
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

    if (normalized) {
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

const buildBlock = (spec, context) => {
  if (spec.block === "meta") {
    const items = spec.items
      .map((item) => ({ kind: item.kind, value: cleanText(readSource(item.from, context)) }))
      .filter((item) => item.value);
    return items.length ? { type: "meta", items } : null;
  }

  if (spec.block === "list") {
    const raw = readSource(spec.from, context);
    const items = (Array.isArray(raw) ? raw : []).map(cleanText).filter(Boolean);
    return items.length ? { type: "list", role: spec.role, items } : null;
  }

  const value = readSource(spec.from, context);
  const text = spec.block === "code" ? (typeof value === "string" ? value.replace(/\s+$/, "") : "") : cleanText(value);

  if (!text) {
    return null;
  }

  return spec.block === "code"
    ? { type: "code", emphasis: spec.emphasis, text }
    : { type: "text", role: spec.role, text };
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
    front: build(profile.presentation.front),
    back: build(profile.presentation.back),
  };
};
