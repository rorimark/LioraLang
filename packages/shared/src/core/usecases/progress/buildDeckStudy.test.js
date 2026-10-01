import { describe, expect, it } from "vitest";
import { buildDeckStudy } from "./buildDeckStudy.js";

const NOW = Date.parse("2026-10-01T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

describe("buildDeckStudy", () => {
  const words = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }];
  const reviewCards = [
    { wordId: 2, state: "learning", dueAtMs: NOW - 1000, lapses: 2, reps: 3 },
    { wordId: 3, state: "review", intervalDays: 4, dueAt: new Date(NOW + 2 * DAY).toISOString() },
    { wordId: 4, state: "review", intervalDays: 40, dueAtMs: NOW + 30 * DAY, lastReviewedAtMs: NOW - DAY },
    { wordId: 5, state: "new" },
  ];

  it("puts each word on its stage and says which are due", () => {
    const study = buildDeckStudy({ words, reviewCards, now: NOW });

    expect(study.totalWords).toBe(5);
    expect(study.stages).toEqual({ new: 2, learning: 1, young: 1, mature: 1 });
    expect(study.known).toBe(2);
    expect(study.dueNow).toBe(1);
    expect(study.words[1]).toMatchObject({ stage: "new", isDue: false, dueAtMs: null });
    expect(study.words[2]).toMatchObject({ stage: "learning", isDue: true, lapses: 2, reps: 3 });
    expect(study.words[4]).toMatchObject({ stage: "mature", lastReviewedAtMs: NOW - DAY });
  });

  it("names the next review when nothing is due", () => {
    const study = buildDeckStudy({ words, reviewCards: reviewCards.slice(1), now: NOW });

    expect(study.dueNow).toBe(0);
    expect(study.nextDueAtMs).toBe(NOW + 2 * DAY);
  });

  it("reads the review log: last week, recall and the last session", () => {
    const reviewLogs = [
      { reviewedAtMs: NOW - DAY, rating: "good" },
      { reviewedAtMs: NOW - 2 * DAY, rating: "again" },
      { reviewedAt: new Date(NOW - 10 * DAY).toISOString(), rating: "good" },
      { dayKey: "2026-09-21", rating: "easy" },
      { reviewedAtMs: NOW - 90 * DAY, rating: "again" },
    ];
    const study = buildDeckStudy({ words, reviewCards, reviewLogs, now: NOW });

    expect(study.reviews7d).toBe(2);
    expect(study.reviewsTotal).toBe(5);
    expect(study.recall30d).toBe(75);
    expect(study.lastReviewedAtMs).toBe(NOW - DAY);
  });

  it("has no recall without recent reviews", () => {
    expect(buildDeckStudy({ words: [] , now: NOW })).toMatchObject({ totalWords: 0, recall30d: null, lastReviewedAtMs: null });
  });
});
