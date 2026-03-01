import { getDatabase } from "../db.js";

const CARD_STATES = {
  new: "new",
  learning: "learning",
  review: "review",
  relearning: "relearning",
};

const CARD_RATINGS = {
  again: "again",
  hard: "hard",
  good: "good",
  easy: "easy",
};

const DEFAULT_SRS_SETTINGS = {
  newCardsPerDay: 20,
  maxReviewsPerDay: 100,
  learningStepsMinutes: [10, 1440, 4320],
  easyBonus: 1.3,
  lapsePenalty: 0.7,
};
const MIN_INTERVAL_DAYS = 1;
const MAX_INTERVAL_DAYS = 36_500;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = MAX_INTERVAL_DAYS * 24 * 60;
const MAX_DATE_TIMESTAMP_MS = 8_640_000_000_000_000;
const DEFAULT_STUDY_SESSION_SETTINGS = {
  shuffleMode: "off",
  shuffleSeed: null,
  dailyGoal: 20,
  repeatWrongCards: true,
};

const SHUFFLE_MODES = {
  off: "off",
  perSession: "per_session",
  always: "always",
};

const SHUFFLE_MODE_OPTIONS = new Set(Object.values(SHUFFLE_MODES));
const SHUFFLE_SEED_MIN = 1;
const SHUFFLE_SEED_MAX = 2_147_483_646;
const LOW_CONFIDENCE_REPS_THRESHOLD = 3;
const SHUFFLE_WINDOW_LIMITS = {
  learning: 10,
  review: 12,
};

const ALLOWED_STATES = new Set(Object.values(CARD_STATES));
const ALLOWED_RATINGS = new Set(Object.values(CARD_RATINGS));

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
};

const toIntegerInRange = (value, min, max, fallback) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  if (numericValue < min) {
    return min;
  }

  if (numericValue > max) {
    return max;
  }

  return Math.round(numericValue);
};

const clampIntegerInRange = (value, min, max, fallback) => {
  return toIntegerInRange(value, min, max, fallback);
};

const parseJsonArray = (value) => {
  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const parseLearningSteps = (value) => {
  if (typeof value !== "string") {
    return DEFAULT_SRS_SETTINGS.learningStepsMinutes;
  }

  const tokens = value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  const parsedSteps = tokens
    .map((token) => {
      const plainNumber = Number(token);

      if (Number.isFinite(plainNumber) && plainNumber > 0) {
        return clampIntegerInRange(
          plainNumber,
          MIN_INTERVAL_MINUTES,
          MAX_INTERVAL_MINUTES,
          MIN_INTERVAL_MINUTES,
        );
      }

      const match = token.match(
        /^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i,
      );

      if (!match) {
        return null;
      }

      const amount = Number(match[1]);
      const unit = match[2].toLowerCase();

      if (!Number.isFinite(amount) || amount <= 0) {
        return null;
      }

      if (unit.startsWith("d")) {
        return clampIntegerInRange(
          amount * 24 * 60,
          MIN_INTERVAL_MINUTES,
          MAX_INTERVAL_MINUTES,
          MIN_INTERVAL_MINUTES,
        );
      }

      if (unit.startsWith("h")) {
        return clampIntegerInRange(
          amount * 60,
          MIN_INTERVAL_MINUTES,
          MAX_INTERVAL_MINUTES,
          MIN_INTERVAL_MINUTES,
        );
      }

      return clampIntegerInRange(
        amount,
        MIN_INTERVAL_MINUTES,
        MAX_INTERVAL_MINUTES,
        MIN_INTERVAL_MINUTES,
      );
    })
    .filter((minutes) => Number.isInteger(minutes) && minutes > 0);

  if (parsedSteps.length === 0) {
    return DEFAULT_SRS_SETTINGS.learningStepsMinutes;
  }

  return parsedSteps;
};

const normalizeSrsSettings = (settings = {}) => {
  const source =
    settings?.spacedRepetition && typeof settings.spacedRepetition === "object"
      ? settings.spacedRepetition
      : settings;

  return {
    newCardsPerDay: toIntegerInRange(
      source?.newCardsPerDay,
      1,
      999,
      DEFAULT_SRS_SETTINGS.newCardsPerDay,
    ),
    maxReviewsPerDay: toIntegerInRange(
      source?.maxReviewsPerDay,
      1,
      5000,
      DEFAULT_SRS_SETTINGS.maxReviewsPerDay,
    ),
    learningStepsMinutes: parseLearningSteps(source?.learningSteps),
    easyBonus:
      toIntegerInRange(source?.easyBonus, 100, 300, DEFAULT_SRS_SETTINGS.easyBonus * 100) /
      100,
    lapsePenalty:
      toIntegerInRange(
        source?.lapsePenalty,
        10,
        100,
        DEFAULT_SRS_SETTINGS.lapsePenalty * 100,
      ) / 100,
  };
};

const normalizeStudySessionSettings = (settings = {}) => {
  const source =
    settings?.studySession && typeof settings.studySession === "object"
      ? settings.studySession
      : settings;
  const rawShuffleMode = toCleanString(source?.shuffleMode).toLowerCase();
  const shuffleMode = SHUFFLE_MODE_OPTIONS.has(rawShuffleMode)
    ? rawShuffleMode
    : DEFAULT_STUDY_SESSION_SETTINGS.shuffleMode;
  const dailyGoal = toIntegerInRange(
    source?.dailyGoal,
    1,
    999,
    DEFAULT_STUDY_SESSION_SETTINGS.dailyGoal,
  );

  return {
    shuffleMode,
    shuffleSeed:
      shuffleMode === SHUFFLE_MODES.perSession
        ? toIntegerInRange(
          source?.shuffleSeed,
          SHUFFLE_SEED_MIN,
          SHUFFLE_SEED_MAX,
          SHUFFLE_SEED_MIN,
        )
        : null,
    dailyGoal,
    repeatWrongCards: toBoolean(
      source?.repeatWrongCards,
      DEFAULT_STUDY_SESSION_SETTINGS.repeatWrongCards,
    ),
  };
};

const normalizeCardState = (value) => {
  const normalizedValue = toCleanString(value).toLowerCase();

  if (ALLOWED_STATES.has(normalizedValue)) {
    return normalizedValue;
  }

  return CARD_STATES.new;
};

const normalizeRatingValue = (value) => {
  const normalizedValue = toCleanString(value).toLowerCase();

  if (!ALLOWED_RATINGS.has(normalizedValue)) {
    throw new Error("Unsupported SRS rating");
  }

  return normalizedValue;
};

const clampEaseFactor = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 2.5;
  }

  if (numericValue < 1.3) {
    return 1.3;
  }

  if (numericValue > 3) {
    return 3;
  }

  return Number(numericValue.toFixed(2));
};

const normalizeCard = (card = {}) => {
  const state = normalizeCardState(card.state);
  const intervalDaysRaw = Number(card.intervalDays);
  const repsRaw = Number(card.reps);
  const lapsesRaw = Number(card.lapses);
  const learningStepRaw = Number(card.learningStep);

  return {
    state,
    learningStep:
      Number.isFinite(learningStepRaw) && learningStepRaw >= 0
        ? Math.floor(learningStepRaw)
        : 0,
    dueAt: toCleanString(card.dueAt) || null,
    intervalDays:
      Number.isFinite(intervalDaysRaw) && intervalDaysRaw >= 0
        ? Math.min(Math.floor(intervalDaysRaw), MAX_INTERVAL_DAYS)
        : state === CARD_STATES.new
          ? 0
          : 1,
    easeFactor: clampEaseFactor(card.easeFactor),
    reps: Number.isFinite(repsRaw) && repsRaw >= 0 ? Math.floor(repsRaw) : 0,
    lapses: Number.isFinite(lapsesRaw) && lapsesRaw >= 0 ? Math.floor(lapsesRaw) : 0,
  };
};

const toDateWithMinutes = (baseDate, minutes) => {
  const safeMinutes = clampIntegerInRange(
    minutes,
    MIN_INTERVAL_MINUTES,
    MAX_INTERVAL_MINUTES,
    MIN_INTERVAL_MINUTES,
  );
  const timestampMs = Math.min(
    baseDate.getTime() + safeMinutes * 60_000,
    MAX_DATE_TIMESTAMP_MS,
  );

  return new Date(timestampMs);
};

const toDateWithDays = (baseDate, days) => {
  const safeDays = clampIntegerInRange(
    days,
    MIN_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    MIN_INTERVAL_DAYS,
  );
  const timestampMs = Math.min(
    baseDate.getTime() + safeDays * 24 * 60 * 60_000,
    MAX_DATE_TIMESTAMP_MS,
  );

  return new Date(timestampMs);
};

const getQueueTypeByState = (state) => {
  if (state === CARD_STATES.review) {
    return "review";
  }

  if (state === CARD_STATES.new) {
    return "new";
  }

  return "learning";
};

const resolveLearningStepMinutes = (learningSteps, stepIndex) => {
  if (!Array.isArray(learningSteps) || learningSteps.length === 0) {
    return DEFAULT_SRS_SETTINGS.learningStepsMinutes[0];
  }

  const safeIndex = Math.max(0, Math.min(Math.floor(stepIndex), learningSteps.length - 1));
  return learningSteps[safeIndex];
};

const graduateCard = ({
  card,
  now,
  srsSettings,
  easy = false,
  fromRelearning = false,
}) => {
  const baseInterval = fromRelearning
    ? Math.max(1, Math.round(Math.max(1, card.intervalDays) * srsSettings.lapsePenalty))
    : Math.max(1, card.intervalDays || 1);
  const goodInterval = clampIntegerInRange(
    Math.max(1, baseInterval),
    MIN_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    MIN_INTERVAL_DAYS,
  );
  const easyInterval = clampIntegerInRange(
    Math.max(goodInterval + 1, Math.round(goodInterval * srsSettings.easyBonus)),
    MIN_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    goodInterval,
  );
  const intervalDays = easy ? easyInterval : goodInterval;
  const easeFactor = easy
    ? clampEaseFactor(card.easeFactor + 0.05)
    : clampEaseFactor(card.easeFactor);

  return {
    state: CARD_STATES.review,
    learningStep: 0,
    dueAt: toDateWithDays(now, intervalDays).toISOString(),
    intervalDays,
    easeFactor,
    reps: Math.max(1, card.reps + 1),
    lapses: card.lapses,
  };
};

const resolveAgainDueAt = (now, firstLearningStep, studySessionSettings) => {
  if (studySessionSettings?.repeatWrongCards) {
    return now.toISOString();
  }

  return toDateWithMinutes(now, firstLearningStep).toISOString();
};

const resolveScheduleOutcome = ({
  card: rawCard,
  rating,
  srsSettings,
  studySessionSettings,
  now,
}) => {
  const card = normalizeCard(rawCard);
  const learningSteps = srsSettings.learningStepsMinutes;
  const firstLearningStep = resolveLearningStepMinutes(learningSteps, 0);
  const currentLearningStep = resolveLearningStepMinutes(
    learningSteps,
    card.learningStep,
  );

  if (card.state === CARD_STATES.new) {
    if (rating === CARD_RATINGS.again) {
      return {
        state: CARD_STATES.learning,
        learningStep: 0,
        dueAt: resolveAgainDueAt(now, firstLearningStep, studySessionSettings),
        intervalDays: 0,
        easeFactor: clampEaseFactor(card.easeFactor - 0.2),
        reps: 0,
        lapses: card.lapses,
      };
    }

    if (rating === CARD_RATINGS.hard) {
      const hardMinutes = Math.max(
        firstLearningStep + 1,
        Math.round(firstLearningStep * 1.5),
      );

      return {
        state: CARD_STATES.learning,
        learningStep: 0,
        dueAt: toDateWithMinutes(now, hardMinutes).toISOString(),
        intervalDays: 0,
        easeFactor: clampEaseFactor(card.easeFactor - 0.15),
        reps: 0,
        lapses: card.lapses,
      };
    }

    if (rating === CARD_RATINGS.easy) {
      return graduateCard({
        card: {
          ...card,
          intervalDays: clampIntegerInRange(
            Math.max(2, Math.round(resolveLearningStepMinutes(learningSteps, learningSteps.length - 1) / 1440)),
            MIN_INTERVAL_DAYS,
            MAX_INTERVAL_DAYS,
            2,
          ),
        },
        now,
        srsSettings,
        easy: true,
        fromRelearning: false,
      });
    }

    if (learningSteps.length > 1) {
      return {
        state: CARD_STATES.learning,
        learningStep: 1,
        dueAt: toDateWithMinutes(now, resolveLearningStepMinutes(learningSteps, 1)).toISOString(),
        intervalDays: 0,
        easeFactor: clampEaseFactor(card.easeFactor),
        reps: 0,
        lapses: card.lapses,
      };
    }

    return graduateCard({
      card: { ...card, intervalDays: 1 },
      now,
      srsSettings,
      easy: false,
      fromRelearning: false,
    });
  }

  if (card.state === CARD_STATES.learning || card.state === CARD_STATES.relearning) {
    if (rating === CARD_RATINGS.again) {
      return {
        state: card.state,
        learningStep: 0,
        dueAt: resolveAgainDueAt(now, firstLearningStep, studySessionSettings),
        intervalDays: card.intervalDays,
        easeFactor: clampEaseFactor(card.easeFactor - 0.2),
        reps: card.reps,
        lapses: card.lapses,
      };
    }

    if (rating === CARD_RATINGS.hard) {
      const hardMinutes = Math.max(
        firstLearningStep + 1,
        Math.round(currentLearningStep * 1.2),
      );

      return {
        state: card.state,
        learningStep: card.learningStep,
        dueAt: toDateWithMinutes(now, hardMinutes).toISOString(),
        intervalDays: card.intervalDays,
        easeFactor: clampEaseFactor(card.easeFactor - 0.1),
        reps: card.reps,
        lapses: card.lapses,
      };
    }

    const isRelearning = card.state === CARD_STATES.relearning;

    if (rating === CARD_RATINGS.easy) {
      return graduateCard({
        card,
        now,
        srsSettings,
        easy: true,
        fromRelearning: isRelearning,
      });
    }

    const nextStep = card.learningStep + 1;

    if (nextStep < learningSteps.length) {
      return {
        state: card.state,
        learningStep: nextStep,
        dueAt: toDateWithMinutes(now, resolveLearningStepMinutes(learningSteps, nextStep)).toISOString(),
        intervalDays: card.intervalDays,
        easeFactor: clampEaseFactor(card.easeFactor),
        reps: card.reps,
        lapses: card.lapses,
      };
    }

    return graduateCard({
      card,
      now,
      srsSettings,
      easy: false,
      fromRelearning: isRelearning,
    });
  }

  const baseInterval = Math.max(1, card.intervalDays || 1);
  const hardInterval = clampIntegerInRange(
    Math.max(1, Math.round(baseInterval * 1.2)),
    MIN_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    MIN_INTERVAL_DAYS,
  );
  const goodInterval = clampIntegerInRange(
    Math.max(hardInterval, Math.round(baseInterval * Math.max(1.4, card.easeFactor))),
    MIN_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    hardInterval,
  );
  const easyInterval = clampIntegerInRange(
    Math.max(goodInterval + 1, Math.round(baseInterval * card.easeFactor * srsSettings.easyBonus)),
    MIN_INTERVAL_DAYS,
    MAX_INTERVAL_DAYS,
    goodInterval,
  );

  if (rating === CARD_RATINGS.again) {
    return {
      state: CARD_STATES.relearning,
      learningStep: 0,
      dueAt: resolveAgainDueAt(now, firstLearningStep, studySessionSettings),
      intervalDays: clampIntegerInRange(
        Math.max(1, Math.round(baseInterval * srsSettings.lapsePenalty)),
        MIN_INTERVAL_DAYS,
        MAX_INTERVAL_DAYS,
        MIN_INTERVAL_DAYS,
      ),
      easeFactor: clampEaseFactor(card.easeFactor - 0.2),
      reps: Math.max(0, card.reps - 1),
      lapses: card.lapses + 1,
    };
  }

  if (rating === CARD_RATINGS.hard) {
    return {
      state: CARD_STATES.review,
      learningStep: 0,
      dueAt: toDateWithDays(now, hardInterval).toISOString(),
      intervalDays: hardInterval,
      easeFactor: clampEaseFactor(card.easeFactor - 0.15),
      reps: card.reps + 1,
      lapses: card.lapses,
    };
  }

  if (rating === CARD_RATINGS.easy) {
    return {
      state: CARD_STATES.review,
      learningStep: 0,
      dueAt: toDateWithDays(now, easyInterval).toISOString(),
      intervalDays: easyInterval,
      easeFactor: clampEaseFactor(card.easeFactor + 0.15),
      reps: card.reps + 1,
      lapses: card.lapses,
    };
  }

  return {
    state: CARD_STATES.review,
    learningStep: 0,
    dueAt: toDateWithDays(now, goodInterval).toISOString(),
    intervalDays: goodInterval,
    easeFactor: clampEaseFactor(card.easeFactor),
    reps: card.reps + 1,
    lapses: card.lapses,
  };
};

const formatRelativeInterval = (dueAt, now) => {
  if (!dueAt) {
    return "Now";
  }

  const dueDate = new Date(dueAt);

  if (Number.isNaN(dueDate.getTime())) {
    return "Now";
  }

  const diffMs = dueDate.getTime() - now.getTime();

  if (diffMs <= 30_000) {
    return "Now";
  }

  const diffMinutes = Math.round(diffMs / 60_000);

  if (diffMinutes < 60) {
    return `${diffMinutes}m`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 48) {
    return `${diffHours}h`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d`;
};

const buildRatingPreview = (card, srsSettings, studySessionSettings, now) => {
  return Object.values(CARD_RATINGS).reduce((acc, rating) => {
    const outcome = resolveScheduleOutcome({
      card,
      rating,
      srsSettings,
      studySessionSettings,
      now,
    });

    acc[rating] = formatRelativeInterval(outcome.dueAt, now);
    return acc;
  }, {});
};

const mapCardRow = (row, srsSettings, studySessionSettings, now) => {
  if (!row) {
    return null;
  }

  const normalizedCard = normalizeCard({
    state: row.state,
    learningStep: row.learningStep,
    dueAt: row.dueAt,
    intervalDays: row.intervalDays,
    easeFactor: row.easeFactor,
    reps: row.reps,
    lapses: row.lapses,
  });

  return {
    wordId: Number(row.wordId),
    source: toCleanString(row.source),
    target: toCleanString(row.target),
    tertiary: toCleanString(row.tertiary),
    level: toCleanString(row.level),
    part_of_speech: toCleanString(row.partOfSpeech),
    tags: parseJsonArray(row.tagsJson),
    examples: parseJsonArray(row.examplesJson),
    state: normalizedCard.state,
    queueType: getQueueTypeByState(normalizedCard.state),
    dueAt: normalizedCard.dueAt,
    intervalDays: normalizedCard.intervalDays,
    easeFactor: normalizedCard.easeFactor,
    reps: normalizedCard.reps,
    lapses: normalizedCard.lapses,
    ratingPreview: buildRatingPreview(
      normalizedCard,
      srsSettings,
      studySessionSettings,
      now,
    ),
  };
};

const CARD_FIELDS_SELECT = `
  words.id AS wordId,
  words.source_text AS source,
  words.target_text AS target,
  words.tertiary_text AS tertiary,
  words.level AS level,
  words.part_of_speech AS partOfSpeech,
  words.tags_json AS tagsJson,
  words.examples_json AS examplesJson,
  review_cards.state AS state,
  review_cards.learning_step AS learningStep,
  review_cards.due_at AS dueAt,
  review_cards.interval_days AS intervalDays,
  review_cards.ease_factor AS easeFactor,
  review_cards.reps AS reps,
  review_cards.lapses AS lapses
`;

const getTodayCounters = (db, deckId) => {
  const baseWhere = "deck_id = ? AND DATE(reviewed_at, 'localtime') = DATE('now', 'localtime')";
  const totalStudiedToday =
    db
      .prepare(`SELECT COUNT(*) AS total FROM review_logs WHERE ${baseWhere}`)
      .get(deckId)?.total || 0;
  const reviewedToday =
    db
      .prepare(
        `SELECT COUNT(*) AS total FROM review_logs WHERE ${baseWhere} AND queue_type = 'review'`,
      )
      .get(deckId)?.total || 0;
  const newStudiedToday =
    db
      .prepare(
        `SELECT COUNT(DISTINCT word_id) AS total FROM review_logs WHERE ${baseWhere} AND queue_type = 'new'`,
      )
      .get(deckId)?.total || 0;

  return {
    totalStudiedToday: Number(totalStudiedToday) || 0,
    reviewedToday: Number(reviewedToday) || 0,
    newStudiedToday: Number(newStudiedToday) || 0,
  };
};

const getQueueCounters = (db, deckId, nowIso) => {
  const totalCards =
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM words
          WHERE deck_id = ?
        `,
      )
      .get(deckId)?.total || 0;

  const learningDueCount =
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM words
          INNER JOIN review_cards ON review_cards.word_id = words.id
          WHERE words.deck_id = ?
            AND review_cards.state IN ('learning', 'relearning')
            AND (review_cards.due_at IS NULL OR review_cards.due_at <= ?)
        `,
      )
      .get(deckId, nowIso)?.total || 0;

  const reviewDueCount =
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM words
          INNER JOIN review_cards ON review_cards.word_id = words.id
          WHERE words.deck_id = ?
            AND review_cards.state = 'review'
            AND (review_cards.due_at IS NULL OR review_cards.due_at <= ?)
        `,
      )
      .get(deckId, nowIso)?.total || 0;

  const newDueCount =
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM words
          LEFT JOIN review_cards ON review_cards.word_id = words.id
          WHERE words.deck_id = ?
            AND (
              review_cards.word_id IS NULL
              OR review_cards.state IS NULL
              OR review_cards.state = 'new'
            )
        `,
      )
      .get(deckId)?.total || 0;

  return {
    totalCards: Number(totalCards) || 0,
    learningDueCount: Number(learningDueCount) || 0,
    reviewDueCount: Number(reviewDueCount) || 0,
    newDueCount: Number(newDueCount) || 0,
  };
};

const pickLearningCardRow = (db, deckId, nowIso, shuffleSettings) => {
  const { shuffleMode, shuffleSeed } = shuffleSettings;

  if (shuffleMode === SHUFFLE_MODES.off) {
    return db
      .prepare(
        `
          SELECT ${CARD_FIELDS_SELECT}
          FROM words
          INNER JOIN review_cards ON review_cards.word_id = words.id
          WHERE words.deck_id = ?
            AND review_cards.state IN ('learning', 'relearning')
            AND (review_cards.due_at IS NULL OR review_cards.due_at <= ?)
          ORDER BY COALESCE(review_cards.due_at, '1970-01-01T00:00:00.000Z') ASC, words.id ASC
          LIMIT 1
        `,
      )
      .get(deckId, nowIso);
  }

  if (shuffleMode === SHUFFLE_MODES.perSession) {
    return db
      .prepare(
        `
          WITH candidates AS (
            SELECT ${CARD_FIELDS_SELECT}
            FROM words
            INNER JOIN review_cards ON review_cards.word_id = words.id
            WHERE words.deck_id = ?
              AND review_cards.state IN ('learning', 'relearning')
              AND (review_cards.due_at IS NULL OR review_cards.due_at <= ?)
            ORDER BY COALESCE(review_cards.due_at, '1970-01-01T00:00:00.000Z') ASC, words.id ASC
            LIMIT ?
          )
          SELECT *
          FROM candidates
          ORDER BY ABS(((wordId * 1103515245) + ?) % 2147483647) ASC, wordId ASC
          LIMIT 1
        `,
      )
      .get(deckId, nowIso, SHUFFLE_WINDOW_LIMITS.learning, shuffleSeed);
  }

  return db
    .prepare(
      `
        WITH candidates AS (
          SELECT ${CARD_FIELDS_SELECT}
          FROM words
          INNER JOIN review_cards ON review_cards.word_id = words.id
          WHERE words.deck_id = ?
            AND review_cards.state IN ('learning', 'relearning')
            AND (review_cards.due_at IS NULL OR review_cards.due_at <= ?)
          ORDER BY COALESCE(review_cards.due_at, '1970-01-01T00:00:00.000Z') ASC, words.id ASC
          LIMIT ?
        )
        SELECT *
        FROM candidates
        ORDER BY RANDOM()
        LIMIT 1
      `,
    )
    .get(deckId, nowIso, SHUFFLE_WINDOW_LIMITS.learning);
};

const pickLowConfidenceReviewCardRow = (db, deckId, nowIso, shuffleSettings) => {
  const { shuffleMode, shuffleSeed } = shuffleSettings;

  if (shuffleMode === SHUFFLE_MODES.off) {
    return null;
  }

  if (shuffleMode === SHUFFLE_MODES.perSession) {
    return db
      .prepare(
        `
          WITH candidates AS (
            SELECT ${CARD_FIELDS_SELECT}
            FROM words
            INNER JOIN review_cards ON review_cards.word_id = words.id
            WHERE words.deck_id = ?
              AND review_cards.state = 'review'
              AND COALESCE(review_cards.reps, 0) < ?
              AND (review_cards.due_at IS NULL OR review_cards.due_at <= ?)
            ORDER BY COALESCE(review_cards.due_at, '1970-01-01T00:00:00.000Z') ASC, words.id ASC
            LIMIT ?
          )
          SELECT *
          FROM candidates
          ORDER BY ABS(((wordId * 1103515245) + ?) % 2147483647) ASC, wordId ASC
          LIMIT 1
        `,
      )
      .get(
        deckId,
        LOW_CONFIDENCE_REPS_THRESHOLD,
        nowIso,
        SHUFFLE_WINDOW_LIMITS.review,
        shuffleSeed,
      );
  }

  return db
    .prepare(
      `
        WITH candidates AS (
          SELECT ${CARD_FIELDS_SELECT}
          FROM words
          INNER JOIN review_cards ON review_cards.word_id = words.id
          WHERE words.deck_id = ?
            AND review_cards.state = 'review'
            AND COALESCE(review_cards.reps, 0) < ?
            AND (review_cards.due_at IS NULL OR review_cards.due_at <= ?)
          ORDER BY COALESCE(review_cards.due_at, '1970-01-01T00:00:00.000Z') ASC, words.id ASC
          LIMIT ?
        )
        SELECT *
        FROM candidates
        ORDER BY RANDOM()
        LIMIT 1
      `,
    )
    .get(
      deckId,
      LOW_CONFIDENCE_REPS_THRESHOLD,
      nowIso,
      SHUFFLE_WINDOW_LIMITS.review,
    );
};

const pickReviewCardRow = (db, deckId, nowIso) => {
  return db
    .prepare(
      `
        SELECT ${CARD_FIELDS_SELECT}
        FROM words
        INNER JOIN review_cards ON review_cards.word_id = words.id
        WHERE words.deck_id = ?
          AND review_cards.state = 'review'
          AND (review_cards.due_at IS NULL OR review_cards.due_at <= ?)
        ORDER BY COALESCE(review_cards.due_at, '1970-01-01T00:00:00.000Z') ASC, words.id ASC
        LIMIT 1
      `,
    )
    .get(deckId, nowIso);
};

const pickNewCardRow = (db, deckId, shuffleSettings) => {
  const { shuffleMode, shuffleSeed } = shuffleSettings;

  if (shuffleMode === SHUFFLE_MODES.perSession) {
    return db
      .prepare(
        `
          SELECT ${CARD_FIELDS_SELECT}
          FROM words
          LEFT JOIN review_cards ON review_cards.word_id = words.id
          WHERE words.deck_id = ?
            AND (
              review_cards.word_id IS NULL
              OR review_cards.state IS NULL
              OR review_cards.state = 'new'
            )
          ORDER BY ABS(((words.id * 1103515245) + ?) % 2147483647) ASC, words.id ASC
          LIMIT 1
        `,
      )
      .get(deckId, shuffleSeed);
  }

  if (shuffleMode === SHUFFLE_MODES.always) {
    return db
      .prepare(
        `
          SELECT ${CARD_FIELDS_SELECT}
          FROM words
          LEFT JOIN review_cards ON review_cards.word_id = words.id
          WHERE words.deck_id = ?
            AND (
              review_cards.word_id IS NULL
              OR review_cards.state IS NULL
              OR review_cards.state = 'new'
            )
          ORDER BY RANDOM()
          LIMIT 1
        `,
      )
      .get(deckId);
  }

  return db
    .prepare(
      `
        SELECT ${CARD_FIELDS_SELECT}
        FROM words
        LEFT JOIN review_cards ON review_cards.word_id = words.id
        WHERE words.deck_id = ?
          AND (
            review_cards.word_id IS NULL
            OR review_cards.state IS NULL
            OR review_cards.state = 'new'
          )
        ORDER BY words.created_at ASC, words.id ASC
        LIMIT 1
      `,
    )
    .get(deckId);
};

const pickNextCardRow = (db, deckId, nowIso, limits, options = {}) => {
  const forceAllCards = Boolean(options?.forceAllCards);
  const shuffleSettings = normalizeStudySessionSettings(options?.settings || {});

  if (!forceAllCards && limits.dailyLimitReached) {
    return null;
  }

  const learningRow = pickLearningCardRow(db, deckId, nowIso, shuffleSettings);

  if (learningRow) {
    return learningRow;
  }

  if (forceAllCards || limits.reviewLeft > 0) {
    const lowConfidenceReviewRow = pickLowConfidenceReviewCardRow(
      db,
      deckId,
      nowIso,
      shuffleSettings,
    );

    if (lowConfidenceReviewRow) {
      return lowConfidenceReviewRow;
    }

    const reviewRow = pickReviewCardRow(db, deckId, nowIso);

    if (reviewRow) {
      return reviewRow;
    }
  }

  if (forceAllCards || limits.newLeft > 0) {
    return pickNewCardRow(db, deckId, shuffleSettings);
  }

  return null;
};

const buildSession = ({
  deck,
  card,
  queueCounters,
  todayCounters,
  limits,
  forceAllCards,
}) => {
  const totalDueWithoutLimits =
    queueCounters.learningDueCount +
    queueCounters.reviewDueCount +
    queueCounters.newDueCount;
  const hasDueWithoutLimits = totalDueWithoutLimits > 0;
  const reviewAvailable = forceAllCards
    ? Math.max(0, queueCounters.reviewDueCount)
    : Math.max(0, Math.min(queueCounters.reviewDueCount, limits.reviewLeft));
  const newAvailable = forceAllCards
    ? Math.max(0, queueCounters.newDueCount)
    : Math.max(0, Math.min(queueCounters.newDueCount, limits.newLeft));
  const totalDue = queueCounters.learningDueCount + reviewAvailable + newAvailable;
  const blockedByLimits =
    !forceAllCards &&
    !card &&
    hasDueWithoutLimits &&
    (
      limits.dailyLimitReached ||
      (
        queueCounters.learningDueCount === 0 &&
        (
          (queueCounters.reviewDueCount > 0 && limits.reviewLeft === 0) ||
          (queueCounters.newDueCount > 0 && limits.newLeft === 0)
        )
      )
    );
  const completionReason = blockedByLimits
    ? "daily-limit"
    : queueCounters.totalCards === 0
      ? "empty-deck"
      : "empty-queue";

  return {
    deck: {
      id: deck.id,
      name: deck.name,
    },
    sessionMode: forceAllCards ? "extended" : "default",
    card,
    stats: {
      totalCards: queueCounters.totalCards,
      dueLearning: queueCounters.learningDueCount,
      dueReview: reviewAvailable,
      dueNew: newAvailable,
      dueTotal: totalDue,
      reviewedToday: todayCounters.reviewedToday,
      newStudiedToday: todayCounters.newStudiedToday,
      totalStudiedToday: todayCounters.totalStudiedToday,
    },
    limits: {
      newCardsPerDay: limits.newCardsPerDay,
      maxReviewsPerDay: limits.maxReviewsPerDay,
      dailyGoal: limits.dailyGoal,
      dailyLeft: limits.dailyLeft,
      newLeft: limits.newLeft,
      reviewLeft: limits.reviewLeft,
      isBypassed: forceAllCards,
    },
    completionState: {
      done: !card,
      reason: !card ? completionReason : "",
      canStartNewSession:
        !forceAllCards &&
        !card &&
        completionReason === "daily-limit" &&
        hasDueWithoutLimits,
    },
  };
};

const getDeckOrThrow = (db, deckId) => {
  const deck = db
    .prepare(
      `
        SELECT id, name
        FROM decks
        WHERE id = ?
      `,
    )
    .get(deckId);

  if (!deck) {
    throw new Error("Deck not found");
  }

  return deck;
};

const resolveSessionLimits = (
  srsSettings,
  studySessionSettings,
  todayCounters,
  queueCounters = null,
) => {
  const dailyGoal = studySessionSettings.dailyGoal;
  const dueReviewCount = Math.max(0, Number(queueCounters?.reviewDueCount) || 0);
  const reviewLeftRaw = Math.max(
    0,
    srsSettings.maxReviewsPerDay - todayCounters.reviewedToday,
  );
  const newLeftRaw = Math.max(
    0,
    srsSettings.newCardsPerDay - todayCounters.newStudiedToday,
  );
  const dailyLeft = Math.max(0, dailyGoal - todayCounters.totalStudiedToday);
  const reviewBudget = Math.min(reviewLeftRaw, Math.min(dailyLeft, dueReviewCount));
  const dailyLeftAfterReviews = Math.max(0, dailyLeft - reviewBudget);
  const reviewLeft = Math.min(reviewLeftRaw, dailyLeft);
  const newLeft = Math.min(newLeftRaw, dailyLeftAfterReviews);

  return {
    newCardsPerDay: srsSettings.newCardsPerDay,
    maxReviewsPerDay: srsSettings.maxReviewsPerDay,
    dailyGoal,
    dailyLeft,
    newLeft,
    reviewLeft,
    dailyLimitReached: dailyLeft <= 0,
  };
};

export const getSrsSessionSnapshot = ({
  deckId,
  settings = {},
  forceAllCards = false,
}) => {
  const numericDeckId = Number(deckId);

  if (!Number.isInteger(numericDeckId) || numericDeckId <= 0) {
    throw new Error("Invalid deck id");
  }

  const db = getDatabase();
  const deck = getDeckOrThrow(db, numericDeckId);
  const srsSettings = normalizeSrsSettings(settings);
  const studySessionSettings = normalizeStudySessionSettings(settings);
  const now = new Date();
  const nowIso = now.toISOString();
  const todayCounters = getTodayCounters(db, numericDeckId);
  const queueCounters = getQueueCounters(db, numericDeckId, nowIso);
  const limits = resolveSessionLimits(
    srsSettings,
    studySessionSettings,
    todayCounters,
    queueCounters,
  );
  const nextCardRow = pickNextCardRow(db, numericDeckId, nowIso, limits, {
    forceAllCards: Boolean(forceAllCards),
    settings,
  });
  const nextCard = mapCardRow(
    nextCardRow,
    srsSettings,
    studySessionSettings,
    now,
  );

  return buildSession({
    deck,
    card: nextCard,
    queueCounters,
    todayCounters,
    limits,
    forceAllCards: Boolean(forceAllCards),
  });
};

export const gradeSrsCard = ({
  deckId,
  wordId,
  rating,
  settings = {},
  forceAllCards = false,
}) => {
  const numericDeckId = Number(deckId);
  const numericWordId = Number(wordId);

  if (!Number.isInteger(numericDeckId) || numericDeckId <= 0) {
    throw new Error("Invalid deck id");
  }

  if (!Number.isInteger(numericWordId) || numericWordId <= 0) {
    throw new Error("Invalid word id");
  }

  const normalizedRating = normalizeRatingValue(rating);
  const db = getDatabase();
  const srsSettings = normalizeSrsSettings(settings);
  const studySessionSettings = normalizeStudySessionSettings(settings);
  const now = new Date();
  const nowIso = now.toISOString();

  const mutateTransaction = db.transaction(() => {
    const wordRow = db
      .prepare(
        `
          SELECT words.id AS wordId, words.deck_id AS deckId
          FROM words
          WHERE words.id = ? AND words.deck_id = ?
        `,
      )
      .get(numericWordId, numericDeckId);

    if (!wordRow) {
      throw new Error("Card not found in selected deck");
    }

    const currentReviewRow = db
      .prepare(
        `
          SELECT
            state,
            learning_step AS learningStep,
            due_at AS dueAt,
            interval_days AS intervalDays,
            ease_factor AS easeFactor,
            reps,
            lapses
          FROM review_cards
          WHERE word_id = ?
        `,
      )
      .get(numericWordId);

    const currentCard = normalizeCard(currentReviewRow || {});
    const outcome = resolveScheduleOutcome({
      card: currentCard,
      rating: normalizedRating,
      srsSettings,
      studySessionSettings,
      now,
    });

    db.prepare(
      `
        INSERT INTO review_cards (
          word_id,
          state,
          learning_step,
          due_at,
          interval_days,
          ease_factor,
          reps,
          lapses,
          last_reviewed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(word_id) DO UPDATE SET
          state = excluded.state,
          learning_step = excluded.learning_step,
          due_at = excluded.due_at,
          interval_days = excluded.interval_days,
          ease_factor = excluded.ease_factor,
          reps = excluded.reps,
          lapses = excluded.lapses,
          last_reviewed_at = excluded.last_reviewed_at
      `,
    ).run(
      numericWordId,
      outcome.state,
      outcome.learningStep,
      outcome.dueAt,
      outcome.intervalDays,
      outcome.easeFactor,
      outcome.reps,
      outcome.lapses,
      nowIso,
    );

    db.prepare(
      `
        INSERT INTO review_logs (
          word_id,
          deck_id,
          reviewed_at,
          rating,
          queue_type,
          prev_state,
          next_state,
          prev_interval_days,
          next_interval_days,
          prev_ease_factor,
          next_ease_factor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(
      numericWordId,
      numericDeckId,
      nowIso,
      normalizedRating,
      getQueueTypeByState(currentCard.state),
      currentCard.state,
      outcome.state,
      currentCard.intervalDays,
      outcome.intervalDays,
      currentCard.easeFactor,
      outcome.easeFactor,
    );
  });

  mutateTransaction();

  return getSrsSessionSnapshot({
    deckId: numericDeckId,
    settings,
    forceAllCards: Boolean(forceAllCards),
  });
};
