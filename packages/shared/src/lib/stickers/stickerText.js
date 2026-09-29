// What a sticker says, in the interface's language. The stats only know a
// family's key and a tier's target; the words are in the catalogues under
// stickers.<family>. Takes the value useI18n() returns.

import { CLEAN_SHEET_MIN_REVIEWS, MASTERED_DECK_MIN_WORDS } from "@shared/core/usecases/progress";

// Families whose first tier is said differently ("Finish your first
// review", not "Study on 1 different days").
const FIRST_TIER_GOALS = new Set(["days", "cleanSheet", "decks"]);

const MINIMUMS = { cleanSheet: CLEAN_SHEET_MIN_REVIEWS, decks: MASTERED_DECK_MIN_WORDS };

export const stickerTitle = ({ t }, familyKey) => t(`stickers.${familyKey}.title`);

export const stickerUnit = ({ t }, familyKey, count) => t(`stickers.${familyKey}.unit`, { count });

export const stickerGoal = ({ t }, tier) => {
  const key = tier.target === 1 && FIRST_TIER_GOALS.has(tier.family) ? "goalFirst" : "goal";
  return t(`stickers.${tier.family}.${key}`, { count: tier.target, min: MINIMUMS[tier.family] ?? 0 });
};

// Earned when, or how far along.
export const stickerStatus = (i18n, tier) => {
  const { t, formatDate } = i18n;

  if (tier.earned) {
    const [year, month, day] = String(tier.earnedOn || "").split("-").map(Number);
    const date = formatDate(new Date(year, (month || 1) - 1, day || 1), { month: "short", day: "numeric", year: "numeric" });
    return t(tier.isDated ? "stickers.earnedOn" : "stickers.earnedBy", { date });
  }

  return t("stickers.progress", {
    progress: i18n.formatNumber(tier.progress),
    target: i18n.formatNumber(tier.target),
    unit: stickerUnit(i18n, tier.family, tier.target),
    count: Math.max(0, tier.target - tier.progress),
  });
};
