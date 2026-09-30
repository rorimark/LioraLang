import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeWebDbConnection } from "@shared/platform/web/db/webDb.js";
import {
  WEB_DB_STORES,
  runReadonlyTransaction,
  idbRequest,
} from "@shared/platform/web/db";
import { createWebDeckRepository } from "./createWebDeckRepository.js";
import { createWebSrsRepository } from "./createWebSrsRepository.js";
import { createWebSyncLocalRepository } from "./createWebSyncLocalRepository.js";

vi.mock("@shared/api", () => ({
  getCurrentSupabaseAuthUser: vi.fn(async () => null),
}));
const reset = async () => {
  await closeWebDbConnection();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("lioralang-web");
    request.onsuccess = resolve;
    request.onerror = () => reject(request.error);
  });
};
const NOW = Date.UTC(2026, 8, 28, 12);
let now;
let deckId;
let repository;
const settings = {
  spacedRepetition: { learningSteps: "1m, 10m" },
  studySession: { dailyGoal: 1 },
};
const ratePayload = (session, rating) => ({
  deckId,
  wordId: session.card.wordId,
  rating,
  settings,
  expectedRevision: session.card.revision,
  expectedProfileScope: session.profileScope,
});
const readAll = (name) =>
  runReadonlyTransaction([name], ({ getStore }) =>
    idbRequest(getStore(name).getAll()),
  );

beforeEach(async () => {
  now = NOW;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  await reset();
  const saved = await createWebDeckRepository().saveDeck({
    name: "SRS test",
    sourceLanguage: "English",
    targetLanguage: "Polish",
    words: [
      { source: "one", target: "jeden" },
      { source: "two", target: "dwa" },
    ],
  });
  deckId = saved.deck.id;
  repository = createWebSrsRepository();
});
afterEach(async () => {
  await reset();
  vi.restoreAllMocks();
});

describe("web SRS persistence", () => {
  it("persists learning, restores after reopening, and continues past the goal", async () => {
    const first = await repository.getSrsSession(deckId, settings);
    const second = await repository.gradeSrsCard(ratePayload(first, "good"));
    expect(second.card.wordId).not.toBe(first.card.wordId);
    expect(second.limits.dailyLeft).toBe(0);
    const waiting = await repository.gradeSrsCard(ratePayload(second, "good"));
    expect(waiting.card).toBeNull();
    expect(waiting.stats).toMatchObject({
      totalStudiedToday: 2,
      answersToday: 2,
      waitingLearning: 2,
    });
    await closeWebDbConnection();
    repository = createWebSrsRepository();
    now += 10 * 60_000;
    const due = await repository.getSrsSession(deckId, settings);
    expect(due.card.wordId).toBe(first.card.wordId);
    const after = await repository.gradeSrsCard(ratePayload(due, "good"));
    expect(after.stats).toMatchObject({
      totalStudiedToday: 2,
      answersToday: 3,
    });
    const cards = await readAll(WEB_DB_STORES.reviewCards);
    const learned = cards.find((card) => card.wordId === first.card.wordId);
    expect(learned).toMatchObject({ state: "review", reps: 2 });
    // Two Goods on one day: about four days, spread a little per word.
    expect(learned.intervalDays).toBeGreaterThanOrEqual(3);
    expect(learned.intervalDays).toBeLessThanOrEqual(6);
    // The FSRS memory is stored with the card.
    expect(learned.stability).toBeGreaterThan(3);
    expect(learned.difficulty).toBeGreaterThanOrEqual(1);
    expect(learned.lastReviewedAtMs).toBe(now);
    const logs = await readAll(WEB_DB_STORES.reviewLogs);
    expect(logs).toHaveLength(3);
    expect(logs[2].payload.nextCard.state).toBe("review");
    expect(logs[2].syncStatus).toBe("pending");
  });
  it("keeps the FSRS memory when cards are rebuilt from the review log", async () => {
    const first = await repository.getSrsSession(deckId, settings);
    await repository.gradeSrsCard(ratePayload(first, "easy"));
    const [graded] = (await readAll(WEB_DB_STORES.reviewCards)).filter(
      (card) => card.wordId === first.card.wordId,
    );
    expect(graded.stability).toBeGreaterThan(10);

    // Sync and profile switches rebuild cards from the log's last answer.
    await createWebSyncLocalRepository().activateProfile("guest:default", { force: true });
    const [rebuilt] = (await readAll(WEB_DB_STORES.reviewCards)).filter(
      (card) => card.wordId === first.card.wordId,
    );
    expect(rebuilt).toMatchObject({
      state: "review",
      stability: graded.stability,
      difficulty: graded.difficulty,
      lastReviewedAtMs: graded.lastReviewedAtMs,
    });
  });
  it("prevents stale duplicate writes inside the transaction", async () => {
    const first = await repository.getSrsSession(deckId, settings);
    const payload = ratePayload(first, "again");
    await repository.gradeSrsCard(payload);
    await expect(repository.gradeSrsCard(payload)).rejects.toThrow(
      "progress changed",
    );
    expect(await readAll(WEB_DB_STORES.reviewLogs)).toHaveLength(1);
    const [card] = await readAll(WEB_DB_STORES.reviewCards);
    expect(card).toMatchObject({ reps: 1, easeFactor: 2.5 });
    expect(card.dueAtMs).toBe(NOW + 60_000);
  });
  it("rejects account mismatches before changing progress", async () => {
    const session = await repository.getSrsSession(deckId, settings);
    await expect(
      repository.gradeSrsCard({
        ...ratePayload(session, "good"),
        expectedProfileScope: "user:another-account",
      }),
    ).rejects.toThrow("account changed");
    expect(await readAll(WEB_DB_STORES.reviewLogs)).toHaveLength(0);
  });
  it("extra study stops when every card has a future due date", async () => {
    const options = { forceAllCards: true };
    let session = await repository.getSrsSession(deckId, settings, options);
    session = await repository.gradeSrsCard({
      ...ratePayload(session, "easy"),
      ...options,
    });
    session = await repository.gradeSrsCard({
      ...ratePayload(session, "easy"),
      ...options,
    });
    expect(session.card).toBeNull();
    // Easy on a new word: about sixteen days, spread a little per word; the
    // session names the earlier of the two.
    const cards = await readAll(WEB_DB_STORES.reviewCards);
    const earliest = Math.min(...cards.map((card) => card.dueAtMs));
    expect(session.nextDueAt).toBe(new Date(earliest).toISOString());
    expect(earliest - NOW).toBeGreaterThanOrEqual(13 * 86400_000);
    expect(earliest - NOW).toBeLessThanOrEqual(19 * 86400_000);
    expect(session.completionState.reason).toBe("empty-queue");
  });
});
