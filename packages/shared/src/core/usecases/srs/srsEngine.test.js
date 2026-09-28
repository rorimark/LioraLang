import { describe, expect, it } from "vitest";
import {
  buildSrsSessionSnapshot,
  buildRatingPreview,
  normalizeReviewCard,
  normalizeSrsSettings,
  normalizeStudySettings,
  resolveScheduleOutcome,
  getCardRevision,
  assertGradeAllowed,
} from "./srsEngine.js";

const NOW = Date.UTC(2026, 8, 28, 12);
const MINUTE = 60_000;
const DAY = 1440 * MINUTE;
const grade = (card, rating, options = {}) =>
  resolveScheduleOutcome({ card, rating, nowMs: NOW, ...options });
const review = {
  state: "review",
  intervalDays: 10,
  easeFactor: 2.5,
  dueAtMs: NOW,
  reps: 8,
  lapses: 1,
};
const words = [1, 2, 3, 4].map((id) => ({
  id,
  source: `word ${id}`,
  target: `translation ${id}`,
}));
const snapshot = (options = {}) =>
  buildSrsSessionSnapshot({
    deck: {
      id: 1,
      name: "Test",
      sourceLanguage: "English",
      targetLanguage: "Polish",
    },
    words,
    cardsByWordId: new Map(),
    nowMs: NOW,
    ...options,
  });

describe("SRS settings and legacy card compatibility", () => {
  it("defaults to short learning steps and permits pausing new cards", () => {
    expect(normalizeSrsSettings({ newCardsPerDay: 0 })).toMatchObject({
      newCardsPerDay: 0,
      learningStepsMinutes: [10],
      lapsePenalty: 0.2,
    });
  });
  it("preserves custom steps, sorts them, and removes invalid or duplicate steps", () => {
    expect(
      normalizeSrsSettings({ learningSteps: "3d, rubbish, 10m, -2, 1h, 10m" })
        .learningStepsMinutes,
    ).toEqual([10, 60, 4320]);
  });
  it("can normalize its own output without changing percentages or steps", () => {
    const settings = normalizeSrsSettings({
      learningSteps: "2m, 15m",
      easyBonus: 150,
      lapsePenalty: 0,
    });
    expect(normalizeSrsSettings(settings)).toEqual(settings);
  });
  it("reads old ISO dates and does not interpret null timestamps as 1970", () => {
    expect(
      normalizeReviewCard({
        state: "review",
        dueAtMs: null,
        dueAt: new Date(NOW).toISOString(),
      }).dueAtMs,
    ).toBe(NOW);
    expect(
      normalizeReviewCard({ dueAt: null, dueAtMs: null }).dueAtMs,
    ).toBeNull();
    expect(normalizeReviewCard({ dueAtMs: 0 }).dueAt).toBe(
      "1970-01-01T00:00:00.000Z",
    );
  });
  it("stabilizes malformed cards", () => {
    expect(
      normalizeReviewCard({
        state: "broken",
        intervalDays: -1,
        easeFactor: 99,
        reps: -1,
        lapses: "oops",
      }),
    ).toMatchObject({
      state: "new",
      intervalDays: 0,
      easeFactor: 3,
      reps: 0,
      lapses: 0,
      dueAtMs: null,
    });
  });
});

describe("learning and relearning", () => {
  it("has clear first-answer intervals", () => {
    expect(buildRatingPreview({ card: { state: "new" }, nowMs: NOW })).toEqual({
      again: "10m",
      hard: "1d",
      good: "3d",
      easy: "7d",
    });
    expect(grade({}, "good")).toMatchObject({
      state: "review",
      intervalDays: 3,
    });
    expect(grade({}, "hard")).toMatchObject({
      state: "review",
      intervalDays: 1,
      dueAtMs: NOW + DAY,
    });
  });
  it("advances Good through custom learning steps into a three-day review", () => {
    const srsSettings = { learningSteps: "1m, 10m" };
    const learning = grade({}, "good", { srsSettings });
    expect(learning).toMatchObject({
      state: "learning",
      learningStep: 1,
      dueAtMs: NOW + 10 * MINUTE,
      reps: 1,
    });
    const graduated = grade(learning, "good", {
      nowMs: learning.dueAtMs,
      srsSettings,
    });
    expect(graduated).toMatchObject({
      state: "review",
      intervalDays: 3,
      dueAtMs: learning.dueAtMs + 3 * DAY,
      reps: 2,
    });
    const next = grade(graduated, "good", { nowMs: graduated.dueAtMs });
    expect(next.intervalDays).toBeGreaterThan(graduated.intervalDays);
  });
  it("never penalizes ease or increments lapses while first learning", () => {
    let card = {};
    for (let i = 0; i < 20; i += 1)
      card = grade(card, i % 2 ? "hard" : "again", {
        srsSettings: { learningSteps: "1m, 10m" },
      });
    expect(card).toMatchObject({
      easeFactor: 2.5,
      lapses: 0,
      reps: 20,
      state: "learning",
    });
  });
  it("resets the step on Again and keeps the current step on Hard", () => {
    const learning = { state: "learning", learningStep: 1, reps: 2 };
    expect(
      grade(learning, "again", { srsSettings: { learningSteps: "1m, 10m" } }),
    ).toMatchObject({ learningStep: 0, dueAtMs: NOW + MINUTE });
    expect(
      grade(learning, "hard", { srsSettings: { learningSteps: "1m, 10m" } }),
    ).toMatchObject({ learningStep: 1, dueAtMs: NOW + 15 * MINUTE });
  });
  it("keeps a pause even with repeat-missed enabled", () => {
    expect(
      grade(review, "again", { studySettings: { repeatWrongCards: true } })
        .dueAtMs,
    ).toBe(NOW + MINUTE);
  });
  it("counts one lapse, then uses a short relearning step with the retained interval", () => {
    const forgotten = grade(review, "again");
    expect(forgotten).toMatchObject({
      state: "relearning",
      dueAtMs: NOW + 10 * MINUTE,
      intervalDays: 2,
      lapses: 2,
      reps: 9,
      easeFactor: 2.3,
    });
    const failedAgain = grade(forgotten, "again", { nowMs: forgotten.dueAtMs });
    expect(failedAgain).toMatchObject({ lapses: 2, easeFactor: 2.3 });
    const remembered = grade(failedAgain, "good", {
      nowMs: failedAgain.dueAtMs,
    });
    expect(remembered).toMatchObject({ state: "review", intervalDays: 2 });
  });
  it("handles legacy long steps and changed step lists without shrinking the graduation interval", () => {
    const settings = normalizeSrsSettings({ learningSteps: "10m, 1d, 3d" });
    const card = { state: "learning", learningStep: 2 };
    const hard = grade(card, "hard", { srsSettings: settings });
    const good = grade(card, "good", { srsSettings: settings });
    expect(good.dueAtMs).toBeGreaterThan(hard.dueAtMs);
    expect(grade(card, "good").state).toBe("review");
  });
  it("Easy graduates immediately from any learning step", () => {
    for (const state of ["new", "learning", "relearning"])
      expect(grade({ state }, "easy")).toMatchObject({
        state: "review",
        intervalDays: 7,
      });
  });
});

describe("review scheduling", () => {
  it("orders Hard < Good < Easy and grows even one-day intervals", () => {
    for (const intervalDays of [1, 2, 10, 100]) {
      const card = { ...review, intervalDays, easeFactor: 1.3 };
      const hard = grade(card, "hard").intervalDays;
      const good = grade(card, "good").intervalDays;
      const easy = grade(card, "easy").intervalDays;
      expect(hard).toBeGreaterThan(intervalDays);
      expect(good).toBeGreaterThan(hard);
      expect(easy).toBeGreaterThan(good);
    }
  });
  it("accounts for successful overdue recall but does not reward a lapse", () => {
    const overdue = { ...review, dueAtMs: NOW - 10 * DAY };
    expect(grade(overdue, "good").intervalDays).toBeGreaterThan(
      grade(review, "good").intervalDays,
    );
    expect(grade(overdue, "again").intervalDays).toBe(
      grade(review, "again").intervalDays,
    );
    expect(grade(overdue, "hard").intervalDays).toBe(
      grade(review, "hard").intervalDays,
    );
  });
  it("caps long intervals and always schedules a finite future date", () => {
    for (const state of ["new", "learning", "review", "relearning"]) {
      for (const rating of ["again", "hard", "good", "easy"]) {
        const result = grade({ ...review, state, intervalDays: 36500 }, rating);
        expect(result.intervalDays).toBeLessThanOrEqual(36500);
        expect(result.dueAtMs).toBeGreaterThan(NOW);
        expect(Date.parse(result.dueAt)).toBe(result.dueAtMs);
      }
    }
  });
  it("rejects invalid ratings", () =>
    expect(() => grade({}, "oops")).toThrow("Unsupported SRS rating"));
  it("uses exactly the same schedule for previews and writes", () => {
    const previews = buildRatingPreview({ card: review, nowMs: NOW });
    expect(previews).toEqual({
      again: "10m",
      hard: "12d",
      good: "25d",
      easy: "33d",
    });
    expect(grade(review, "good").dueAtMs).toBe(NOW + 25 * DAY);
  });
});

describe("due queue and daily limits", () => {
  it("prioritizes due learning, then oldest due reviews, then new words", () => {
    const cards = new Map([
      [2, { ...review, dueAtMs: NOW - DAY }],
      [3, { state: "learning", dueAtMs: NOW }],
      [4, { ...review, dueAtMs: NOW - 2 * DAY }],
    ]);
    expect(snapshot({ cardsByWordId: cards }).card.wordId).toBe(3);
    cards.set(3, { ...cards.get(3), dueAtMs: NOW + MINUTE });
    expect(snapshot({ cardsByWordId: cards }).card.wordId).toBe(4);
  });
  it("does not turn the daily goal into a hard stop", () => {
    const session = snapshot({
      todayLogs: [{ wordId: 4, queueType: "review" }],
      studySettings: { dailyGoal: 1 },
    });
    expect(session.card).not.toBeNull();
    expect(session.limits.dailyLeft).toBe(0);
  });
  it("counts distinct cards and keeps answer count separate", () => {
    const session = snapshot({
      todayLogs: [
        { wordId: 1, queueType: "new" },
        { wordId: 1, queueType: "learning" },
        { wordId: 2, queueType: "review" },
        { wordId: 2, queueType: "review" },
      ],
    });
    expect(session.stats).toMatchObject({
      totalStudiedToday: 2,
      newStudiedToday: 1,
      reviewedToday: 1,
      answersToday: 4,
    });
  });
  it("offers extra study when limits block cards, without inventing due cards", () => {
    const session = snapshot({
      srsSettings: { newCardsPerDay: 0, maxReviewsPerDay: 0 },
    });
    expect(session.card).toBeNull();
    expect(session.stats.dueTotal).toBe(0);
    expect(session.completionState).toMatchObject({
      reason: "daily-limit",
      canStartNewSession: true,
    });
    expect(
      snapshot({ srsSettings: { newCardsPerDay: 0 }, forceAllCards: true })
        .card,
    ).not.toBeNull();
  });
  it("learning continues after both card limits are exhausted", () => {
    const session = snapshot({
      cardsByWordId: new Map([[2, { state: "relearning", dueAtMs: NOW }]]),
      srsSettings: { newCardsPerDay: 0, maxReviewsPerDay: 0 },
    });
    expect(session.card.wordId).toBe(2);
    expect(session.stats.dueTotal).toBe(1);
  });
  it("extra sessions finish and never fetch future cards", () => {
    const session = snapshot({
      words: words.slice(0, 1),
      cardsByWordId: new Map([[1, { ...review, dueAtMs: NOW + DAY }]]),
      forceAllCards: true,
    });
    expect(session.card).toBeNull();
    expect(session.completionState).toMatchObject({
      done: true,
      reason: "empty-queue",
      canStartNewSession: false,
    });
    expect(session.nextDueAt).toBe(new Date(NOW + DAY).toISOString());
  });
  it("reports waiting learning separately and releases it exactly when due", () => {
    const options = {
      words: words.slice(0, 1),
      cardsByWordId: new Map([[1, grade({}, "again")]]),
    };
    expect(snapshot(options)).toMatchObject({
      card: null,
      completionState: { reason: "learning-wait" },
      stats: { waitingLearning: 1 },
      nextLearningDueAt: new Date(NOW + 10 * MINUTE).toISOString(),
    });
    expect(snapshot({ ...options, nowMs: NOW + 10 * MINUTE }).card.wordId).toBe(
      1,
    );
  });
  it("per-session shuffle is stable for a seed and changes between seeds", () => {
    const biggerDeck = Array.from({ length: 40 }, (_, i) => ({ id: i + 1 }));
    const choose = (seed) =>
      snapshot({
        words: biggerDeck,
        studySettings: { shuffleMode: "per_session", shuffleSeed: seed },
      }).card.wordId;
    expect(choose(123)).toBe(choose(123));
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map(choose)).size).toBeGreaterThan(
      1,
    );
  });
  it("preserves language labels and handles empty decks", () => {
    expect(snapshot().deck).toMatchObject({
      sourceLanguage: "English",
      targetLanguage: "Polish",
    });
    expect(snapshot({ words: [] }).completionState.reason).toBe("empty-deck");
  });
  it("returns a finite extra session for a complete pass through a deck", () => {
    const cardsByWordId = new Map();
    let session = snapshot({ cardsByWordId, forceAllCards: true });
    let answered = 0;
    while (session.card && answered < 20) {
      cardsByWordId.set(session.card.wordId, grade(session.card, "good"));
      answered += 1;
      session = snapshot({ cardsByWordId, forceAllCards: true });
    }
    expect(answered).toBe(words.length);
    expect(session.card).toBeNull();
  });
});

describe("stale-answer protection", () => {
  it("rejects a second submission with the same revision", () => {
    const revision = getCardRevision({});
    expect(() =>
      assertGradeAllowed({ card: {}, expectedRevision: revision, nowMs: NOW }),
    ).not.toThrow();
    expect(() =>
      assertGradeAllowed({
        card: grade({}, "good"),
        expectedRevision: revision,
        nowMs: NOW,
      }),
    ).toThrow("progress changed");
  });
  it("rejects future reviews even without a revision", () => {
    expect(() =>
      assertGradeAllowed({
        card: { ...review, dueAtMs: NOW + DAY },
        nowMs: NOW,
      }),
    ).toThrow("not due");
  });
  it("keeps study settings normalization compatible", () => {
    expect(
      normalizeStudySettings({ shuffleMode: "always", shuffleSeed: 99 }),
    ).toMatchObject({ shuffleMode: "always", shuffleSeed: null });
  });
});
