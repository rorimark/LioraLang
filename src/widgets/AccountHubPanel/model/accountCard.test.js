import { describe, expect, it } from "vitest";
import { CARD_ACTIVITY_WEEKS, buildCardNumber, buildCardStats, formatMemberSince, resolveCardName, resolveInitial } from "./accountCard";

describe("learner card", () => {
  it("makes a stable card number from the account id", () => {
    expect(buildCardNumber("1a2b3c4d-0000-4000-8000-000000000000")).toBe("LL 1A2B 3C4D");
    expect(buildCardNumber("")).toBe("");
  });

  it("says since when, or nothing", () => {
    expect(formatMemberSince("2026-09-01T10:00:00Z")).toBe("Sep 2026");
    expect(formatMemberSince(undefined)).toBe("");
  });

  it("names the card by display name, then by email", () => {
    expect(resolveCardName({ displayName: "  Mark ", email: "m@x.io" })).toBe("Mark");
    expect(resolveCardName({ displayName: "", email: "mark.s@example.com" })).toBe("mark.s");
    expect(resolveCardName({})).toBe("");
    expect(resolveInitial("mark")).toBe("M");
  });

  it("takes the numbers, three latest stickers and the last weeks of activity", () => {
    const days = Array.from({ length: 53 * 7 }, (_, index) => ({ date: String(index), level: 0 }));
    const stats = buildCardStats({
      overview: { known: 142, streak: { current: 11 }, activity: { days } },
      stickers: { earnedCount: 8, totalCount: 52, recent: [1, 2, 3, 4] },
    });

    expect(stats).toMatchObject({ known: 142, streak: 11, stickersEarned: 8, stickersTotal: 52, recentStickers: [1, 2, 3] });
    expect(stats.activity).toHaveLength(CARD_ACTIVITY_WEEKS * 7);
    expect(stats.activity[0].date).toBe(String((53 - CARD_ACTIVITY_WEEKS) * 7));
  });
});
