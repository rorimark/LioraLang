import { getDatabase } from "../db.js";
import { GUEST_PROFILE_SCOPE, normalizeProfileScope } from "../../../packages/shared/src/core/usecases/sync/index.js";
import { activateProgressProfile } from "./sync.services.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const formatLocalDateKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toWeekdayLabel = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(date);
};

const buildRecentDays = (daysCount) => {
  const safeDays = Number.isInteger(daysCount) && daysCount > 0 ? daysCount : 7;
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return Array.from({ length: safeDays }, (_, index) => {
    const offset = safeDays - 1 - index;
    const date = new Date(today.getTime() - offset * DAY_MS);

    return {
      date,
      key: formatLocalDateKey(date),
      label: toWeekdayLabel(date),
    };
  });
};

const toPercent = (value) => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (value < 0) {
    return 0;
  }

  if (value > 100) {
    return 100;
  }

  return Number(value.toFixed(1));
};

const resolveStreakDays = (reviewDayKeys = []) => {
  if (!Array.isArray(reviewDayKeys) || reviewDayKeys.length === 0) {
    return 0;
  }

  const reviewedSet = new Set(reviewDayKeys);
  const currentDay = new Date();

  currentDay.setHours(0, 0, 0, 0);

  let streak = 0;

  while (true) {
    const dayKey = formatLocalDateKey(currentDay);

    if (!dayKey || !reviewedSet.has(dayKey)) {
      break;
    }

    streak += 1;
    currentDay.setTime(currentDay.getTime() - DAY_MS);
  }

  return streak;
};

const buildMilestones = ({
  reviewed7d,
  recall7d,
  streakDays,
  matureCards,
  decksCount,
  wordsCount,
  topDeck,
}) => {
  const milestones = [];

  if (reviewed7d > 0) {
    milestones.push(`Reviewed ${reviewed7d} cards in the last 7 days`);
  }

  if (streakDays > 0) {
    milestones.push(`Current learning streak: ${streakDays} day${streakDays === 1 ? "" : "s"}`);
  }

  if (matureCards > 0) {
    milestones.push(`Mature cards ready in rotation: ${matureCards}`);
  }

  if (decksCount > 0) {
    milestones.push(`Active library: ${decksCount} decks, ${wordsCount} words`);
  }

  if (topDeck && topDeck.reviews7d > 0) {
    milestones.push(`Top deck this week: ${topDeck.name} (${topDeck.reviews7d} reviews)`);
  }

  if (milestones.length === 0) {
    milestones.push("No reviews yet. Start a learn session to build your progress history.");
  }

  const recallHint = reviewed7d > 0
    ? `7-day recall: ${recall7d}%`
    : "7-day recall will appear after your first review";

  if (milestones.length < 4) {
    milestones.push(recallHint);
  }

  return milestones.slice(0, 4);
};

export const getProgressOverview = ({
  profileScope = GUEST_PROFILE_SCOPE,
} = {}) => {
  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  activateProgressProfile(normalizedProfileScope);
  const last7Days = buildRecentDays(7);
  const last14Days = buildRecentDays(14);

  const last14DailyRows = db
    .prepare(
      `
        SELECT
          DATE(reviewed_at, 'localtime') AS day,
          COUNT(*) AS reviews,
          SUM(CASE WHEN rating <> 'again' THEN 1 ELSE 0 END) AS successful
        FROM review_logs
        WHERE profile_scope = ?
          AND DATE(reviewed_at, 'localtime') >= DATE('now', 'localtime', '-13 days')
        GROUP BY DATE(reviewed_at, 'localtime')
      `,
    )
    .all(normalizedProfileScope);

  const dailyByDay = new Map(
    last14DailyRows.map((row) => [
      String(row.day || ""),
      {
        reviews: Number(row.reviews) || 0,
        successful: Number(row.successful) || 0,
      },
    ]),
  );

  const weekly = last7Days.map((dayItem) => {
    const values = dailyByDay.get(dayItem.key) || { reviews: 0, successful: 0 };
    const recall = values.reviews > 0
      ? toPercent((values.successful / values.reviews) * 100)
      : 0;

    return {
      date: dayItem.key,
      label: dayItem.label,
      reviews: values.reviews,
      recall,
    };
  });

  const intensity = last14Days.map((dayItem) => {
    const values = dailyByDay.get(dayItem.key) || { reviews: 0 };

    return {
      date: dayItem.key,
      label: dayItem.label,
      value: values.reviews,
    };
  });

  const reviewed7d = weekly.reduce((total, dayItem) => total + dayItem.reviews, 0);
  const successful7d = weekly.reduce(
    (total, dayItem) => total + Math.round((dayItem.recall / 100) * dayItem.reviews),
    0,
  );
  const recall7d = reviewed7d > 0 ? toPercent((successful7d / reviewed7d) * 100) : 0;

  const matureCards =
    db
      .prepare(
        `
          SELECT COUNT(*) AS total
          FROM review_cards
          WHERE profile_scope = ? AND state = 'review' AND interval_days >= 21
        `,
      )
      .get(normalizedProfileScope)?.total || 0;

  const dayKeys = db
    .prepare(
      `
        SELECT DATE(reviewed_at, 'localtime') AS day
        FROM review_logs
        WHERE profile_scope = ?
        GROUP BY DATE(reviewed_at, 'localtime')
        ORDER BY day DESC
        LIMIT 365
      `,
    )
    .all(normalizedProfileScope)
    .map((row) => String(row.day || ""))
    .filter(Boolean);

  const streakDays = resolveStreakDays(dayKeys);

  const deckLoad = db
    .prepare(
      `
        SELECT
          decks.id,
          decks.name,
          COALESCE(word_stats.cards, 0) AS cards,
          COALESCE(review_stats.reviews7d, 0) AS reviews7d
        FROM decks
        LEFT JOIN (
          SELECT deck_id, COUNT(*) AS cards
          FROM words
          GROUP BY deck_id
        ) AS word_stats ON word_stats.deck_id = decks.id
        LEFT JOIN (
          SELECT deck_id, COUNT(*) AS reviews7d
          FROM review_logs
          WHERE profile_scope = ?
            AND DATE(reviewed_at, 'localtime') >= DATE('now', 'localtime', '-6 days')
          GROUP BY deck_id
        ) AS review_stats ON review_stats.deck_id = decks.id
        ORDER BY reviews7d DESC, cards DESC, decks.name COLLATE NOCASE ASC
        LIMIT 6
      `,
    )
    .all(normalizedProfileScope)
    .map((row) => ({
      id: Number(row.id),
      name: String(row.name || "Deck"),
      cards: Number(row.cards) || 0,
      reviews7d: Number(row.reviews7d) || 0,
    }));

  const queueRows = db
    .prepare(
      `
        SELECT
          queue_type AS queueType,
          COUNT(*) AS total,
          SUM(CASE WHEN rating <> 'again' THEN 1 ELSE 0 END) AS successful
        FROM review_logs
        WHERE profile_scope = ?
          AND DATE(reviewed_at, 'localtime') >= DATE('now', 'localtime', '-29 days')
        GROUP BY queue_type
      `,
    )
    .all(normalizedProfileScope);

  const queueMap = new Map(
    queueRows.map((row) => [
      String(row.queueType || ""),
      {
        total: Number(row.total) || 0,
        successful: Number(row.successful) || 0,
      },
    ]),
  );

  const retentionSplit = [
    { key: "new", label: "New Queue" },
    { key: "learning", label: "Learning Queue" },
    { key: "review", label: "Review Queue" },
  ].map((item) => {
    const values = queueMap.get(item.key) || { total: 0, successful: 0 };

    return {
      label: item.label,
      value:
        values.total > 0 ? toPercent((values.successful / values.total) * 100) : 0,
    };
  });

  const decksCount = db.prepare("SELECT COUNT(*) AS total FROM decks").get()?.total || 0;
  const wordsCount = db.prepare("SELECT COUNT(*) AS total FROM words").get()?.total || 0;
  const totalReviews =
    db
      .prepare("SELECT COUNT(*) AS total FROM review_logs WHERE profile_scope = ?")
      .get(normalizedProfileScope)?.total || 0;

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      reviewed7d,
      recall7d,
      streakDays,
      matureCards: Number(matureCards) || 0,
    },
    weekly,
    intensity,
    deckLoad,
    retentionSplit,
    milestones: buildMilestones({
      reviewed7d,
      recall7d,
      streakDays,
      matureCards: Number(matureCards) || 0,
      decksCount: Number(decksCount) || 0,
      wordsCount: Number(wordsCount) || 0,
      topDeck: deckLoad[0] || null,
    }),
    totals: {
      decks: Number(decksCount) || 0,
      words: Number(wordsCount) || 0,
      reviews: Number(totalReviews) || 0,
    },
  };
};
