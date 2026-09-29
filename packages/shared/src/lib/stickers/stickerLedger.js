// What this device remembers about the stickers: when each was first seen
// earned, and whether the learner has seen it since. A sticker, once
// earned, stays earned here even if the number behind it falls again (a
// forgotten word); the numbers themselves always come from the stats.
// Shared, so every screen that shows stickers (progress, the account card)
// shows the same ones.

const STORAGE_PREFIX = "lioralang.stickers.";

const storageKey = (profileScope) => `${STORAGE_PREFIX}${profileScope || "guest:default"}`;

export const readStickerLedger = (profileScope) => {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(storageKey(profileScope)) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export const writeStickerLedger = (profileScope, ledger) => {
  try {
    window.localStorage.setItem(storageKey(profileScope), JSON.stringify(ledger));
  } catch {
    // Private windows and full storage: the stickers still show, they are
    // only not remembered as seen.
  }
};

// Stickers read the same short on every screen: 2500 is 2.5k.
export const formatStickerValue = (value) => {
  if (value >= 1000) {
    const thousands = value / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }

  return String(value);
};

const toShare = (value, target) => (target > 0 ? Math.min(100, (value / target) * 100) : 0);

// The stats' stickers, with the ledger folded in. Streak progress counts
// from the streak running now, since that is the one that can reach the
// next tier; the other families count from their totals.
export const mergeStickers = ({ achievements, ledger = {}, todayKey, currentStreak = 0 }) => {
  const families = (achievements?.families || []).map((family) => {
    const progressValue = family.key === "streak" ? currentStreak : family.current;
    let isNextAssigned = false;

    const tiers = family.tiers.map((tier) => {
      const kept = ledger[tier.id];
      const earned = tier.earned || Boolean(kept);
      const isNext = !earned && !isNextAssigned;

      if (isNext) {
        isNextAssigned = true;
      }

      return {
        ...tier,
        earned,
        // Dated from the log when that is possible; otherwise the day this
        // device first saw it earned.
        earnedOn: earned ? tier.earnedOn || kept?.on || todayKey : null,
        isDated: Boolean(tier.earnedOn),
        isNew: earned && !kept?.seen,
        isNext,
        progress: earned ? tier.target : Math.min(progressValue, tier.target),
        share: earned ? 100 : toShare(progressValue, tier.target),
      };
    });

    return { ...family, progressValue, tiers };
  });

  const all = families.flatMap((family) => family.tiers.map((tier) => ({ ...tier, family })));
  const earned = all.filter((tier) => tier.earned);

  return {
    families,
    earnedCount: earned.length,
    totalCount: all.length,
    newCount: earned.filter((tier) => tier.isNew).length,
    recent: [...earned].sort(
      (first, second) =>
        Number(second.isNew) - Number(first.isNew) ||
        String(second.earnedOn).localeCompare(String(first.earnedOn)) ||
        second.target - first.target,
    ),
    nextUp: all
      .filter((tier) => tier.isNext)
      .sort((first, second) => second.share - first.share || first.target - second.target),
  };
};

// The ledger after this visit: every earned sticker kept, all marked seen.
export const buildSeenLedger = (stickers) => {
  const ledger = {};

  stickers.families.forEach((family) =>
    family.tiers.forEach((tier) => {
      if (tier.earned) {
        ledger[tier.id] = { on: tier.earnedOn, seen: true };
      }
    }),
  );

  return ledger;
};
