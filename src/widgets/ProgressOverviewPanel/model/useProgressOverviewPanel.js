import { useCallback, useEffect, useState } from "react";
import { buildLearningStats } from "@shared/core/usecases/progress";
import { usePlatformService } from "@shared/providers";

const EMPTY_STATS = buildLearningStats({ weeks: 53 });

// The platforms return buildProgressOverview's payload; anything missing
// falls back to the empty picture rather than breaking the page.
const normalizeOverview = (payload) => {
  const source = payload && typeof payload === "object" ? payload : {};
  const stats = { ...EMPTY_STATS };

  Object.keys(EMPTY_STATS).forEach((key) => {
    if (source[key] !== undefined && source[key] !== null) {
      stats[key] = source[key];
    }
  });

  return {
    ...stats,
    totals: {
      decks: Number(source.totals?.decks) || 0,
      reviews: Number(source.totals?.reviews) || 0,
    },
  };
};

export const useProgressOverviewPanel = () => {
  const progressRepository = usePlatformService("progressRepository");
  const [overview, setOverview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOverview = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      setOverview(normalizeOverview(await progressRepository.getProgressOverview()));
    } catch (overviewError) {
      setError(overviewError?.message || "Progress could not be loaded.");
    } finally {
      setIsLoading(false);
    }
  }, [progressRepository]);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  return { overview, isLoading, error, refreshOverview };
};
