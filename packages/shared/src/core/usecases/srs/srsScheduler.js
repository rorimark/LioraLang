import { DEFAULT_APP_PREFERENCES } from "../../../config/appPreferencesDefaults.js";

export const SRS_CARD_STATES = Object.freeze({
  new: "new",
  learning: "learning",
  review: "review",
  relearning: "relearning",
});
export const SRS_CARD_RATINGS = Object.freeze({
  again: "again",
  hard: "hard",
  good: "good",
  easy: "easy",
});
export const DEFAULT_SRS_SETTINGS = Object.freeze({
  newCardsPerDay: 20,
  maxReviewsPerDay: 100,
  learningStepsMinutes: Object.freeze([10]),
  easyBonus: 1.3,
  lapsePenalty: 0.2,
});
export const DEFAULT_STUDY_SETTINGS = Object.freeze({
  shuffleMode: "off",
  shuffleSeed: null,
  dailyGoal: DEFAULT_APP_PREFERENCES.studySession.dailyGoal,
  repeatWrongCards: DEFAULT_APP_PREFERENCES.studySession.repeatWrongCards,
});
const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const MAX_DAYS = 36_500;
const RELEARNING_MINUTES = 10;
const numberInRange = (value, min, max, fallback) => {
  if (value === null || value === "" || !Number.isFinite(Number(value)))
    return fallback;
  return Math.min(max, Math.max(min, Number(value)));
};
const integer = (value, min, max, fallback) =>
  Math.round(numberInRange(value, min, max, fallback));
const ease = (value) => Number(numberInRange(value, 1.3, 3, 2.5).toFixed(2));

const parseSteps = (value) => {
  const tokens = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const steps = tokens
    .map((token) => {
      const match = String(token)
        .trim()
        .match(
          /^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)?$/i,
        );
      if (!match || Number(match[1]) <= 0) return null;
      const multiplier = /^d/i.test(match[2])
        ? 1440
        : /^h/i.test(match[2])
          ? 60
          : 1;
      return integer(Number(match[1]) * multiplier, 1, MAX_DAYS * 1440, 1);
    })
    .filter((step) => step !== null);
  return steps.length
    ? [...new Set(steps)].sort((a, b) => a - b).slice(0, 100)
    : [...DEFAULT_SRS_SETTINGS.learningStepsMinutes];
};

export const normalizeSrsSettings = (settings = {}) => {
  const source = settings.spacedRepetition || settings;
  const isNormalized = Array.isArray(source.learningStepsMinutes);
  return {
    newCardsPerDay: integer(
      source.newCardsPerDay,
      0,
      999,
      DEFAULT_SRS_SETTINGS.newCardsPerDay,
    ),
    maxReviewsPerDay: integer(
      source.maxReviewsPerDay,
      0,
      5000,
      DEFAULT_SRS_SETTINGS.maxReviewsPerDay,
    ),
    learningStepsMinutes: parseSteps(
      isNormalized ? source.learningStepsMinutes : source.learningSteps,
    ),
    easyBonus: numberInRange(
      isNormalized ? source.easyBonus : Number(source.easyBonus) / 100,
      1,
      3,
      DEFAULT_SRS_SETTINGS.easyBonus,
    ),
    lapsePenalty: numberInRange(
      isNormalized ? source.lapsePenalty : Number(source.lapsePenalty) / 100,
      0,
      1,
      DEFAULT_SRS_SETTINGS.lapsePenalty,
    ),
  };
};
export const normalizeStudySettings = (settings = {}) => {
  const source = settings.studySession || settings;
  const shuffleMode = ["off", "per_session", "always"].includes(
    source.shuffleMode,
  )
    ? source.shuffleMode
    : "off";
  return {
    shuffleMode,
    shuffleSeed:
      shuffleMode === "per_session"
        ? integer(source.shuffleSeed, 1, 2_147_483_646, 1)
        : null,
    dailyGoal: integer(
      source.dailyGoal,
      1,
      999,
      DEFAULT_STUDY_SETTINGS.dailyGoal,
    ),
    repeatWrongCards:
      typeof source.repeatWrongCards === "boolean"
        ? source.repeatWrongCards
        : DEFAULT_STUDY_SETTINGS.repeatWrongCards,
  };
};
export const normalizeCardState = (value) =>
  Object.values(SRS_CARD_STATES).includes(value) ? value : "new";
export const normalizeRating = (value) => {
  const rating = String(value || "")
    .trim()
    .toLowerCase();
  if (!Object.values(SRS_CARD_RATINGS).includes(rating))
    throw new Error("Unsupported SRS rating");
  return rating;
};
export const normalizeReviewCard = (card = {}) => {
  const state = normalizeCardState(card.state);
  const numericDue =
    card.dueAtMs === null || card.dueAtMs === undefined || card.dueAtMs === ""
      ? NaN
      : Number(card.dueAtMs);
  const parsedDue = Number.isFinite(numericDue)
    ? numericDue
    : Date.parse(card.dueAt);
  const dueAtMs =
    Number.isFinite(parsedDue) &&
    Math.abs(parsedDue) <= 8.64e15 - MAX_DAYS * DAY
      ? parsedDue
      : null;
  return {
    state,
    learningStep: integer(card.learningStep, 0, 99, 0),
    dueAtMs,
    dueAt: dueAtMs === null ? null : new Date(dueAtMs).toISOString(),
    intervalDays: integer(
      card.intervalDays,
      0,
      MAX_DAYS,
      state === "new" ? 0 : 1,
    ),
    easeFactor: ease(card.easeFactor),
    reps: integer(card.reps, 0, 1_000_000, 0),
    lapses: integer(card.lapses, 0, 1_000_000, 0),
  };
};
export const getQueueTypeByState = (state) =>
  state === "new" || state === "review" ? state : "learning";
export const getCardRevision = (card) =>
  JSON.stringify(normalizeReviewCard(card));
export const assertGradeAllowed = ({ card, expectedRevision, nowMs }) => {
  if (
    expectedRevision !== undefined &&
    expectedRevision !== getCardRevision(card)
  ) {
    throw new Error(
      "This card's progress changed. Refresh the session before rating it again.",
    );
  }
  const normalized = normalizeReviewCard(card);
  if (normalized.state !== "new" && normalized.dueAtMs > nowMs) {
    throw new Error(
      "This card is not due yet. Refresh the session to continue.",
    );
  }
};

// A deterministic, SM-2-style scheduler. The same function powers previews and writes.
export const resolveScheduleOutcome = ({
  card: rawCard,
  rating: rawRating,
  srsSettings = {},
  studySettings = {},
  nowMs = Date.now(),
}) => {
  const card = normalizeReviewCard(rawCard);
  const rating = normalizeRating(rawRating);
  const settings = normalizeSrsSettings(srsSettings);
  const study = normalizeStudySettings(studySettings);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const base = { ...card, reps: card.reps + 1 };
  const scheduleMinutes = (minutes, patch) => {
    const dueAtMs =
      now + Math.min(MAX_DAYS * 1440, Math.max(1, minutes)) * MINUTE;
    return {
      ...base,
      ...patch,
      dueAtMs,
      dueAt: new Date(dueAtMs).toISOString(),
    };
  };
  const scheduleReview = (days, patch = {}) => {
    const intervalDays = integer(days, 1, MAX_DAYS, 1);
    return scheduleMinutes(intervalDays * 1440, {
      state: "review",
      learningStep: 0,
      intervalDays,
      ...patch,
    });
  };
  if (card.state === "review") {
    const interval = Math.max(1, card.intervalDays);
    if (rating === "again") {
      return scheduleMinutes(study.repeatWrongCards ? 1 : RELEARNING_MINUTES, {
        state: "relearning",
        learningStep: 0,
        intervalDays: Math.max(1, Math.round(interval * settings.lapsePenalty)),
        easeFactor: ease(card.easeFactor - 0.2),
        lapses: card.lapses + 1,
      });
    }
    const overdueDays =
      card.dueAtMs === null ? 0 : Math.max(0, (now - card.dueAtMs) / DAY);
    const hard = Math.max(interval + 1, Math.round(interval * 1.2));
    const good = Math.max(
      hard + 1,
      Math.round((interval + overdueDays / 2) * card.easeFactor),
    );
    const easyInterval = Math.max(
      good + 1,
      Math.round(
        (interval + overdueDays) * card.easeFactor * settings.easyBonus,
      ),
    );
    if (rating === "hard")
      return scheduleReview(hard, { easeFactor: ease(card.easeFactor - 0.15) });
    if (rating === "easy")
      return scheduleReview(easyInterval, {
        easeFactor: ease(card.easeFactor + 0.15),
      });
    return scheduleReview(good);
  }

  const isRelearning = card.state === "relearning";
  const steps = isRelearning
    ? [RELEARNING_MINUTES]
    : settings.learningStepsMinutes;
  const step = Math.min(card.learningStep, steps.length - 1);
  const learningState = isRelearning ? "relearning" : "learning";
  // Long custom learning steps must not graduate to a *shorter* review interval.
  const graduationDays = isRelearning
    ? Math.max(1, card.intervalDays)
    : Math.max(
        3,
        Math.floor((steps.at(-1) * (steps.length === 1 ? 3 : 1.5)) / 1440) + 1,
      );
  if (rating === "easy")
    return scheduleReview(
      Math.max(
        7,
        graduationDays + 1,
        Math.round(graduationDays * settings.easyBonus),
      ),
    );
  if (rating === "again")
    return scheduleMinutes(
      study.repeatWrongCards ? Math.min(1, steps[0]) : steps[0],
      { state: learningState, learningStep: 0 },
    );
  if (rating === "hard") {
    // A recalled word can leave single-step learning, even with difficulty.
    if (steps.length === 1 && !isRelearning)
      return scheduleReview(Math.max(1, Math.ceil((steps[0] * 3) / 1440)));
    const minutes =
      step === 0 && steps.length > 1
        ? (steps[0] + steps[1]) / 2
        : steps[step] * 1.5;
    return scheduleMinutes(minutes, {
      state: learningState,
      learningStep: step,
    });
  }
  if (step + 1 < steps.length)
    return scheduleMinutes(steps[step + 1], {
      state: learningState,
      learningStep: step + 1,
    });
  return scheduleReview(graduationDays);
};

export const formatRelativeInterval = (dueAtMs, nowMs) => {
  const minutes = Math.max(1, Math.ceil((dueAtMs - nowMs) / MINUTE));
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
};
export const buildRatingPreview = (options) =>
  Object.fromEntries(
    Object.values(SRS_CARD_RATINGS).map((rating) => {
      const outcome = resolveScheduleOutcome({ ...options, rating });
      return [rating, formatRelativeInterval(outcome.dueAtMs, options.nowMs)];
    }),
  );
