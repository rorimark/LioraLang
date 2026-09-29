// Stickers: tiers of eight things worth doing, all read from the same
// stats as the rest of the progress page. Nothing here is invented: each
// tier is earned by a number the learner can check.
//
// Anything counted from the review log is dated: the day the tier was
// crossed is known. Anything counted from the words as they are now
// (known, long-term, decks mastered) is not, and can fall back when words
// are forgotten; the page keeps those once earned and dates them the day
// it first saw them.

// A day counts as a clean sheet with at least this many reviews and no
// Again among them.
export const CLEAN_SHEET_MIN_REVIEWS = 20;
// A deck counts as mastered with at least this many words, all known.
export const MASTERED_DECK_MIN_WORDS = 10;

const formatCount = (value) => new Intl.NumberFormat("en-US").format(value);

export const ACHIEVEMENT_FAMILIES = [
  {
    key: "known",
    title: "Vocabulary",
    unit: "words",
    unitOne: "word",
    source: "state",
    tiers: [10, 50, 100, 250, 500, 1000, 2500, 5000],
    describe: (target) => `Know ${formatCount(target)} words.`,
  },
  {
    key: "streak",
    title: "Streak",
    unit: "days",
    unitOne: "day",
    source: "log",
    tiers: [3, 7, 14, 30, 60, 100, 200, 365],
    describe: (target) => `Study ${formatCount(target)} days in a row.`,
  },
  {
    key: "mature",
    title: "Long-term memory",
    unit: "words",
    unitOne: "word",
    source: "state",
    tiers: [10, 50, 100, 250, 500, 1000],
    describe: (target) =>
      `Have ${formatCount(target)} words in long-term memory, with their next review three weeks away or more.`,
  },
  {
    key: "days",
    title: "Days studied",
    unit: "days",
    unitOne: "day",
    source: "log",
    tiers: [1, 10, 30, 100, 200, 365, 730],
    describe: (target) => (target === 1 ? "Finish your first review." : `Study on ${formatCount(target)} different days.`),
  },
  {
    key: "reviews",
    title: "Reviews",
    unit: "reviews",
    unitOne: "review",
    source: "log",
    tiers: [100, 500, 1000, 2500, 5000, 10000, 25000, 50000],
    describe: (target) => `Review ${formatCount(target)} cards in total.`,
  },
  {
    key: "bigDay",
    title: "Big day",
    unit: "in a day",
    unitOne: "in a day",
    source: "log",
    tiers: [50, 100, 200, 300, 500],
    describe: (target) => `Review ${formatCount(target)} cards in one day.`,
  },
  {
    key: "cleanSheet",
    title: "Clean sheet",
    unit: "days",
    unitOne: "day",
    source: "log",
    tiers: [1, 5, 10, 25, 50, 100],
    describe: (target) =>
      `${target === 1 ? "Have a day" : `Have ${formatCount(target)} days`} with ${CLEAN_SHEET_MIN_REVIEWS} or more reviews and not one Again.`,
  },
  {
    key: "decks",
    title: "Decks mastered",
    unit: "decks",
    unitOne: "deck",
    source: "state",
    tiers: [1, 3, 5, 10],
    describe: (target) =>
      `Know every word in ${target === 1 ? "a deck" : `${formatCount(target)} decks`} of ${MASTERED_DECK_MIN_WORDS} words or more.`,
  },
];

const isNextDay = (previousKey, dayKey) => {
  const [year, month, day] = previousKey.split("-").map(Number);
  const next = new Date(year, month - 1, day + 1);
  const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`;
  return nextKey === dayKey;
};

// Walks the history once and notes, for each log-based family, the value
// reached and the day each tier was first crossed.
const readHistory = (history) => {
  const values = { streak: 0, days: 0, reviews: 0, bigDay: 0, cleanSheet: 0 };
  const crossedOn = { streak: {}, days: {}, reviews: {}, bigDay: {}, cleanSheet: {} };
  const tiersByKey = Object.fromEntries(ACHIEVEMENT_FAMILIES.map((family) => [family.key, family.tiers]));
  let run = 0;
  let previousKey = "";

  const note = (key, value, date) => {
    if (value > values[key]) {
      values[key] = value;
    }

    tiersByKey[key].forEach((target) => {
      if (value >= target && !crossedOn[key][target]) {
        crossedOn[key][target] = date;
      }
    });
  };

  history.forEach(({ date, reviews = 0, again = 0 }) => {
    if (!date || reviews <= 0) {
      return;
    }

    run = previousKey && isNextDay(previousKey, date) ? run + 1 : 1;
    previousKey = date;

    note("streak", run, date);
    note("days", values.days + 1, date);
    note("reviews", values.reviews + reviews, date);
    note("bigDay", reviews, date);

    if (reviews >= CLEAN_SHEET_MIN_REVIEWS && again === 0) {
      note("cleanSheet", values.cleanSheet + 1, date);
    }
  });

  return { values, crossedOn };
};

export const buildAchievements = (stats = {}) => {
  const history = Array.isArray(stats.history) ? stats.history : [];
  const { values, crossedOn } = readHistory(history);
  const decks = Array.isArray(stats.decks) ? stats.decks : [];
  const current = {
    ...values,
    known: Number(stats.known) || 0,
    mature: Number(stats.stages?.mature) || 0,
    decks: decks.filter((deck) => deck.words >= MASTERED_DECK_MIN_WORDS && deck.known >= deck.words).length,
  };

  const families = ACHIEVEMENT_FAMILIES.map((family) => {
    const value = current[family.key];

    return {
      key: family.key,
      title: family.title,
      unit: family.unit,
      unitOne: family.unitOne,
      source: family.source,
      current: value,
      tiers: family.tiers.map((target) => ({
        id: `${family.key}-${target}`,
        family: family.key,
        target,
        description: family.describe(target),
        earned: value >= target,
        earnedOn: family.source === "log" ? crossedOn[family.key][target] || null : null,
      })),
    };
  });

  return { families };
};
