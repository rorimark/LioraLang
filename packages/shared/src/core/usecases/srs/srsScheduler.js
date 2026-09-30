import { DEFAULT_APP_PREFERENCES } from "../../../config/appPreferencesDefaults.js";
import {
  GRADE,
  MIN_STABILITY,
  intervalForStability,
  memoryFromSm2,
  nextMemory,
} from "./fsrs.js";

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
  // The share of words the schedule aims to have remembered when they come
  // back. Higher means more reviews and fewer words forgotten.
  desiredRetention: 0.9,
  // No word waits longer than this between reviews.
  maximumIntervalDays: 365,
  // Kept so older settings still read; the FSRS schedule does not use them.
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
    desiredRetention: Number(
      numberInRange(
        isNormalized ? source.desiredRetention : Number(source.desiredRetention) / 100,
        0.7,
        0.97,
        DEFAULT_SRS_SETTINGS.desiredRetention,
      ).toFixed(2),
    ),
    maximumIntervalDays: integer(
      source.maximumIntervalDays,
      1,
      MAX_DAYS,
      DEFAULT_SRS_SETTINGS.maximumIntervalDays,
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
const toTimestamp = (ms, iso) => {
  const numeric = ms === null || ms === undefined || ms === "" ? NaN : Number(ms);
  const value = Number.isFinite(numeric) ? numeric : Date.parse(iso);
  return Number.isFinite(value) && Math.abs(value) <= 8.64e15 ? value : null;
};

// FSRS memory state, when the card has one. Cards scheduled before FSRS
// have none and get it from their interval and ease when next answered.
const normalizeMemory = (card) => {
  const stability = Number(card.stability);
  const difficulty = Number(card.difficulty);

  if (
    card.stability === null ||
    card.stability === undefined ||
    card.stability === "" ||
    !Number.isFinite(stability) ||
    !Number.isFinite(difficulty) ||
    stability < MIN_STABILITY
  ) {
    return { stability: null, difficulty: null };
  }

  return {
    stability: Number(Math.min(stability, MAX_DAYS).toFixed(4)),
    difficulty: Number(Math.min(10, Math.max(1, difficulty)).toFixed(4)),
  };
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
    ...normalizeMemory(card),
    lastReviewedAtMs: toTimestamp(card.lastReviewedAtMs, card.lastReviewedAt),
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

// The scheduler: learning steps in minutes for a new or lapsed word, then
// FSRS for everything measured in days. The same function powers the
// intervals shown on the grade keys and the ones written, so a key never
// promises one date and saves another.

const GRADE_BY_RATING = {
  again: GRADE.again,
  hard: GRADE.hard,
  good: GRADE.good,
  easy: GRADE.easy,
};

// A repeatable number in [0, 1) for a word and its review count, so the
// same card at the same point always lands on the same day.
const seededUnit = (seed, salt) => {
  let value = (Math.imul(Number(seed) | 0, 0x9e3779b1) ^ Math.imul(Number(salt) | 0, 0x85ebca6b)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
  return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
};

// Anki's fuzz ranges: a few percent either way, so words learned together
// do not all come back on the same day.
const FUZZ_RANGES = [
  { start: 2.5, end: 7, factor: 0.15 },
  { start: 7, end: 20, factor: 0.1 },
  { start: 20, end: Infinity, factor: 0.05 },
];

const fuzzInterval = ({ days, seed, salt, maximumDays, elapsedDays = 0 }) => {
  const capped = Math.min(days, maximumDays);

  if (seed === undefined || seed === null || capped < 2.5) {
    return Math.max(1, Math.min(Math.round(capped), maximumDays));
  }

  const delta = FUZZ_RANGES.reduce(
    (sum, range) => sum + range.factor * Math.max(Math.min(capped, range.end) - range.start, 0),
    1,
  );
  let low = Math.max(2, Math.round(capped - delta));
  const high = Math.min(Math.round(capped + delta), maximumDays);

  if (capped > elapsedDays) {
    low = Math.max(low, Math.floor(elapsedDays) + 1);
  }

  low = Math.min(low, high);
  return Math.floor(seededUnit(seed, salt) * (high - low + 1) + low);
};

// The card's memory before this answer: its own, or, for a card scheduled
// before FSRS, one worked out from its interval and ease.
const memoryBefore = (card) => {
  if (card.stability !== null && card.difficulty !== null) {
    return { stability: card.stability, difficulty: card.difficulty };
  }

  if (card.state === "review" || card.state === "relearning") {
    return memoryFromSm2(card);
  }

  return null;
};

// When the card was last answered. Older cards did not record it; for a
// review card it is the due date less its interval.
const lastReviewedAt = (card, now) => {
  if (card.lastReviewedAtMs !== null) return card.lastReviewedAtMs;
  if (card.state === "review" && card.dueAtMs !== null) {
    return card.dueAtMs - Math.max(1, card.intervalDays) * DAY;
  }
  return now;
};

export const resolveScheduleOutcome = ({
  card: rawCard,
  rating: rawRating,
  srsSettings = {},
  studySettings = {},
  nowMs = Date.now(),
  seed,
}) => {
  const card = normalizeReviewCard(rawCard);
  const rating = normalizeRating(rawRating);
  const settings = normalizeSrsSettings(srsSettings);
  const study = normalizeStudySettings(studySettings);
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();
  const retention = settings.desiredRetention;
  const maximumDays = Math.min(settings.maximumIntervalDays, MAX_DAYS);
  const previousMemory = memoryBefore(card);
  const elapsedDays = Math.max(0, (now - lastReviewedAt(card, now)) / DAY);
  const memoryFor = (value) =>
    nextMemory({ memory: previousMemory, grade: GRADE_BY_RATING[value], elapsedDays });
  const memory = memoryFor(rating);
  const base = {
    ...card,
    reps: card.reps + 1,
    stability: Number(memory.stability.toFixed(4)),
    difficulty: Number(memory.difficulty.toFixed(4)),
    lastReviewedAtMs: now,
  };
  const scheduleMinutes = (minutes, patch) => {
    const dueAtMs = now + Math.min(MAX_DAYS * 1440, Math.max(1, minutes)) * MINUTE;
    return {
      ...base,
      ...patch,
      dueAtMs,
      dueAt: new Date(dueAtMs).toISOString(),
    };
  };
  const scheduleReview = (days, patch = {}) => {
    const intervalDays = integer(days, 1, maximumDays, 1);
    return scheduleMinutes(intervalDays * 1440, {
      state: "review",
      learningStep: 0,
      intervalDays,
      ...patch,
    });
  };
  // Days for a grade from the memory it would leave, fuzzed and capped.
  const daysFor = (value) =>
    fuzzInterval({
      days: intervalForStability(memoryFor(value).stability, retention),
      seed,
      salt: card.reps * 4 + GRADE_BY_RATING[value],
      maximumDays,
      elapsedDays: card.state === "review" ? elapsedDays : 0,
    });
  // Hard, Good and Easy always come back in that order, whatever the model
  // or the fuzz says, and never past the longest gap.
  const orderedDays = () => {
    const hard = Math.min(daysFor("hard"), daysFor("good"));
    const good = Math.max(daysFor("good"), hard + 1);
    const easy = Math.max(daysFor("easy"), good + 1);
    return {
      hard: Math.min(hard, maximumDays),
      good: Math.min(good, maximumDays),
      easy: Math.min(easy, maximumDays),
    };
  };

  if (card.state === "review") {
    if (rating === "again") {
      return scheduleMinutes(study.repeatWrongCards ? 1 : RELEARNING_MINUTES, {
        state: "relearning",
        learningStep: 0,
        intervalDays: Math.max(1, Math.min(Math.round(intervalForStability(memory.stability, retention)), maximumDays)),
        easeFactor: ease(card.easeFactor - 0.2),
        lapses: card.lapses + 1,
      });
    }
    const days = orderedDays();
    if (rating === "hard") return scheduleReview(days.hard, { easeFactor: ease(card.easeFactor - 0.15) });
    if (rating === "easy") return scheduleReview(days.easy, { easeFactor: ease(card.easeFactor + 0.15) });
    return scheduleReview(days.good);
  }

  const isRelearning = card.state === "relearning";
  const steps = isRelearning ? [RELEARNING_MINUTES] : settings.learningStepsMinutes;
  const step = Math.min(card.learningStep, steps.length - 1);
  const learningState = isRelearning ? "relearning" : "learning";

  if (rating === "easy") return scheduleReview(orderedDays().easy);
  if (rating === "again")
    return scheduleMinutes(study.repeatWrongCards ? Math.min(1, steps[0]) : steps[0], {
      state: learningState,
      learningStep: 0,
    });
  if (rating === "hard") {
    // A recalled word can leave single-step learning, even with difficulty.
    if (steps.length === 1 && !isRelearning) return scheduleReview(orderedDays().hard);
    const minutes = step === 0 && steps.length > 1 ? (steps[0] + steps[1]) / 2 : steps[step] * 1.5;
    return scheduleMinutes(minutes, { state: learningState, learningStep: step });
  }
  if (step + 1 < steps.length)
    return scheduleMinutes(steps[step + 1], {
      state: learningState,
      learningStep: step + 1,
    });
  // Graduation: long custom steps never lead to a first interval shorter
  // than Hard on the last step would have waited.
  const minimumGraduationDays = isRelearning
    ? 1
    : Math.floor((steps.at(-1) * (steps.length === 1 ? 3 : 1.5)) / 1440) + 1;
  return scheduleReview(Math.max(orderedDays().good, minimumGraduationDays));
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
