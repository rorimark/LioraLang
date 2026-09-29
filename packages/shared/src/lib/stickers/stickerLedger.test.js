import { describe, expect, it } from "vitest";
import { buildAchievements } from "@shared/core/usecases/progress";
import { buildSeenLedger, formatStickerValue, mergeStickers } from "./stickerLedger";

const tierOf = (stickers, id) => stickers.families.flatMap((family) => family.tiers).find((tier) => tier.id === id);

describe("sticker ledger", () => {
  it("keeps a sticker once earned, even when its number falls again", () => {
    const stickers = mergeStickers({
      achievements: buildAchievements({ known: 4 }),
      ledger: { "known-10": { on: "2026-09-01", seen: true } },
      todayKey: "2026-09-29",
    });

    expect(tierOf(stickers, "known-10")).toMatchObject({ earned: true, earnedOn: "2026-09-01", isNew: false, isDated: false });
    expect(tierOf(stickers, "known-50")).toMatchObject({ earned: false, isNext: true, progress: 4 });
  });

  it("marks what was not seen before as new, dated from the log when it can be", () => {
    const stickers = mergeStickers({
      achievements: buildAchievements({ known: 12, history: [{ date: "2026-09-20", reviews: 3, again: 0 }] }),
      ledger: {},
      todayKey: "2026-09-29",
    });

    expect(tierOf(stickers, "known-10")).toMatchObject({ isNew: true, earnedOn: "2026-09-29" });
    expect(tierOf(stickers, "days-1")).toMatchObject({ isNew: true, earnedOn: "2026-09-20", isDated: true });
    expect(stickers.newCount).toBe(2);
    expect(buildSeenLedger(stickers)).toEqual({
      "known-10": { on: "2026-09-29", seen: true },
      "days-1": { on: "2026-09-20", seen: true },
    });
  });

  it("measures the next streak sticker by the streak running now", () => {
    const stickers = mergeStickers({
      achievements: buildAchievements({
        history: ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"].map((date) => ({ date, reviews: 1, again: 0 })),
      }),
      todayKey: "2026-09-29",
      currentStreak: 0,
    });

    expect(tierOf(stickers, "streak-3").earned).toBe(true);
    expect(tierOf(stickers, "streak-7")).toMatchObject({ isNext: true, progress: 0, share: 0 });
  });

  it("writes large targets short", () => {
    expect([10, 1000, 2500, 50000].map(formatStickerValue)).toEqual(["10", "1k", "2.5k", "50k"]);
  });
});
