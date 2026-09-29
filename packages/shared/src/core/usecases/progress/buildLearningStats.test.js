import { describe, expect, it } from "vitest";
import { buildLearningStats, resolveWordStage, toLocalDayKey } from "./buildLearningStats";

// Tuesday 29 September 2026, 15:00 local time.
const NOW = new Date(2026, 8, 29, 15, 0, 0).getTime();
const at = (dayOffset, hours = 12) => new Date(2026, 8, 29 + dayOffset, hours, 0, 0).getTime();
const dayKey = (dayOffset) => toLocalDayKey(at(dayOffset));

const log = (dayOffset, rating = "good", extra = {}) => ({
  reviewedAtMs: at(dayOffset),
  rating,
  ...extra,
});

describe("resolveWordStage", () => {
  it("places a word by its card", () => {
    expect(resolveWordStage(undefined)).toBe("new");
    expect(resolveWordStage({ state: "new" })).toBe("new");
    expect(resolveWordStage({ state: "learning" })).toBe("learning");
    expect(resolveWordStage({ state: "relearning" })).toBe("learning");
    expect(resolveWordStage({ state: "review", intervalDays: 20 })).toBe("young");
    expect(resolveWordStage({ state: "review", intervalDays: 21 })).toBe("mature");
  });
});

describe("buildLearningStats", () => {
  it("returns an empty, well-formed picture with no data", () => {
    const stats = buildLearningStats({ now: NOW });

    expect(stats.totalWords).toBe(0);
    expect(stats.known).toBe(0);
    expect(stats.dueNow).toBe(0);
    expect(stats.streak).toEqual({ current: 0, best: 0, isTodayDone: false });
    expect(stats.recall30d).toBeNull();
    expect(stats.forecast).toHaveLength(14);
    expect(stats.activity.days).toHaveLength(26 * 7);
    expect(stats.activity.reviews).toBe(0);
    expect(stats.goals.map((goal) => goal.key)).toEqual(["known", "streak", "mature"]);
  });

  it("counts stages per word and per deck", () => {
    const stats = buildLearningStats({
      now: NOW,
      decks: [
        { id: 1, name: "Spanish" },
        { id: 2, name: "German" },
      ],
      words: [
        { id: 1, deckId: 1 },
        { id: 2, deckId: 1 },
        { id: 3, deckId: 1 },
        { id: 4, deckId: 2 },
        { id: 5, deckId: 2 },
      ],
      reviewCards: [
        { wordId: 2, state: "learning", dueAtMs: at(0, 10) },
        { wordId: 3, state: "review", intervalDays: 30, dueAtMs: at(20) },
        { wordId: 4, state: "review", intervalDays: 3, dueAtMs: at(-2) },
      ],
    });

    expect(stats.totalWords).toBe(5);
    expect(stats.stages).toEqual({ new: 2, learning: 1, young: 1, mature: 1 });
    expect(stats.known).toBe(2);
    expect(stats.dueNow).toBe(2);

    const spanish = stats.decks.find((deck) => deck.id === 1);
    expect(spanish).toMatchObject({ words: 3, new: 1, learning: 1, mature: 1, known: 1, dueNow: 1 });

    const german = stats.decks.find((deck) => deck.id === 2);
    expect(german).toMatchObject({ words: 2, new: 1, young: 1, known: 1, dueNow: 1 });
  });

  it("puts overdue cards on today and leaves new words out of the forecast", () => {
    const stats = buildLearningStats({
      now: NOW,
      words: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5 }],
      reviewCards: [
        { wordId: 1, state: "review", intervalDays: 5, dueAtMs: at(-5) },
        { wordId: 2, state: "review", intervalDays: 5, dueAt: new Date(at(0, 20)).toISOString() },
        { wordId: 3, state: "review", intervalDays: 5, dueAtMs: at(3, 1) },
        { wordId: 4, state: "review", intervalDays: 40, dueAtMs: at(30) },
        { wordId: 5, state: "new", dueAtMs: at(-1) },
      ],
    });

    expect(stats.forecast[0]).toEqual({ date: dayKey(0), due: 2 });
    expect(stats.forecast[3]).toEqual({ date: dayKey(3), due: 1 });
    expect(stats.forecast.reduce((total, day) => total + day.due, 0)).toBe(3);
    expect(stats.dueNow).toBe(1);
  });

  it("keeps a streak alive until today is over", () => {
    const withoutToday = buildLearningStats({
      now: NOW,
      reviewLogs: [log(-1), log(-2), log(-3), log(-6), log(-7)],
    });

    expect(withoutToday.streak).toEqual({ current: 3, best: 3, isTodayDone: false });

    const withToday = buildLearningStats({
      now: NOW,
      reviewLogs: [log(0), log(-1), log(-2)],
    });

    expect(withToday.streak).toEqual({ current: 3, best: 3, isTodayDone: true });

    const broken = buildLearningStats({
      now: NOW,
      reviewLogs: [log(-2), log(-10), log(-11), log(-12), log(-13)],
    });

    expect(broken.streak).toEqual({ current: 0, best: 4, isTodayDone: false });
  });

  it("lays out the activity grid in whole weeks, Monday first, ending today", () => {
    const stats = buildLearningStats({
      now: NOW,
      weeks: 2,
      reviewLogs: [log(0), log(0), log(0), log(0), log(-1), { dayKey: dayKey(-8), rating: "again" }],
    });

    const { days } = stats.activity;
    expect(days).toHaveLength(14);
    // 29 September 2026 is a Tuesday: the grid starts on Monday the 21st.
    expect(days[0].date).toBe(dayKey(-8));
    expect(days[8].date).toBe(dayKey(0));
    expect(days.slice(9).every((day) => day === null)).toBe(true);
    expect(days[8]).toMatchObject({ reviews: 4, level: 4 });
    expect(days[7]).toMatchObject({ reviews: 1, level: 1 });
    expect(days[1]).toMatchObject({ reviews: 0, level: 0 });
    expect(stats.activity).toMatchObject({ maxReviews: 4, activeDays: 3, reviews: 6 });
    expect(stats.reviewsToday).toBe(4);
  });

  it("measures answers over the last 30 days against the 30 before", () => {
    const stats = buildLearningStats({
      now: NOW,
      reviewLogs: [
        log(0, "good"),
        log(-5, "again"),
        log(-10, "easy"),
        log(-29, "hard"),
        log(-30, "again"),
        log(-45, "good"),
        log(-70, "again"),
        log(2, "good"),
      ],
    });

    expect(stats.ratings30d).toEqual({ again: 1, hard: 1, good: 1, easy: 1, total: 4 });
    expect(stats.recall30d).toBe(75);
    expect(stats.recallPrevious30d).toBe(50);
  });

  it("sets the next goal above the current value", () => {
    const words = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));
    const stats = buildLearningStats({
      now: NOW,
      words,
      reviewCards: words.map((word) => ({ wordId: word.id, state: "review", intervalDays: 4, dueAtMs: at(4) })),
      reviewLogs: [log(0), log(-1), log(-2)],
    });

    expect(stats.goals).toEqual([
      { key: "known", current: 12, target: 25 },
      { key: "streak", current: 3, target: 7 },
      { key: "mature", current: 0, target: 10 },
    ]);
  });

  it("orders decks by this week's reviews, then by what is known", () => {
    const stats = buildLearningStats({
      now: NOW,
      decks: [
        { id: 1, name: "b" },
        { id: 2, name: "a" },
        { id: 3, name: "c" },
      ],
      words: [{ id: 1, deckId: 3 }],
      reviewCards: [{ wordId: 1, state: "review", intervalDays: 2, dueAtMs: at(1) }],
      reviewLogs: [log(-1, "good", { deckId: 1 }), log(-8, "good", { deckId: 2 })],
    });

    expect(stats.decks.map((deck) => deck.id)).toEqual([1, 3, 2]);
    expect(stats.decks[0].reviews7d).toBe(1);
    expect(stats.decks[2].reviews7d).toBe(0);
  });
});
