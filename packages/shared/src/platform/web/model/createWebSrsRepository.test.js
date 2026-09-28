import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { closeWebDbConnection } from "@shared/platform/web/db/webDb.js";
import {
  WEB_DB_STORES,
  runReadonlyTransaction,
  idbRequest,
} from "@shared/platform/web/db";
import { createWebDeckRepository } from "./createWebDeckRepository.js";
import { createWebSrsRepository } from "./createWebSrsRepository.js";

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
    expect(
      cards.find((card) => card.wordId === first.card.wordId),
    ).toMatchObject({ state: "review", intervalDays: 3, reps: 2 });
    const logs = await readAll(WEB_DB_STORES.reviewLogs);
    expect(logs).toHaveLength(3);
    expect(logs[2].payload.nextCard.state).toBe("review");
    expect(logs[2].syncStatus).toBe("pending");
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
    expect(session.nextDueAt).toBe(new Date(NOW + 7 * 86400_000).toISOString());
    expect(session.completionState.reason).toBe("empty-queue");
  });
});
