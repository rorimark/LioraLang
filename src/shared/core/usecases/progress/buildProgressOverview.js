const DAY_MS = 24 * 60 * 60 * 1000;

const toLocalDayKey = (value = Date.now()) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const toPercent = (value) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return 0;
  }

  if (numericValue >= 100) {
    return 100;
  }

  return Number(numericValue.toFixed(1));
};

const buildRecentDays = (daysCount) => {
  const safeDays = Number.isInteger(daysCount) && daysCount > 0 ? daysCount : 7;
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return Array.from({ length: safeDays }, (_, index) => {
    const offset = safeDays - 1 - index;
    const date = new Date(today.getTime() - offset * DAY_MS);

    return {
      key: toLocalDayKey(date),
      label: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
      }).format(date),
    };
  });
};

const resolveStreakDays = (reviewDayKeys = []) => {
  if (!Array.isArray(reviewDayKeys) || reviewDayKeys.length === 0) {
    return 0;
  }

  const reviewedSet = new Set(reviewDayKeys);
  const currentDate = new Date();

  currentDate.setHours(0, 0, 0, 0);

  let streak = 0;

  while (true) {
    const dayKey = toLocalDayKey(currentDate);

    if (!dayKey || !reviewedSet.has(dayKey)) {
      break;
    }

    streak += 1;
    currentDate.setTime(currentDate.getTime() - DAY_MS);
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

  if (milestones.length < 4) {
    milestones.push(
      reviewed7d > 0
        ? `7-day recall: ${recall7d}%`
        : "7-day recall will appear after your first review",
    );
  }

  return milestones.slice(0, 4);
};

export const buildProgressOverview = ({
  decks = [],
  words = [],
  reviewCards = [],
  reviewLogs = [],
  deckLoadLimit = 6,
} = {}) => {
  const recent7Days = buildRecentDays(7);
  const recent14Days = buildRecentDays(14);
  const last7DaysSet = new Set(recent7Days.map((item) => item.key));
  const last30DaysSet = new Set(buildRecentDays(30).map((item) => item.key));
  const dayStatsMap = new Map();

  reviewLogs.forEach((log) => {
    const dayKey = typeof log?.dayKey === "string" ? log.dayKey : "";

    if (!dayKey) {
      return;
    }

    const currentDayStats = dayStatsMap.get(dayKey) || {
      reviews: 0,
      successful: 0,
    };

    currentDayStats.reviews += 1;

    if (log?.rating !== "again") {
      currentDayStats.successful += 1;
    }

    dayStatsMap.set(dayKey, currentDayStats);
  });

  const weekly = recent7Days.map((day) => {
    const dayStats = dayStatsMap.get(day.key) || { reviews: 0, successful: 0 };

    return {
      date: day.key,
      label: day.label,
      reviews: dayStats.reviews,
      recall:
        dayStats.reviews > 0
          ? toPercent((dayStats.successful / dayStats.reviews) * 100)
          : 0,
    };
  });

  const intensity = recent14Days.map((day) => {
    const dayStats = dayStatsMap.get(day.key) || { reviews: 0 };

    return {
      date: day.key,
      label: day.label,
      value: dayStats.reviews,
    };
  });

  const reviewed7d = weekly.reduce((sum, day) => sum + Number(day.reviews || 0), 0);
  const successful7d = weekly.reduce(
    (sum, day) => sum + Math.round((Number(day.recall || 0) / 100) * Number(day.reviews || 0)),
    0,
  );
  const recall7d = reviewed7d > 0 ? toPercent((successful7d / reviewed7d) * 100) : 0;

  const matureCards = reviewCards.filter((card) => {
    return card?.state === "review" && Number(card?.intervalDays || 0) >= 21;
  }).length;

  const reviewedDayKeys = new Set(
    reviewLogs
      .map((log) => (typeof log?.dayKey === "string" ? log.dayKey : ""))
      .filter(Boolean),
  );

  const streakDays = resolveStreakDays(Array.from(reviewedDayKeys));

  const wordsCountByDeckId = new Map();

  words.forEach((word) => {
    const deckId = Number(word?.deckId);

    if (!Number.isInteger(deckId) || deckId <= 0) {
      return;
    }

    wordsCountByDeckId.set(deckId, Number(wordsCountByDeckId.get(deckId) || 0) + 1);
  });

  const reviews7dByDeckId = new Map();

  reviewLogs.forEach((log) => {
    const deckId = Number(log?.deckId);
    const dayKey = typeof log?.dayKey === "string" ? log.dayKey : "";

    if (!Number.isInteger(deckId) || deckId <= 0 || !last7DaysSet.has(dayKey)) {
      return;
    }

    reviews7dByDeckId.set(deckId, Number(reviews7dByDeckId.get(deckId) || 0) + 1);
  });

  const safeDeckLoadLimit = Number.isInteger(deckLoadLimit)
    ? Math.max(1, Math.min(deckLoadLimit, 12))
    : 6;

  const deckLoad = decks
    .map((deck) => {
      const deckId = Number(deck?.id);

      return {
        id: deckId,
        name: String(deck?.name || "Deck"),
        cards: Number(wordsCountByDeckId.get(deckId) || 0),
        reviews7d: Number(reviews7dByDeckId.get(deckId) || 0),
      };
    })
    .sort((first, second) => {
      if (second.reviews7d !== first.reviews7d) {
        return second.reviews7d - first.reviews7d;
      }

      if (second.cards !== first.cards) {
        return second.cards - first.cards;
      }

      return first.name.localeCompare(second.name, undefined, {
        sensitivity: "base",
      });
    })
    .slice(0, safeDeckLoadLimit);

  const queueTotals = {
    new: {
      total: 0,
      successful: 0,
    },
    learning: {
      total: 0,
      successful: 0,
    },
    review: {
      total: 0,
      successful: 0,
    },
  };

  reviewLogs.forEach((log) => {
    const dayKey = typeof log?.dayKey === "string" ? log.dayKey : "";

    if (!last30DaysSet.has(dayKey)) {
      return;
    }

    const queueType = ["new", "learning", "review"].includes(log?.queueType)
      ? log.queueType
      : "learning";

    queueTotals[queueType].total += 1;

    if (log?.rating !== "again") {
      queueTotals[queueType].successful += 1;
    }
  });

  const retentionSplit = [
    { key: "new", label: "New Queue" },
    { key: "learning", label: "Learning Queue" },
    { key: "review", label: "Review Queue" },
  ].map((item) => {
    const queue = queueTotals[item.key];

    return {
      label: item.label,
      value: queue.total > 0 ? toPercent((queue.successful / queue.total) * 100) : 0,
    };
  });

  const totals = {
    decks: decks.length,
    words: words.length,
    reviews: reviewLogs.length,
  };

  return {
    generatedAt: new Date().toISOString(),
    kpis: {
      reviewed7d,
      recall7d,
      streakDays,
      matureCards,
    },
    weekly,
    intensity,
    deckLoad,
    retentionSplit,
    milestones: buildMilestones({
      reviewed7d,
      recall7d,
      streakDays,
      matureCards,
      decksCount: totals.decks,
      wordsCount: totals.words,
      topDeck: deckLoad[0] || null,
    }),
    totals,
  };
};
