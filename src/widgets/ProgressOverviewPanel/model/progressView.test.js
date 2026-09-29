import { describe, expect, it } from "vitest";
import {
  buildActivityColumns,
  buildRecallDelta,
  describeNextDue,
  describeStreak,
  resolveAgeBucket,
  resolveBusiestDeck,
} from "./progressView";
import { buildI18nValue, ENGLISH_MESSAGES } from "@shared/lib/i18n";

const en = buildI18nValue("en", ENGLISH_MESSAGES);

const day = (date, reviews = 0) => ({ date, reviews, level: reviews > 0 ? 1 : 0 });

describe("progress view", () => {
  it("labels a column with the month that starts in it", () => {
    const days = [
      day("2026-08-24"), day("2026-08-25"), day("2026-08-26"), day("2026-08-27"),
      day("2026-08-28"), day("2026-08-29"), day("2026-08-30"),
      day("2026-08-31"), day("2026-09-01"), day("2026-09-02"), day("2026-09-03"),
      day("2026-09-04"), day("2026-09-05"), day("2026-09-06"),
      day("2026-09-07"), null, null, null, null, null, null,
    ];
    const columns = buildActivityColumns({ days }, en);

    expect(columns.map((column) => column.age)).toEqual([2, 1, 0]);
    // The second week starts on 31 August; its first day decides the label.
    expect(columns.map((column) => column.monthLabel)).toEqual(["", "", "Sep"]);
  });

  it("buckets weeks by how many a screen keeps", () => {
    expect([0, 16, 17, 25, 26, 38, 39, 52].map(resolveAgeBucket)).toEqual([
      "0", "0", "17", "17", "26", "26", "39", "39",
    ]);
  });

  it("says when the next reviews come", () => {
    const forecast = (dues) => dues.map((due, index) => ({ date: `2026-10-0${index + 1}`, due }));

    expect(describeNextDue(forecast([0, 4, 0]), en)).toBe("Next: 4 cards tomorrow.");
    expect(describeNextDue(forecast([0, 0, 0, 1]), en)).toBe("Next: 1 card on Sun, in 3 days.");
    expect(describeNextDue(forecast([3, 0, 0]), en)).toBe("Nothing is due in the next two weeks.");
  });

  it("talks about the streak the way the day stands", () => {
    expect(describeStreak({ current: 4, isTodayDone: true }, 12, en)).toBe("12 reviews today. Day 4 of your streak.");
    expect(describeStreak({ current: 1, isTodayDone: true }, 1, en)).toBe("1 review today.");
    expect(describeStreak({ current: 6, isTodayDone: false }, 0, en)).toBe("Review today to keep your 6-day streak.");
    expect(describeStreak({ current: 0, isTodayDone: false }, 0, en)).toBe("A review today starts a streak.");
  });

  it("compares recall in whole points, or not at all", () => {
    expect(buildRecallDelta(82.4, 78, en)).toMatchObject({ points: 4, direction: "up" });
    expect(buildRecallDelta(70, 71.2, en)).toMatchObject({
      points: -1,
      direction: "down",
      label: "1 point lower than the 30 days before",
    });
    expect(buildRecallDelta(80, 80.2, en).direction).toBe("flat");
    expect(buildRecallDelta(80, null, en)).toBeNull();
  });

  it("picks the deck with most cards due", () => {
    expect(resolveBusiestDeck([{ id: 1, dueNow: 2 }, { id: 2, dueNow: 5 }, { id: 3, dueNow: 0 }]).id).toBe(2);
    expect(resolveBusiestDeck([{ id: 1, dueNow: 0 }])).toBeNull();
  });
});

describe("deck order", () => {
  const decks = [
    { name: "Deck 10", dueNow: 2, reviews7d: 9 },
    { name: "deck 2", dueNow: 5, reviews7d: 1 },
    { name: "Alpha", dueNow: 5, reviews7d: 3 },
  ];

  it("keeps the stats' order for Active, and sorts Due and A–Z", async () => {
    const { sortDeckRows } = await import("./progressView");

    expect(sortDeckRows(decks, "active").map((deck) => deck.name)).toEqual(["Deck 10", "deck 2", "Alpha"]);
    expect(sortDeckRows(decks, "due").map((deck) => deck.name)).toEqual(["Alpha", "deck 2", "Deck 10"]);
    expect(sortDeckRows(decks, "name").map((deck) => deck.name)).toEqual(["Alpha", "deck 2", "Deck 10"]);
  });
});
