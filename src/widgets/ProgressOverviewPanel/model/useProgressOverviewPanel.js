import { useCallback, useEffect, useState } from "react";
import { buildAchievements, buildLearningStats, toLocalDayKey } from "@shared/core/usecases/progress";
import { usePlatformService } from "@shared/providers";
import { buildSeenLedger, mergeStickers, readStickerLedger, writeStickerLedger } from "@shared/lib/stickers";

const EMPTY_BASE = buildLearningStats({ weeks: 53 });
const EMPTY_STATS = { ...EMPTY_BASE, achievements: buildAchievements(EMPTY_BASE), profileScope: "" };

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
  const [stickers, setStickers] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshOverview = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const nextOverview = normalizeOverview(await progressRepository.getProgressOverview());
      const nextStickers = mergeStickers({
        achievements: nextOverview.achievements,
        ledger: readStickerLedger(nextOverview.profileScope),
        todayKey: toLocalDayKey(Date.now()),
        currentStreak: nextOverview.streak.current,
      });

      // Shown now, so remembered as seen: the "new" marks stay for this
      // visit and are gone on the next one.
      writeStickerLedger(nextOverview.profileScope, buildSeenLedger(nextStickers));
      setOverview(nextOverview);
      setStickers(nextStickers);
    } catch (overviewError) {
      // Said by the page in its own words; the cause is for the console.
      console.warn(overviewError);
      setError("load");
    } finally {
      setIsLoading(false);
    }
  }, [progressRepository]);

  useEffect(() => {
    void refreshOverview();
  }, [refreshOverview]);

  return { overview, stickers, isLoading, error, refreshOverview };
};
