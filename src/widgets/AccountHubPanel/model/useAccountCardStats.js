import { useEffect, useState } from "react";
import { toLocalDayKey } from "@shared/core/usecases/progress";
import { mergeStickers, readStickerLedger } from "@shared/lib/stickers";
import { usePlatformService } from "@shared/providers";
import { buildCardStats } from "./accountCard";

// The learning side of the card: read once the learner is signed in.
// The card shows without it (dashes) if progress cannot be read.
export const useAccountCardStats = (isAuthenticated) => {
  const progressRepository = usePlatformService("progressRepository");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      return undefined;
    }

    let isCurrent = true;

    progressRepository
      .getProgressOverview()
      .then((overview) => {
        if (!isCurrent) {
          return;
        }

        const stickers = mergeStickers({
          achievements: overview?.achievements,
          ledger: readStickerLedger(overview?.profileScope),
          todayKey: toLocalDayKey(Date.now()),
          currentStreak: Number(overview?.streak?.current) || 0,
        });

        setStats(buildCardStats({ overview, stickers }));
      })
      .catch(() => {
        if (isCurrent) {
          setStats(null);
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [isAuthenticated, progressRepository]);

  return isAuthenticated ? stats : null;
};
