import {
  DEFAULT_SRS_SETTINGS,
  DEFAULT_STUDY_SETTINGS,
  normalizeReviewCard,
  resolveScheduleOutcome,
} from "@shared/core/usecases/srs";

const DAY_MS = 24 * 60 * 60 * 1000;
const REVIEW_COUNT = 8;
const START_MS = 0;

const formatGap = (days) => {
  if (days < 1) return `+${Math.round(days * 24)}h`;
  return `+${Math.round(days)}d`;
};

// The schedule the app itself produces for a new word answered Good at every
// review, computed with the real engine so the landing never drifts from it.
export const buildReviewTimeline = () => {
  let card = normalizeReviewCard({});
  let nowMs = START_MS;
  const points = [];

  for (let review = 1; review <= REVIEW_COUNT; review += 1) {
    const outcome = resolveScheduleOutcome({
      card,
      rating: "good",
      srsSettings: DEFAULT_SRS_SETTINGS,
      studySettings: DEFAULT_STUDY_SETTINGS,
      nowMs,
    });
    const gapDays = (outcome.dueAtMs - nowMs) / DAY_MS;
    points.push({
      review,
      gapDays,
      gapLabel: formatGap(gapDays),
      day: Math.round((outcome.dueAtMs - START_MS) / DAY_MS),
    });
    card = { ...card, ...outcome };
    nowMs = outcome.dueAtMs;
  }

  const lastDay = points[points.length - 1].day;
  const longestGap = Math.max(...points.map((point) => point.gapDays));
  // Bar height is the gap before the next review. A square-root scale keeps
  // the one-day learning steps visible next to a four-month gap.
  const toHeight = (gapDays) => Math.sqrt(gapDays) / Math.sqrt(longestGap);

  return {
    points: points.map((point) => ({ ...point, height: toHeight(point.gapDays) })),
    reviews: points.length,
    months: Math.round(lastDay / 30),
  };
};

// The schedule does not depend on anything the page holds, so it is worked
// out once when the module loads.
const REVIEW_TIMELINE = buildReviewTimeline();

export const useReviewTimeline = () => REVIEW_TIMELINE;
