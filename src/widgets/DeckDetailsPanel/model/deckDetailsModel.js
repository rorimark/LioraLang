// The deck page's word list, without React: which words a filter keeps,
// in which order, and how far away a date is. Everything here is pure.

export const STAGE_FILTERS = ["all", "due", "new", "learning", "known"];
export const WORD_SORTS = ["deck", "az", "due", "hard"];

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;

const NOT_STUDIED = Object.freeze({
  stage: "new",
  isDue: false,
  dueAtMs: null,
  reps: 0,
  lapses: 0,
  lastReviewedAtMs: null,
});

export const resolveWordStudy = (study, word) => study?.words?.[word?.id] || NOT_STUDIED;

export const matchesStageFilter = (wordStudy, filter) => {
  switch (filter) {
    case "due":
      return wordStudy.isDue;
    case "new":
      return wordStudy.stage === "new";
    case "learning":
      return wordStudy.stage === "learning";
    case "known":
      return wordStudy.stage === "young" || wordStudy.stage === "mature";
    default:
      return true;
  }
};

export const countByStageFilter = (words, study) =>
  Object.fromEntries(
    STAGE_FILTERS.map((filter) => [
      filter,
      words.filter((word) => matchesStageFilter(resolveWordStudy(study, word), filter)).length,
    ]),
  );

const clean = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

export const matchesWordQuery = (word, query) => {
  const needle = clean(query);

  if (!needle) {
    return true;
  }

  return [word?.source, word?.target, word?.tertiary, word?.image?.alt, ...(Array.isArray(word?.tags) ? word.tags : [])]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
};

// The text a word is sorted and found by: its first side, or the other one
// when the first side is a picture.
const sortKey = (word) => String(word?.source || word?.image?.alt || word?.target || "");

export const sortWords = (words, study, sort, locale) => {
  if (sort === "deck" || !WORD_SORTS.includes(sort)) {
    return words;
  }

  const collator = new Intl.Collator(locale || undefined, { sensitivity: "base", numeric: true });
  const byName = (first, second) => collator.compare(sortKey(first), sortKey(second));

  if (sort === "az") {
    return [...words].sort(byName);
  }

  if (sort === "due") {
    // Due now first, then by when they come due; words not studied last.
    const dueRank = (word) => {
      const wordStudy = resolveWordStudy(study, word);
      return wordStudy.dueAtMs === null ? Number.POSITIVE_INFINITY : wordStudy.dueAtMs;
    };

    return [...words].sort((first, second) => dueRank(first) - dueRank(second) || byName(first, second));
  }

  // The hardest: forgotten most often, then the ones still being learned.
  const stageWeight = { learning: 3, young: 2, mature: 1, new: 0 };

  return [...words].sort((first, second) => {
    const a = resolveWordStudy(study, first);
    const b = resolveWordStudy(study, second);
    return b.lapses - a.lapses || stageWeight[b.stage] - stageWeight[a.stage] || byName(first, second);
  });
};

export const filterWords = (words, study, { filter = "all", query = "" } = {}) =>
  words.filter((word) => matchesStageFilter(resolveWordStudy(study, word), filter) && matchesWordQuery(word, query));

const startOfLocalDay = (ms) => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// How far a moment is from now, as Intl.RelativeTimeFormat takes it.
// Within a day in minutes or hours; beyond that in calendar days, so
// "tomorrow" means tomorrow and not 24 hours from now.
export const toRelativeTime = (ms, now = Date.now()) => {
  const diff = ms - now;
  const distance = Math.abs(diff);

  if (distance < HOUR_MS) {
    return { value: Math.round(diff / MINUTE_MS), unit: "minute" };
  }

  const days = Math.round((startOfLocalDay(ms) - startOfLocalDay(now)) / DAY_MS);

  if (days === 0) {
    return { value: Math.round(diff / HOUR_MS), unit: "hour" };
  }

  if (Math.abs(days) < 45) {
    return { value: days, unit: "day" };
  }

  return { value: Math.round(days / 30), unit: "month" };
};
