import { resolveWordStage } from "./buildLearningStats.js";

// Where one deck stands with the learner, word by word: what the deck page
// shows. Pure, from the deck's own words, review cards and review log, so
// the web and the desktop app show the same thing.

const DAY_MS = 24 * 60 * 60 * 1000;

const toId = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
};

const toCount = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
};

const toMs = (msValue, isoValue) => {
  const ms = Number(msValue);

  if (Number.isFinite(ms) && ms > 0) {
    return ms;
  }

  const parsed = Date.parse(isoValue || "");
  return Number.isFinite(parsed) ? parsed : null;
};

// A log written on the desktop has only its local day.
const toLogMs = (log) => toMs(log?.reviewedAtMs, log?.reviewedAt) ?? toMs(null, log?.dayKey ? `${log.dayKey}T12:00:00` : "");

export const buildDeckStudy = ({ words = [], reviewCards = [], reviewLogs = [], now = Date.now() } = {}) => {
  const cardByWordId = new Map();

  reviewCards.forEach((card) => {
    const wordId = toId(card?.wordId);

    if (wordId) {
      cardByWordId.set(wordId, card);
    }
  });

  const stages = { new: 0, learning: 0, young: 0, mature: 0 };
  const wordStudy = {};
  let dueNow = 0;
  let nextDueAtMs = null;
  let totalWords = 0;

  words.forEach((word) => {
    const wordId = toId(word?.id);

    if (!wordId) {
      return;
    }

    totalWords += 1;
    const card = cardByWordId.get(wordId);
    const stage = resolveWordStage(card);
    stages[stage] += 1;

    // A new word is not due: it comes in by the daily limit.
    const dueAtMs = stage === "new" ? null : toMs(card?.dueAtMs, card?.dueAt);
    const isDue = dueAtMs !== null && dueAtMs <= now;

    if (isDue) {
      dueNow += 1;
    } else if (dueAtMs !== null && (nextDueAtMs === null || dueAtMs < nextDueAtMs)) {
      nextDueAtMs = dueAtMs;
    }

    wordStudy[wordId] = {
      stage,
      isDue,
      dueAtMs,
      reps: toCount(card?.reps),
      lapses: toCount(card?.lapses),
      lastReviewedAtMs: toMs(card?.lastReviewedAtMs, card?.lastReviewedAt),
    };
  });

  const weekAgoMs = now - 7 * DAY_MS;
  const monthAgoMs = now - 30 * DAY_MS;
  let reviews7d = 0;
  let reviews30d = 0;
  let again30d = 0;
  let lastReviewedAtMs = null;

  reviewLogs.forEach((log) => {
    const reviewedAtMs = toLogMs(log);

    if (reviewedAtMs === null || reviewedAtMs > now) {
      return;
    }

    if (lastReviewedAtMs === null || reviewedAtMs > lastReviewedAtMs) {
      lastReviewedAtMs = reviewedAtMs;
    }

    if (reviewedAtMs >= weekAgoMs) {
      reviews7d += 1;
    }

    if (reviewedAtMs >= monthAgoMs) {
      reviews30d += 1;

      if (log?.rating === "again") {
        again30d += 1;
      }
    }
  });

  return {
    totalWords,
    stages,
    known: stages.young + stages.mature,
    dueNow,
    nextDueAtMs,
    reviews7d,
    reviewsTotal: reviewLogs.length,
    lastReviewedAtMs,
    // Remembered = anything but Again, over the last 30 days.
    recall30d: reviews30d > 0 ? Math.round(((reviews30d - again30d) / reviews30d) * 100) : null,
    words: wordStudy,
  };
};
