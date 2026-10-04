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

import { subjectRegistry } from "./registry.js";
import { SUBJECTS } from "./constants.js";
export { SUBJECTS, DIFFICULTIES } from "./constants.js";
export { createSubjectRegistry, subjectRegistry } from "./registry.js";
export const SUBJECT_IDS = subjectRegistry.ids;
export const isSupportedSubject = (value) => subjectRegistry.has(value);
export const normalizeSubject = (value) => subjectRegistry.has(value) ? (value || subjectRegistry.defaultId) : subjectRegistry.defaultId;
export const storedSubject = (value) => {
  const subject = normalizeSubject(value);
  return subject === SUBJECTS.language ? "" : subject;
};
export const getSubjectProfile = (subject) => subjectRegistry.get(normalizeSubject(subject));

export const getStudyPresentations = (deck = {}, words = []) => {
  const profile = getSubjectProfile(deck.subject);
  if (deck.pictureSide) return [];
  return (profile.studyPresentations || []).filter((option) => !option.requires ||
    (option.requires === "image" && words.some((word) => Boolean(word.image?.assetId))));
};

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
  const text = ["code", "formula", "multiline"].includes(spec.type) ? value.replace(/\r\n?/g, "\n").replace(/\s+$/, "") : value.replace(/\s+/g, " ").trim();
  return text.length > spec.maxLength ? text.slice(0, spec.maxLength) : text;
};

// The fields a profile allows, cleaned; empty ones are left out, and so is
// the whole object when nothing is set.
export const normalizeProfileFields = (specs, value) => {
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
  normalizeProfileFields(getSubjectProfile(subject).entryFields, value);

export const normalizeDeckSubjectFields = (subject, value) =>
  normalizeProfileFields(getSubjectProfile(subject).deckFields, value);

export const createDefaultSubjectFields = (subject, language) => {
  const profile = getSubjectProfile(subject);
  return normalizeProfileFields(profile.deckFields, Object.fromEntries(
    Object.entries(profile.deckFields).filter(([, spec]) => spec.languageValues).map(([key]) => [key, language]),
  ));
};

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

  if (spec.block === "sequence") {
    const raw = readSource(spec.from, context);
    const items = typeof raw === "string" ? raw.split("\n").map(line => line.replace(/^\s*\d+[.)]\s*/, "").trim()).filter(Boolean) : [];
    return items.length ? { type: "sequence", role: spec.role, labelKey: spec.labelKey, items } : null;
  }

  const value = readSource(spec.from, context);
  // A text that stands alone on its face, with nothing it introduces, is
  // set as the headline.
  const leads = (Boolean(spec.leadsWithout) && !cleanText(readSource(spec.leadsWithout, context))) || matchesCondition(spec.leadsWhen, context);
  const text = spec.block === "code" ? (typeof value === "string" ? value.replace(/\s+$/, "") : "") : cleanText(value);

  if (!text) {
    return null;
  }

  return ["code", "formula", "callout"].includes(spec.block)
    ? { type: spec.block, emphasis: spec.emphasis, ...(spec.labelKey ? { labelKey: spec.labelKey } : {}), text }
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
