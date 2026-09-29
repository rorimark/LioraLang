import { buildAchievements } from "./buildAchievements.js";
import { buildLearningStats } from "./buildLearningStats.js";

export const ACTIVITY_WEEKS = 53;

// The progress page's payload. The numbers themselves come from
// buildLearningStats, so every platform computes them the same way; this
// adds when they were computed, the stickers and the plain totals. A year of activity:
// the page shows as many of its weeks as the screen has room for.
export const buildProgressOverview = ({
  decks = [],
  words = [],
  reviewCards = [],
  reviewLogs = [],
  profileScope = "",
  now = Date.now(),
} = {}) => {
  const stats = buildLearningStats({ decks, words, reviewCards, reviewLogs, now, weeks: ACTIVITY_WEEKS });

  return {
    generatedAt: new Date(now).toISOString(),
    // Whose numbers these are, so the page can keep each profile's
    // stickers apart.
    profileScope,
    ...stats,
    achievements: buildAchievements(stats),
    totals: {
      decks: decks.length,
      reviews: reviewLogs.length,
    },
  };
};
