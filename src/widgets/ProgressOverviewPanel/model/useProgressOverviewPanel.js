import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopApi } from "@shared/api";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;
const CHART_PADDING = 22;
const WEEK_DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});
const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");
const PERCENT_FORMATTER = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

const DAY_MS = 24 * 60 * 60 * 1000;

const toSafeNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const clampPercent = (value) => {
  const safeValue = toSafeNumber(value);

  if (safeValue < 0) {
    return 0;
  }

  if (safeValue > 100) {
    return 100;
  }

  return Number(safeValue.toFixed(1));
};

const formatInteger = (value) => INTEGER_FORMATTER.format(Math.round(toSafeNumber(value)));

const formatPercent = (value) => PERCENT_FORMATTER.format(clampPercent(value));

const buildRecentDays = (daysCount) => {
  const safeCount = Number.isInteger(daysCount) && daysCount > 0 ? daysCount : 7;
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  return Array.from({ length: safeCount }, (_, index) => {
    const offset = safeCount - 1 - index;
    const date = new Date(today.getTime() - offset * DAY_MS);

    return {
      date,
      key: date.toISOString().slice(0, 10),
      label: WEEK_DAY_FORMATTER.format(date),
    };
  });
};

const buildDefaultWeekly = () =>
  buildRecentDays(7).map((dayItem) => ({
    date: dayItem.key,
    label: dayItem.label,
    reviews: 0,
    recall: 0,
  }));

const buildDefaultIntensity = () =>
  buildRecentDays(14).map((dayItem) => ({
    date: dayItem.key,
    label: dayItem.label,
    value: 0,
  }));

const EMPTY_OVERVIEW = {
  generatedAt: "",
  kpis: {
    reviewed7d: 0,
    recall7d: 0,
    streakDays: 0,
    matureCards: 0,
  },
  weekly: buildDefaultWeekly(),
  intensity: buildDefaultIntensity(),
  deckLoad: [],
  retentionSplit: [
    { label: "New Queue", value: 0 },
    { label: "Learning Queue", value: 0 },
    { label: "Review Queue", value: 0 },
  ],
  milestones: [],
  totals: {
    decks: 0,
    words: 0,
    reviews: 0,
  },
};

const normalizeWeeklyRow = (row, fallbackLabel) => ({
  date: typeof row?.date === "string" ? row.date : "",
  label:
    typeof row?.label === "string" && row.label.trim()
      ? row.label
      : fallbackLabel,
  reviews: Math.max(0, Math.round(toSafeNumber(row?.reviews))),
  recall: clampPercent(row?.recall),
});

const normalizeIntensityRow = (row, fallbackLabel) => ({
  date: typeof row?.date === "string" ? row.date : "",
  label:
    typeof row?.label === "string" && row.label.trim()
      ? row.label
      : fallbackLabel,
  value: Math.max(0, Math.round(toSafeNumber(row?.value))),
});

const normalizeDeckId = (value, fallbackIndex) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return `deck-${fallbackIndex + 1}`;
};

const normalizeOverview = (payload) => {
  if (!payload || typeof payload !== "object") {
    return EMPTY_OVERVIEW;
  }

  const fallbackWeekly = buildDefaultWeekly();
  const incomingWeekly = Array.isArray(payload.weekly) && payload.weekly.length > 0
    ? payload.weekly
    : fallbackWeekly;
  const normalizedWeekly = incomingWeekly
    .slice(-7)
    .map((row, index) => normalizeWeeklyRow(row, fallbackWeekly[index]?.label || ""));

  const fallbackIntensity = buildDefaultIntensity();
  const incomingIntensity = Array.isArray(payload.intensity) && payload.intensity.length > 0
    ? payload.intensity
    : fallbackIntensity;
  const slicedIntensity = incomingIntensity.slice(-14);
  const fallbackIntensityStart = Math.max(
    0,
    fallbackIntensity.length - slicedIntensity.length,
  );
  const normalizedIntensity = slicedIntensity
    .map((row, index) =>
      normalizeIntensityRow(
        row,
        fallbackIntensity[fallbackIntensityStart + index]?.label || "",
      ),
    );

  const retentionSplit = Array.isArray(payload.retentionSplit)
    ? payload.retentionSplit
        .map((item) => ({
          label:
            typeof item?.label === "string" && item.label.trim() ? item.label : "Queue",
          value: clampPercent(item?.value),
        }))
        .slice(0, 4)
    : EMPTY_OVERVIEW.retentionSplit;

  return {
    generatedAt:
      typeof payload.generatedAt === "string" ? payload.generatedAt : "",
    kpis: {
      reviewed7d: Math.max(0, Math.round(toSafeNumber(payload?.kpis?.reviewed7d))),
      recall7d: clampPercent(payload?.kpis?.recall7d),
      streakDays: Math.max(0, Math.round(toSafeNumber(payload?.kpis?.streakDays))),
      matureCards: Math.max(0, Math.round(toSafeNumber(payload?.kpis?.matureCards))),
    },
    weekly: normalizedWeekly,
    intensity: normalizedIntensity,
    deckLoad: Array.isArray(payload.deckLoad)
      ? payload.deckLoad.map((deck, index) => ({
          id: normalizeDeckId(deck?.id, index),
          name:
            typeof deck?.name === "string" && deck.name.trim()
              ? deck.name
              : "Deck",
          cards: Math.max(0, Math.round(toSafeNumber(deck?.cards))),
          reviews7d: Math.max(0, Math.round(toSafeNumber(deck?.reviews7d))),
        }))
      : [],
    retentionSplit: retentionSplit.length > 0 ? retentionSplit : EMPTY_OVERVIEW.retentionSplit,
    milestones: Array.isArray(payload.milestones)
      ? payload.milestones
          .filter((item) => typeof item === "string" && item.trim())
          .slice(0, 5)
      : [],
    totals: {
      decks: Math.max(0, Math.round(toSafeNumber(payload?.totals?.decks))),
      words: Math.max(0, Math.round(toSafeNumber(payload?.totals?.words))),
      reviews: Math.max(0, Math.round(toSafeNumber(payload?.totals?.reviews))),
    },
  };
};

const buildLinePoints = (values = [], maxValue = 1) => {
  if (!Array.isArray(values) || values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    const x = CHART_PADDING;
    const y = CHART_HEIGHT - CHART_PADDING;
    return `${x},${y}`;
  }

  const safeMaxValue = Math.max(1, toSafeNumber(maxValue));
  const stepX = (CHART_WIDTH - CHART_PADDING * 2) / (values.length - 1);

  return values
    .map((value, index) => {
      const clamped = Math.max(0, toSafeNumber(value));
      const x = CHART_PADDING + stepX * index;
      const y =
        CHART_HEIGHT -
        CHART_PADDING -
        (clamped / safeMaxValue) * (CHART_HEIGHT - CHART_PADDING * 2);

      return `${x},${y}`;
    })
    .join(" ");
};

const buildAreaPoints = (linePoints) => {
  if (!linePoints) {
    return "";
  }

  const startX = CHART_PADDING;
  const endX = CHART_WIDTH - CHART_PADDING;
  const bottomY = CHART_HEIGHT - CHART_PADDING;

  return `${startX},${bottomY} ${linePoints} ${endX},${bottomY}`;
};

const sum = (values = []) => values.reduce((total, value) => total + toSafeNumber(value), 0);

const average = (values = []) => {
  if (!Array.isArray(values) || values.length === 0) {
    return 0;
  }

  return sum(values) / values.length;
};

const buildTrendLabel = (values = [], { percent = false } = {}) => {
  if (!Array.isArray(values) || values.length < 2) {
    return "Not enough data";
  }

  const middleIndex = Math.floor(values.length / 2);
  const firstPart = values.slice(0, middleIndex);
  const secondPart = values.slice(middleIndex);
  const firstValue = percent ? average(firstPart) : sum(firstPart);
  const secondValue = percent ? average(secondPart) : sum(secondPart);

  if (firstValue === 0 && secondValue === 0) {
    return "No activity yet";
  }

  if (firstValue === 0) {
    return "Growing this week";
  }

  const delta = ((secondValue - firstValue) / firstValue) * 100;

  if (Math.abs(delta) < 4) {
    return "Stable pace";
  }

  return `${delta > 0 ? "+" : ""}${Math.round(delta)}% vs early week`;
};

export const useProgressOverviewPanel = () => {
  const [overview, setOverview] = useState(EMPTY_OVERVIEW);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOverview = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const result = await desktopApi.getProgressOverview();
      setOverview(normalizeOverview(result));
    } catch (overviewError) {
      setError(overviewError?.message || "Failed to load progress overview");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  const kpiItems = useMemo(() => {
    const reviewedTrend = buildTrendLabel(overview.weekly.map((item) => item.reviews));
    const recallTrend = buildTrendLabel(overview.weekly.map((item) => item.recall), {
      percent: true,
    });
    const matureShare =
      overview.totals.words > 0
        ? Math.round((overview.kpis.matureCards / overview.totals.words) * 100)
        : 0;

    return [
      {
        label: "Cards Reviewed (7d)",
        value: formatInteger(overview.kpis.reviewed7d),
        trend: reviewedTrend,
      },
      {
        label: "Average Recall",
        value: `${formatPercent(overview.kpis.recall7d)}%`,
        trend: recallTrend,
      },
      {
        label: "Current Streak",
        value: `${overview.kpis.streakDays} day${overview.kpis.streakDays === 1 ? "" : "s"}`,
        trend:
          overview.kpis.streakDays > 0
            ? "Keep the streak alive"
            : "Start your first streak",
      },
      {
        label: "Mature Cards",
        value: formatInteger(overview.kpis.matureCards),
        trend:
          overview.totals.words > 0
            ? `${matureShare}% of your library`
            : "No cards yet",
      },
    ];
  }, [overview]);

  const weeklyChart = useMemo(() => {
    const weeklyReviews = overview.weekly.map((item) => item.reviews);
    const weeklyRecall = overview.weekly.map((item) => item.recall);
    const maxReviews = Math.max(1, ...weeklyReviews);
    const reviewLinePoints = buildLinePoints(weeklyReviews, maxReviews);
    const reviewAreaPoints = buildAreaPoints(reviewLinePoints);
    const recallScaledValues = weeklyRecall.map((value) => (value / 100) * maxReviews);
    const recallLinePoints = buildLinePoints(recallScaledValues, maxReviews);

    return {
      labels: overview.weekly.map((item) => item.label),
      reviewLinePoints,
      reviewAreaPoints,
      recallLinePoints,
      hasData: weeklyReviews.some((value) => value > 0),
    };
  }, [overview.weekly]);

  const deckLoadRows = useMemo(() => {
    const maxCards = Math.max(1, ...overview.deckLoad.map((deck) => deck.cards));

    return overview.deckLoad.map((deck) => ({
      ...deck,
      fillPercent: Math.round((deck.cards / maxCards) * 100),
    }));
  }, [overview.deckLoad]);

  const intensityBars = useMemo(() => {
    const maxValue = Math.max(1, ...overview.intensity.map((item) => item.value));

    return overview.intensity.map((item, index) => ({
      ...item,
      heightPercent: Math.round((item.value / maxValue) * 100),
      showLabel: index % 2 === 0 || index === overview.intensity.length - 1,
    }));
  }, [overview.intensity]);

  const milestones = useMemo(() => {
    if (overview.milestones.length > 0) {
      return overview.milestones;
    }

    return [
      "Add cards and complete your first reviews to unlock detailed progress insights.",
    ];
  }, [overview.milestones]);

  const generatedAtLabel = useMemo(() => {
    if (!overview.generatedAt) {
      return "";
    }

    const generatedAtDate = new Date(overview.generatedAt);

    if (Number.isNaN(generatedAtDate.getTime())) {
      return "";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(generatedAtDate);
  }, [overview.generatedAt]);

  return {
    isLoading,
    error,
    refreshOverview,
    kpiItems,
    weeklyChart,
    deckLoadRows,
    retentionSplit: overview.retentionSplit,
    milestones,
    intensityBars,
    generatedAtLabel,
    totals: overview.totals,
  };
};
