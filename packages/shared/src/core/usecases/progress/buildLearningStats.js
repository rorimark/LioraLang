// What the progress page shows, from the same four collections on every
// platform: decks, words, review cards and the review log. Pure, so the
// web (IndexedDB) and the desktop app (SQLite) show the same numbers.

const DAY_MS = 24 * 60 * 60 * 1000;

// A word counts as learned "for good" once its next review is three weeks
// or more away: the usual line between a young card and a mature one.
export const MATURE_INTERVAL_DAYS = 21;

export const toLocalDayKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const startOfLocalDay = (ms) => {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// Calendar days, not 24-hour steps, so a daylight-saving change does not
// skip or repeat a day.
const addDays = (dayStartMs, days) => {
  const date = new Date(dayStartMs);
  date.setDate(date.getDate() + days);
  return date.getTime();
};

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const toId = (value) => {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
};

const resolveDueMs = (card) => {
  const dueAtMs = Number(card?.dueAtMs);

  if (Number.isFinite(dueAtMs) && dueAtMs > 0) {
    return dueAtMs;
  }

  const parsed = Date.parse(card?.dueAt || "");
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

// new → learning → young → mature: where a word is on its way to being
// remembered. A word without a card has not been started.
export const resolveWordStage = (card) => {
  const state = card?.state;

  if (!card || !state || state === "new") {
    return "new";
  }

  if (state === "review") {
    return toNumber(card.intervalDays) >= MATURE_INTERVAL_DAYS ? "mature" : "young";
  }

  return "learning";
};

const resolveLogDayKey = (log) => {
  if (typeof log?.dayKey === "string" && log.dayKey) {
    return log.dayKey;
  }

  return toLocalDayKey(log?.reviewedAtMs ?? log?.reviewedAt);
};

const resolveStreaks = (activeDayKeys, todayStartMs) => {
  const todayKey = toLocalDayKey(todayStartMs);
  const isTodayDone = activeDayKeys.has(todayKey);

  // A streak stays alive through today until the day is over: if today has
  // no reviews yet, it is counted up to yesterday.
  let current = 0;
  let cursor = isTodayDone ? todayStartMs : addDays(todayStartMs, -1);

  while (activeDayKeys.has(toLocalDayKey(cursor))) {
    current += 1;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let previousKey = "";

  Array.from(activeDayKeys)
    .sort()
    .forEach((dayKey) => {
      const [year, month, day] = dayKey.split("-").map(Number);
      const expectedPrevious = toLocalDayKey(new Date(year, month - 1, day - 1));
      run = previousKey === expectedPrevious ? run + 1 : 1;
      best = Math.max(best, run);
      previousKey = dayKey;
    });

  return { current, best: Math.max(best, current), isTodayDone };
};

// Weeks as columns, Monday on top, the last column holding today. Days
// after today are left out (null) rather than drawn as empty.
const buildActivity = ({ reviewsByDay, todayStartMs, weeks }) => {
  const weekday = (new Date(todayStartMs).getDay() + 6) % 7;
  const firstDayMs = addDays(todayStartMs, -weekday - (weeks - 1) * 7);
  const days = [];
  let maxReviews = 0;

  for (let index = 0; index < weeks * 7; index += 1) {
    const dayMs = addDays(firstDayMs, index);

    if (dayMs > todayStartMs) {
      days.push(null);
      continue;
    }

    const date = toLocalDayKey(dayMs);
    const reviews = reviewsByDay.get(date) || 0;
    maxReviews = Math.max(maxReviews, reviews);
    days.push({ date, reviews, level: 0 });
  }

  // Four steps relative to the busiest day shown; zero stays its own step.
  days.forEach((day) => {
    if (day && day.reviews > 0) {
      day.level = Math.min(4, Math.max(1, Math.ceil((day.reviews / maxReviews) * 4)));
    }
  });

  const shownDays = days.filter(Boolean);

  return {
    weeks,
    days,
    maxReviews,
    activeDays: shownDays.filter((day) => day.reviews > 0).length,
    reviews: shownDays.reduce((total, day) => total + day.reviews, 0),
  };
};

const RATINGS = ["again", "hard", "good", "easy"];

const countRatings = (logs) => {
  const counts = { again: 0, hard: 0, good: 0, easy: 0, total: 0 };

  logs.forEach((log) => {
    if (RATINGS.includes(log?.rating)) {
      counts[log.rating] += 1;
      counts.total += 1;
    }
  });

  return counts;
};

// Remembered = anything but Again.
const toRecall = (counts) =>
  counts.total > 0 ? Math.round(((counts.total - counts.again) / counts.total) * 1000) / 10 : null;

export const buildLearningStats = ({
  decks = [],
  words = [],
  reviewCards = [],
  reviewLogs = [],
  now = Date.now(),
  weeks = 26,
  forecastDays = 14,
} = {}) => {
  const todayStartMs = startOfLocalDay(now);
  const todayKey = toLocalDayKey(todayStartMs);
  const cardByWordId = new Map();

  reviewCards.forEach((card) => {
    const wordId = toId(card?.wordId);

    if (wordId) {
      cardByWordId.set(wordId, card);
    }
  });

  // Stages, per word and per deck.
  const stages = { new: 0, learning: 0, young: 0, mature: 0 };
  const deckStats = new Map(
    decks
      .filter((deck) => toId(deck?.id))
      .map((deck) => [
        toId(deck.id),
        {
          id: toId(deck.id),
          name: String(deck?.name || "Deck"),
          words: 0,
          new: 0,
          learning: 0,
          young: 0,
          mature: 0,
          dueNow: 0,
          reviews7d: 0,
        },
      ]),
  );

  words.forEach((word) => {
    const wordId = toId(word?.id);

    if (!wordId) {
      return;
    }

    const card = cardByWordId.get(wordId);
    const stage = resolveWordStage(card);
    stages[stage] += 1;

    const deck = deckStats.get(toId(word?.deckId ?? card?.deckId));

    if (deck) {
      deck.words += 1;
      deck[stage] += 1;

      if (stage !== "new" && resolveDueMs(card) <= now) {
        deck.dueNow += 1;
      }
    }
  });

  // What comes due: today holds everything overdue; new words are not due,
  // they come in by the daily limit.
  const forecast = Array.from({ length: forecastDays }, (_, index) => ({
    date: toLocalDayKey(addDays(todayStartMs, index)),
    due: 0,
  }));
  const lastForecastEndMs = addDays(todayStartMs, forecastDays);
  let dueNow = 0;

  words.forEach((word) => {
    const card = cardByWordId.get(toId(word?.id));

    if (resolveWordStage(card) === "new") {
      return;
    }

    const dueMs = resolveDueMs(card);

    if (!Number.isFinite(dueMs)) {
      return;
    }

    if (dueMs <= now) {
      dueNow += 1;
    }

    if (dueMs >= lastForecastEndMs) {
      return;
    }

    const index = dueMs < todayStartMs ? 0 : Math.floor((startOfLocalDay(dueMs) - todayStartMs) / DAY_MS + 0.5);
    forecast[Math.max(0, Math.min(forecastDays - 1, index))].due += 1;
  });

  // The review log: activity, streaks, answers.
  const reviewsByDay = new Map();
  const day7StartKey = toLocalDayKey(addDays(todayStartMs, -6));
  const day30StartKey = toLocalDayKey(addDays(todayStartMs, -29));
  const day60StartKey = toLocalDayKey(addDays(todayStartMs, -59));
  const logs30 = [];
  const logsPrevious30 = [];
  let reviewsToday = 0;

  const againByDay = new Map();

  reviewLogs.forEach((log) => {
    const dayKey = resolveLogDayKey(log);

    if (!dayKey || dayKey > todayKey) {
      return;
    }

    reviewsByDay.set(dayKey, (reviewsByDay.get(dayKey) || 0) + 1);

    if (log?.rating === "again") {
      againByDay.set(dayKey, (againByDay.get(dayKey) || 0) + 1);
    }

    if (dayKey === todayKey) {
      reviewsToday += 1;
    }

    if (dayKey >= day30StartKey) {
      logs30.push(log);
    } else if (dayKey >= day60StartKey) {
      logsPrevious30.push(log);
    }

    if (dayKey >= day7StartKey) {
      const deck = deckStats.get(toId(log?.deckId));

      if (deck) {
        deck.reviews7d += 1;
      }
    }
  });

  const streak = resolveStreaks(new Set(reviewsByDay.keys()), todayStartMs);
  const ratings30d = countRatings(logs30);
  const ratingsPrevious30d = countRatings(logsPrevious30);
  const known = stages.young + stages.mature;

  return {
    totalWords: words.filter((word) => toId(word?.id)).length,
    stages,
    known,
    dueNow,
    reviewsToday,
    streak,
    activity: buildActivity({ reviewsByDay, todayStartMs, weeks }),
    forecast,
    ratings30d,
    recall30d: toRecall(ratings30d),
    recallPrevious30d: toRecall(ratingsPrevious30d),
    // Every day with reviews, oldest first: what the achievements are
    // dated from.
    history: Array.from(reviewsByDay.keys())
      .sort()
      .map((date) => ({ date, reviews: reviewsByDay.get(date), again: againByDay.get(date) || 0 })),
    decks: Array.from(deckStats.values())
      .map((deck) => ({ ...deck, known: deck.young + deck.mature }))
      .sort(
        (first, second) =>
          second.reviews7d - first.reviews7d ||
          second.known - first.known ||
          second.words - first.words ||
          first.name.localeCompare(second.name, undefined, { sensitivity: "base" }),
      ),
  };
};
