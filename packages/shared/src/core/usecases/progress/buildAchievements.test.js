import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_FAMILIES, buildAchievements } from "./buildAchievements";

const family = (result, key) => result.families.find((item) => item.key === key);
const tier = (result, key, target) => family(result, key).tiers.find((item) => item.target === target);

describe("buildAchievements", () => {
  it("lists every family and tier, none earned, with no data", () => {
    const result = buildAchievements({});

    expect(result.families.map((item) => item.key)).toEqual(ACHIEVEMENT_FAMILIES.map((item) => item.key));
    expect(result.families.flatMap((item) => item.tiers).every((item) => !item.earned)).toBe(true);
    expect(tier(result, "days", 1).description).toBe("Finish your first review.");
  });

  it("dates log-based tiers by the day they were crossed", () => {
    const result = buildAchievements({
      history: [
        { date: "2026-09-01", reviews: 60, again: 3 },
        { date: "2026-09-02", reviews: 25, again: 0 },
        { date: "2026-09-03", reviews: 20, again: 0 },
        { date: "2026-09-05", reviews: 10, again: 0 },
      ],
    });

    expect(family(result, "streak").current).toBe(3);
    expect(tier(result, "streak", 3)).toMatchObject({ earned: true, earnedOn: "2026-09-03" });
    expect(tier(result, "streak", 7)).toMatchObject({ earned: false, earnedOn: null });
    expect(tier(result, "days", 1).earnedOn).toBe("2026-09-01");
    expect(family(result, "reviews").current).toBe(115);
    expect(tier(result, "reviews", 100).earnedOn).toBe("2026-09-03");
    expect(tier(result, "bigDay", 50).earnedOn).toBe("2026-09-01");
    expect(family(result, "cleanSheet").current).toBe(2);
    expect(tier(result, "cleanSheet", 1).earnedOn).toBe("2026-09-02");
  });

  it("carries a streak across a month end", () => {
    const result = buildAchievements({
      history: ["2026-08-30", "2026-08-31", "2026-09-01"].map((date) => ({ date, reviews: 1, again: 0 })),
    });

    expect(family(result, "streak").current).toBe(3);
  });

  it("reads the rest from the words as they are, undated", () => {
    const result = buildAchievements({
      known: 55,
      stages: { mature: 12 },
      decks: [
        { words: 12, known: 12 },
        { words: 4, known: 4 },
        { words: 30, known: 29 },
      ],
    });

    expect(tier(result, "known", 50)).toMatchObject({ earned: true, earnedOn: null });
    expect(tier(result, "mature", 10).earned).toBe(true);
    expect(family(result, "decks").current).toBe(1);
  });
});
