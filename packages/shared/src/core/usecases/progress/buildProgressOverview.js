import { buildLearningStats } from "./buildLearningStats.js";

export const ACTIVITY_WEEKS = 53;

// The progress page's payload. The numbers themselves come from
// buildLearningStats, so every platform computes them the same way; this
// adds when they were computed and the plain totals. A year of activity:
// the page shows as many of its weeks as the screen has room for.
export const buildProgressOverview = ({
  decks = [],
  words = [],
  reviewCards = [],
  reviewLogs = [],
  totalReviews,
  now = Date.now(),
} = {}) => ({
  generatedAt: new Date(now).toISOString(),
  ...buildLearningStats({ decks, words, reviewCards, reviewLogs, now, weeks: ACTIVITY_WEEKS }),
  totals: {
    decks: decks.length,
    reviews: Number.isFinite(totalReviews) ? totalReviews : reviewLogs.length,
  },
});
