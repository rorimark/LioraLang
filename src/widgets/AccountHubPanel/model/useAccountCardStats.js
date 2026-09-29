import { useEffect, useState } from "react";
import { toLocalDayKey } from "@shared/core/usecases/progress";
import { buildUserProfileScope } from "@shared/core/usecases/sync";
import { mergeStickers, readStickerLedger } from "@shared/lib/stickers";
import { usePlatformService } from "@shared/providers";
import { buildCardStats } from "./accountCard";

// The learning side of the card, for the signed-in user's own profile.
// The profile is passed explicitly: right after sign-in the auth client
// may not have settled, and a lookup would read the guest profile.
// The card shows without it (dashes) if progress cannot be read.
export const useAccountCardStats = (userId) => {
  const progressRepository = usePlatformService("progressRepository");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    let isCurrent = true;

    progressRepository
      .getProgressOverview({ profileScope: buildUserProfileScope(userId) })
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
  }, [userId, progressRepository]);

  return userId ? stats : null;
};
