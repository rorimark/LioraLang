import { DEFAULT_APP_PREFERENCES } from "@shared/config/appPreferencesDefaults";

const SRS_CARD_STATES = Object.freeze({
  new: "new",
  learning: "learning",
  review: "review",
  relearning: "relearning",
});

const SRS_CARD_RATINGS = Object.freeze({
  again: "again",
  hard: "hard",
  good: "good",
  easy: "easy",
});

const CARD_STATE_SET = new Set(Object.values(SRS_CARD_STATES));
const CARD_RATING_SET = new Set(Object.values(SRS_CARD_RATINGS));
const CARD_RATING_ORDER = [
  SRS_CARD_RATINGS.again,
  SRS_CARD_RATINGS.hard,
  SRS_CARD_RATINGS.good,
  SRS_CARD_RATINGS.easy,
];

const DEFAULT_SRS_SETTINGS = Object.freeze({
  newCardsPerDay: 20,
  maxReviewsPerDay: 100,
  learningStepsMinutes: [10, 1440, 4320],
  easyBonus: 1.3,
  lapsePenalty: 0.7,
});

const DEFAULT_STUDY_SETTINGS = Object.freeze({
  shuffleMode: "off",
  shuffleSeed: null,
  dailyGoal: DEFAULT_APP_PREFERENCES.studySession.dailyGoal,
  repeatWrongCards: DEFAULT_APP_PREFERENCES.studySession.repeatWrongCards,
});

const MAX_INTERVAL_DAYS = 36500;
const MAX_INTERVAL_MINUTES = MAX_INTERVAL_DAYS * 24 * 60;
const MAX_WORD_TAGS = 10;
const MAX_WORD_EXAMPLES = 10;

const EMPTY_SRS_SESSION = Object.freeze({
  deck: null,
  sessionMode: "default",
  card: null,
  stats: {
    totalCards: 0,
    dueLearning: 0,
    dueReview: 0,
    dueNew: 0,
    dueTotal: 0,
    reviewedToday: 0,
    newStudiedToday: 0,
    totalStudiedToday: 0,
  },
  limits: {
    newCardsPerDay: DEFAULT_SRS_SETTINGS.newCardsPerDay,
    maxReviewsPerDay: DEFAULT_SRS_SETTINGS.maxReviewsPerDay,
    dailyGoal: DEFAULT_STUDY_SETTINGS.dailyGoal,
    dailyLeft: DEFAULT_STUDY_SETTINGS.dailyGoal,
    newLeft: DEFAULT_SRS_SETTINGS.newCardsPerDay,
    reviewLeft: DEFAULT_SRS_SETTINGS.maxReviewsPerDay,
    isBypassed: false,
  },
  completionState: {
    done: false,
    reason: "",
    canStartNewSession: false,
  },
});

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const toCleanStringArray = (value, limit = 10) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
};

const clampInteger = (value, min, max, fallback) => {
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

const parseLearningSteps = (value) => {
  if (typeof value !== "string") {
    return DEFAULT_SRS_SETTINGS.learningStepsMinutes;
  }

  const parsed = value
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => {
      const plainNumber = Number(token);

      if (Number.isFinite(plainNumber) && plainNumber > 0) {
        return clampInteger(plainNumber, 1, MAX_INTERVAL_MINUTES, 10);
      }

      const unitMatch = token.match(
        /^(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i,
      );

      if (!unitMatch) {
        return null;
      }

      const amount = Number(unitMatch[1]);
      const unit = String(unitMatch[2] || "").toLowerCase();

      if (!Number.isFinite(amount) || amount <= 0) {
        return null;
      }

      if (unit.startsWith("d")) {
        return clampInteger(amount * 24 * 60, 1, MAX_INTERVAL_MINUTES, 10);
      }

      if (unit.startsWith("h")) {
        return clampInteger(amount * 60, 1, MAX_INTERVAL_MINUTES, 10);
      }

      return clampInteger(amount, 1, MAX_INTERVAL_MINUTES, 10);
    })
    .filter((step) => Number.isInteger(step) && step > 0);

  if (parsed.length === 0) {
    return DEFAULT_SRS_SETTINGS.learningStepsMinutes;
  }

  return parsed;
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

const toIsoTimestamp = (timestampMs) => {
  const date = new Date(timestampMs);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const toDueDateFromMinutes = (nowMs, minutes) => {
  const safeMinutes = clampInteger(minutes, 1, MAX_INTERVAL_MINUTES, 1);
  const dueAtMs = nowMs + safeMinutes * 60_000;

  return {
    dueAtMs,
    dueAt: toIsoTimestamp(dueAtMs),
  };
};

const toDueDateFromDays = (nowMs, days) => {
  const safeDays = clampInteger(days, 1, MAX_INTERVAL_DAYS, 1);
  const dueAtMs = nowMs + safeDays * 24 * 60 * 60_000;

  return {
    dueAtMs,
    dueAt: toIsoTimestamp(dueAtMs),
  };
};

const readDueAtMs = (card) => {
  if (Number.isFinite(Number(card?.dueAtMs))) {
    return Number(card.dueAtMs);
  }

  if (typeof card?.dueAt === "string" && card.dueAt.trim()) {
    const parsed = Date.parse(card.dueAt);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const resolveLearningStepMinutes = (steps, index) => {
  if (!Array.isArray(steps) || steps.length === 0) {
    return DEFAULT_SRS_SETTINGS.learningStepsMinutes[0];
  }

  const safeIndex = Math.max(0, Math.min(index, steps.length - 1));
  return steps[safeIndex];
};

const resolveAgainDue = (nowMs, firstStepMinutes, studySettings) => {
  if (studySettings.repeatWrongCards) {
    return {
      dueAtMs: nowMs,
      dueAt: toIsoTimestamp(nowMs),
    };
  }

  return toDueDateFromMinutes(nowMs, firstStepMinutes);
};

const formatRelativeInterval = (dueAtMs, nowMs) => {
  if (!Number.isFinite(dueAtMs)) {
    return "Now";
  }

  const diffMs = dueAtMs - nowMs;

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

const hashWithSeed = (value, seed) => {
  const safeValue = Number(value) || 0;
  const safeSeed = Number(seed) || 1;

  return Math.abs(((safeValue * 1103515245) + safeSeed) % 2147483647);
};

const shuffleArrayInPlace = (list) => {
  for (let index = list.length - 1; index > 0; index -= 1) {
    const nextIndex = Math.floor(Math.random() * (index + 1));

    if (nextIndex === index) {
      continue;
    }

    const value = list[index];
    list[index] = list[nextIndex];
    list[nextIndex] = value;
  }

  return list;
};

const shuffleCandidates = (candidates, mode, seed, sortByDue = false) => {
  const nextCandidates = candidates.slice();

  if (mode === "off") {
    nextCandidates.sort((first, second) => {
      if (sortByDue) {
        const firstDue = Number(first.card?.dueAtMs) || 0;
        const secondDue = Number(second.card?.dueAtMs) || 0;

        if (firstDue !== secondDue) {
          return firstDue - secondDue;
        }
      }

      const firstCreated = Number(first.word?.createdAtMs) || 0;
      const secondCreated = Number(second.word?.createdAtMs) || 0;

      if (firstCreated !== secondCreated) {
        return firstCreated - secondCreated;
      }

      return Number(first.word?.id || 0) - Number(second.word?.id || 0);
    });

    return nextCandidates;
  }

  if (mode === "per_session") {
    nextCandidates.sort((first, second) => {
      const firstHash = hashWithSeed(first.word?.id, seed);
      const secondHash = hashWithSeed(second.word?.id, seed);

      if (firstHash !== secondHash) {
        return firstHash - secondHash;
      }

      return Number(first.word?.id || 0) - Number(second.word?.id || 0);
    });

    return nextCandidates;
  }

  return shuffleArrayInPlace(nextCandidates);
};

const buildSessionCounters = ({ words, cardsByWordId, nowMs }) => {
  const dueLearning = [];
  const dueReview = [];
  const dueNew = [];
  const futureScheduled = [];

  words.forEach((word) => {
    const rawCard = cardsByWordId.get(Number(word.id));
    const card = normalizeReviewCard(rawCard || { state: SRS_CARD_STATES.new });
    const cardState = card.state;

    const isDue = (() => {
      if (cardState === SRS_CARD_STATES.new) {
        return true;
      }

      if (!Number.isFinite(card.dueAtMs)) {
        return true;
      }

      return card.dueAtMs <= nowMs;
    })();

    const candidate = { word, card };

    if (!isDue) {
      if (cardState !== SRS_CARD_STATES.new && Number.isFinite(card.dueAtMs)) {
        futureScheduled.push(candidate);
      }

      return;
    }

    if (cardState === SRS_CARD_STATES.review) {
      dueReview.push(candidate);
      return;
    }

    if (cardState === SRS_CARD_STATES.new) {
      dueNew.push(candidate);
      return;
    }

    dueLearning.push(candidate);
  });

  return {
    totalCards: words.length,
    dueLearning,
    dueReview,
    dueNew,
    futureScheduled,
  };
};

const buildTodayCounters = (todayLogs = []) => {
  const reviewedToday = todayLogs.filter((log) => log?.queueType === "review").length;
  const newWordIds = new Set(
    todayLogs
      .filter((log) => log?.queueType === "new")
      .map((log) => Number(log.wordId))
      .filter((wordId) => Number.isInteger(wordId) && wordId > 0),
  );

  return {
    totalStudiedToday: todayLogs.length,
    reviewedToday,
    newStudiedToday: newWordIds.size,
  };
};

const resolveSessionLimits = ({ srsSettings, studySettings, todayCounters }) => {
  const newLeft = Math.max(0, srsSettings.newCardsPerDay - todayCounters.newStudiedToday);
  const reviewLeft = Math.max(0, srsSettings.maxReviewsPerDay - todayCounters.reviewedToday);
  const dailyLeft = Math.max(0, studySettings.dailyGoal - todayCounters.totalStudiedToday);

  return {
    newCardsPerDay: srsSettings.newCardsPerDay,
    maxReviewsPerDay: srsSettings.maxReviewsPerDay,
    dailyGoal: studySettings.dailyGoal,
    dailyLeft,
    newLeft,
    reviewLeft,
    dailyLimitReached: dailyLeft <= 0,
  };
};

const resolveNextCard = ({ queueCounters, limits, studySettings, forceAllCards }) => {
  if (!forceAllCards && limits.dailyLimitReached) {
    return null;
  }

  const dueLearning = shuffleCandidates(
    queueCounters.dueLearning,
    studySettings.shuffleMode,
    studySettings.shuffleSeed,
    true,
  );

  if (dueLearning.length > 0) {
    return dueLearning[0];
  }

  if (forceAllCards || limits.reviewLeft > 0) {
    const dueReview = shuffleCandidates(
      queueCounters.dueReview,
      studySettings.shuffleMode === "always" ? "always" : "off",
      studySettings.shuffleSeed,
      true,
    );

    if (dueReview.length > 0) {
      return dueReview[0];
    }
  }

  if (forceAllCards || limits.newLeft > 0) {
    const dueNew = shuffleCandidates(
      queueCounters.dueNew,
      studySettings.shuffleMode,
      studySettings.shuffleSeed,
      false,
    );

    if (dueNew.length > 0) {
      return dueNew[0];
    }
  }

  if (forceAllCards) {
    const futureScheduled = queueCounters.futureScheduled
      .slice()
      .sort((first, second) => {
        const firstDue = Number(first.card?.dueAtMs) || 0;
        const secondDue = Number(second.card?.dueAtMs) || 0;

        if (firstDue !== secondDue) {
          return firstDue - secondDue;
        }

        return Number(first.word?.id || 0) - Number(second.word?.id || 0);
      });

    if (futureScheduled.length > 0) {
      return futureScheduled[0];
    }
  }

  return null;
};

const buildSessionPayload = ({
  deck,
  selectedCard,
  queueCounters,
  todayCounters,
  limits,
  forceAllCards,
}) => {
  const reviewAvailable = forceAllCards
    ? queueCounters.dueReview.length
    : Math.max(0, Math.min(queueCounters.dueReview.length, limits.reviewLeft));
  const newAvailable = forceAllCards
    ? queueCounters.dueNew.length
    : Math.max(0, Math.min(queueCounters.dueNew.length, limits.newLeft));
  const totalDue = queueCounters.dueLearning.length + reviewAvailable + newAvailable;
  const hasDueWithoutLimits =
    queueCounters.dueLearning.length + queueCounters.dueReview.length + queueCounters.dueNew.length > 0;
  const blockedByLimits =
    !forceAllCards &&
    !selectedCard &&
    hasDueWithoutLimits &&
    (
      limits.dailyLimitReached ||
      (
        queueCounters.dueLearning.length === 0 &&
        (
          (queueCounters.dueReview.length > 0 && limits.reviewLeft === 0) ||
          (queueCounters.dueNew.length > 0 && limits.newLeft === 0)
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
      sourceLanguage: toCleanString(deck?.sourceLanguage),
      targetLanguage: toCleanString(deck?.targetLanguage),
      tertiaryLanguage: toCleanString(deck?.tertiaryLanguage),
    },
    sessionMode: forceAllCards ? "extended" : "default",
    card: selectedCard,
    stats: {
      totalCards: queueCounters.totalCards,
      dueLearning: queueCounters.dueLearning.length,
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
      done: !selectedCard,
      reason: selectedCard ? "" : completionReason,
      canStartNewSession:
        !forceAllCards &&
        !selectedCard &&
        completionReason === "daily-limit" &&
        hasDueWithoutLimits,
    },
  };
};

export const normalizeSrsSettings = (settings = {}) => {
  const source =
    settings?.spacedRepetition && typeof settings.spacedRepetition === "object"
      ? settings.spacedRepetition
      : settings;

  return {
    newCardsPerDay: clampInteger(
      source?.newCardsPerDay,
      1,
      999,
      DEFAULT_SRS_SETTINGS.newCardsPerDay,
    ),
    maxReviewsPerDay: clampInteger(
      source?.maxReviewsPerDay,
      1,
      5000,
      DEFAULT_SRS_SETTINGS.maxReviewsPerDay,
    ),
    learningStepsMinutes: parseLearningSteps(source?.learningSteps),
    easyBonus:
      clampInteger(source?.easyBonus, 100, 300, DEFAULT_SRS_SETTINGS.easyBonus * 100) /
      100,
    lapsePenalty:
      clampInteger(
        source?.lapsePenalty,
        10,
        100,
        DEFAULT_SRS_SETTINGS.lapsePenalty * 100,
      ) / 100,
  };
};

export const normalizeStudySettings = (settings = {}) => {
  const source =
    settings?.studySession && typeof settings.studySession === "object"
      ? settings.studySession
      : settings;
  const shuffleMode = ["off", "per_session", "always"].includes(source?.shuffleMode)
    ? source.shuffleMode
    : DEFAULT_STUDY_SETTINGS.shuffleMode;

  return {
    shuffleMode,
    shuffleSeed:
      shuffleMode === "per_session"
        ? clampInteger(source?.shuffleSeed, 1, 2_147_483_646, 1)
        : null,
    dailyGoal: clampInteger(source?.dailyGoal, 1, 999, DEFAULT_STUDY_SETTINGS.dailyGoal),
    repeatWrongCards: toBoolean(
      source?.repeatWrongCards,
      DEFAULT_STUDY_SETTINGS.repeatWrongCards,
    ),
  };
};

export const normalizeCardState = (value) => {
  const normalizedState = toCleanString(value).toLowerCase();

  if (CARD_STATE_SET.has(normalizedState)) {
    return normalizedState;
  }

  return SRS_CARD_STATES.new;
};

export const normalizeRating = (value) => {
  const normalizedRating = toCleanString(value).toLowerCase();

  if (!CARD_RATING_SET.has(normalizedRating)) {
    throw new Error("Unsupported SRS rating");
  }

  return normalizedRating;
};

export const normalizeReviewCard = (card = {}) => {
  const state = normalizeCardState(card.state);
  const dueAtMs = readDueAtMs(card);

  return {
    state,
    learningStep: clampInteger(card.learningStep, 0, 99, 0),
    dueAtMs,
    dueAt: dueAtMs ? toIsoTimestamp(dueAtMs) : null,
    intervalDays: clampInteger(
      card.intervalDays,
      0,
      MAX_INTERVAL_DAYS,
      state === SRS_CARD_STATES.new ? 0 : 1,
    ),
    easeFactor: clampEaseFactor(card.easeFactor),
    reps: clampInteger(card.reps, 0, 100_000, 0),
    lapses: clampInteger(card.lapses, 0, 100_000, 0),
  };
};

export const getQueueTypeByState = (state) => {
  if (state === SRS_CARD_STATES.review) {
    return "review";
  }

  if (state === SRS_CARD_STATES.new) {
    return "new";
  }

  return "learning";
};

export const resolveScheduleOutcome = ({
  card: rawCard,
  rating,
  srsSettings,
  studySettings,
  nowMs,
}) => {
  const safeNowMs = Number.isFinite(Number(nowMs)) ? Number(nowMs) : Date.now();
  const card = normalizeReviewCard(rawCard);
  const learningSteps = srsSettings.learningStepsMinutes;
  const firstStep = resolveLearningStepMinutes(learningSteps, 0);
  const currentStep = resolveLearningStepMinutes(learningSteps, card.learningStep);

  if (card.state === SRS_CARD_STATES.new) {
    if (rating === SRS_CARD_RATINGS.again) {
      return {
        ...resolveAgainDue(safeNowMs, firstStep, studySettings),
        state: SRS_CARD_STATES.learning,
        learningStep: 0,
        intervalDays: 0,
        easeFactor: clampEaseFactor(card.easeFactor - 0.2),
        reps: 0,
        lapses: card.lapses,
      };
    }

    if (rating === SRS_CARD_RATINGS.hard) {
      const hardMinutes = Math.max(firstStep + 1, Math.round(firstStep * 1.5));

      return {
        ...toDueDateFromMinutes(safeNowMs, hardMinutes),
        state: SRS_CARD_STATES.learning,
        learningStep: 0,
        intervalDays: 0,
        easeFactor: clampEaseFactor(card.easeFactor - 0.15),
        reps: 0,
        lapses: card.lapses,
      };
    }

    if (rating === SRS_CARD_RATINGS.easy) {
      const easyInterval = Math.max(2, Math.round(srsSettings.easyBonus * 2));

      return {
        ...toDueDateFromDays(safeNowMs, easyInterval),
        state: SRS_CARD_STATES.review,
        learningStep: 0,
        intervalDays: easyInterval,
        easeFactor: clampEaseFactor(card.easeFactor + 0.05),
        reps: 1,
        lapses: card.lapses,
      };
    }

    if (learningSteps.length > 1) {
      return {
        ...toDueDateFromMinutes(safeNowMs, resolveLearningStepMinutes(learningSteps, 1)),
        state: SRS_CARD_STATES.learning,
        learningStep: 1,
        intervalDays: 0,
        easeFactor: clampEaseFactor(card.easeFactor),
        reps: 0,
        lapses: card.lapses,
      };
    }

    return {
      ...toDueDateFromDays(safeNowMs, 1),
      state: SRS_CARD_STATES.review,
      learningStep: 0,
      intervalDays: 1,
      easeFactor: clampEaseFactor(card.easeFactor),
      reps: 1,
      lapses: card.lapses,
    };
  }

  if (card.state === SRS_CARD_STATES.learning || card.state === SRS_CARD_STATES.relearning) {
    if (rating === SRS_CARD_RATINGS.again) {
      return {
        ...resolveAgainDue(safeNowMs, firstStep, studySettings),
        state: card.state,
        learningStep: 0,
        intervalDays: card.intervalDays,
        easeFactor: clampEaseFactor(card.easeFactor - 0.2),
        reps: card.reps,
        lapses: card.lapses,
      };
    }

    if (rating === SRS_CARD_RATINGS.hard) {
      const hardMinutes = Math.max(firstStep + 1, Math.round(currentStep * 1.2));

      return {
        ...toDueDateFromMinutes(safeNowMs, hardMinutes),
        state: card.state,
        learningStep: card.learningStep,
        intervalDays: card.intervalDays,
        easeFactor: clampEaseFactor(card.easeFactor - 0.1),
        reps: card.reps,
        lapses: card.lapses,
      };
    }

    const nextStep = card.learningStep + 1;

    if (rating === SRS_CARD_RATINGS.good && nextStep < learningSteps.length) {
      return {
        ...toDueDateFromMinutes(safeNowMs, resolveLearningStepMinutes(learningSteps, nextStep)),
        state: card.state,
        learningStep: nextStep,
        intervalDays: card.intervalDays,
        easeFactor: clampEaseFactor(card.easeFactor),
        reps: card.reps,
        lapses: card.lapses,
      };
    }

    const baseInterval = Math.max(1, card.intervalDays || 1);
    const nextInterval = rating === SRS_CARD_RATINGS.easy
      ? Math.max(baseInterval + 1, Math.round(baseInterval * srsSettings.easyBonus))
      : baseInterval;

    return {
      ...toDueDateFromDays(safeNowMs, nextInterval),
      state: SRS_CARD_STATES.review,
      learningStep: 0,
      intervalDays: nextInterval,
      easeFactor: clampEaseFactor(
        rating === SRS_CARD_RATINGS.easy ? card.easeFactor + 0.05 : card.easeFactor,
      ),
      reps: Math.max(1, card.reps + 1),
      lapses: card.lapses,
    };
  }

  const baseInterval = Math.max(1, card.intervalDays || 1);
  const hardInterval = Math.max(1, Math.round(baseInterval * 1.2));
  const goodInterval = Math.max(
    hardInterval,
    Math.round(baseInterval * Math.max(1.4, card.easeFactor)),
  );
  const easyInterval = Math.max(
    goodInterval + 1,
    Math.round(baseInterval * card.easeFactor * srsSettings.easyBonus),
  );

  if (rating === SRS_CARD_RATINGS.again) {
    const relearnInterval = Math.max(1, Math.round(baseInterval * srsSettings.lapsePenalty));

    return {
      ...resolveAgainDue(safeNowMs, firstStep, studySettings),
      state: SRS_CARD_STATES.relearning,
      learningStep: 0,
      intervalDays: relearnInterval,
      easeFactor: clampEaseFactor(card.easeFactor - 0.2),
      reps: Math.max(0, card.reps - 1),
      lapses: card.lapses + 1,
    };
  }

  if (rating === SRS_CARD_RATINGS.hard) {
    return {
      ...toDueDateFromDays(safeNowMs, hardInterval),
      state: SRS_CARD_STATES.review,
      learningStep: 0,
      intervalDays: hardInterval,
      easeFactor: clampEaseFactor(card.easeFactor - 0.15),
      reps: card.reps + 1,
      lapses: card.lapses,
    };
  }

  if (rating === SRS_CARD_RATINGS.easy) {
    return {
      ...toDueDateFromDays(safeNowMs, easyInterval),
      state: SRS_CARD_STATES.review,
      learningStep: 0,
      intervalDays: easyInterval,
      easeFactor: clampEaseFactor(card.easeFactor + 0.15),
      reps: card.reps + 1,
      lapses: card.lapses,
    };
  }

  return {
    ...toDueDateFromDays(safeNowMs, goodInterval),
    state: SRS_CARD_STATES.review,
    learningStep: 0,
    intervalDays: goodInterval,
    easeFactor: clampEaseFactor(card.easeFactor),
    reps: card.reps + 1,
    lapses: card.lapses,
  };
};

export const buildRatingPreview = ({
  card,
  srsSettings,
  studySettings,
  nowMs,
}) => {
  return CARD_RATING_ORDER.reduce((result, rating) => {
    const outcome = resolveScheduleOutcome({
      card,
      rating,
      srsSettings,
      studySettings,
      nowMs,
    });

    result[rating] = formatRelativeInterval(outcome.dueAtMs, nowMs);
    return result;
  }, {});
};

export const toSessionCard = ({
  word,
  card,
  srsSettings,
  studySettings,
  nowMs,
}) => {
  return {
    wordId: Number(word.id),
    source: toCleanString(word.source),
    target: toCleanString(word.target),
    tertiary: toCleanString(word.tertiary),
    level: toCleanString(word.level),
    part_of_speech: toCleanString(word.part_of_speech),
    tags: toCleanStringArray(word.tags, MAX_WORD_TAGS),
    examples: toCleanStringArray(word.examples, MAX_WORD_EXAMPLES),
    state: card.state,
    queueType: getQueueTypeByState(card.state),
    dueAt: card.dueAt,
    intervalDays: card.intervalDays,
    easeFactor: card.easeFactor,
    reps: card.reps,
    lapses: card.lapses,
    ratingPreview: buildRatingPreview({
      card,
      srsSettings,
      studySettings,
      nowMs,
    }),
  };
};

export const buildSrsSessionSnapshot = ({
  deck,
  words,
  cardsByWordId,
  todayLogs,
  srsSettings,
  studySettings,
  forceAllCards,
  nowMs,
}) => {
  const queueCounters = buildSessionCounters({
    words,
    cardsByWordId,
    nowMs,
  });
  const todayCounters = buildTodayCounters(todayLogs);
  const limits = resolveSessionLimits({
    srsSettings,
    studySettings,
    todayCounters,
  });
  const nextCandidate = resolveNextCard({
    queueCounters,
    limits,
    studySettings,
    forceAllCards,
  });
  const selectedCard = nextCandidate
    ? toSessionCard({
        word: nextCandidate.word,
        card: nextCandidate.card,
        srsSettings,
        studySettings,
        nowMs,
      })
    : null;

  return buildSessionPayload({
    deck,
    selectedCard,
    queueCounters,
    todayCounters,
    limits,
    forceAllCards,
  });
};

export {
  DEFAULT_SRS_SETTINGS,
  DEFAULT_STUDY_SETTINGS,
  EMPTY_SRS_SESSION,
  SRS_CARD_RATINGS,
  SRS_CARD_STATES,
};
