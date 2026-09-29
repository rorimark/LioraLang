import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSrsSession } from "./useSrsSession";

const settings = { spacedRepetition: { newCardsPerDay: 20 } };
const session = (wordId = 1) => ({
  deck: { id: 1 },
  profileScope: "guest:default",
  sessionMode: "default",
  card: { wordId, revision: `revision-${wordId}` },
  completionState: { done: false, canStartNewSession: false },
});
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const setup = (repository, extra = {}) =>
  renderHook((props) => useSrsSession(props), {
    initialProps: {
      deckId: "1",
      enabled: true,
      settings,
      repository,
      ...extra,
    },
  });
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("SRS session lifecycle", () => {
  it("ignores cached snapshots and loads a fresh session on every mount", async () => {
    sessionStorage.setItem(
      "learnSessionCache",
      JSON.stringify({ stale: session(999) }),
    );
    const repository = { getSrsSession: vi.fn().mockResolvedValue(session(2)) };
    const hook = setup(repository);
    await waitFor(() =>
      expect(hook.result.current.session.card?.wordId).toBe(2),
    );
    hook.unmount();
    repository.getSrsSession.mockResolvedValue(session(3));
    const second = setup(repository);
    await waitFor(() =>
      expect(second.result.current.session.card?.wordId).toBe(3),
    );
  });
  it("locks simultaneous submissions and sends card/profile revisions", async () => {
    const write = deferred();
    const repository = {
      getSrsSession: vi.fn().mockResolvedValue(session()),
      gradeSrsCard: vi.fn().mockReturnValue(write.promise),
    };
    const hook = setup(repository);
    await waitFor(() =>
      expect(hook.result.current.session.card).not.toBeNull(),
    );
    let first;
    let second;
    act(() => {
      first = hook.result.current.rate("good");
      second = hook.result.current.rate("easy");
    });
    expect(repository.gradeSrsCard).toHaveBeenCalledTimes(1);
    expect(repository.gradeSrsCard).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: "revision-1",
        expectedProfileScope: "guest:default",
      }),
    );
    await act(async () => {
      write.resolve(session(2));
      await first;
      await second;
    });
    expect(hook.result.current.session.card.wordId).toBe(2);
    expect(hook.result.current.isRatingPending).toBe(false);
  });
  it("does not let a slow old deck response replace the selected deck", async () => {
    const old = deferred();
    const repository = {
      getSrsSession: vi.fn((id) =>
        id === "1" ? old.promise : Promise.resolve(session(20)),
      ),
    };
    const hook = setup(repository);
    hook.rerender({ deckId: "2", enabled: true, settings, repository });
    await waitFor(() =>
      expect(hook.result.current.session.card?.wordId).toBe(20),
    );
    await act(async () => {
      old.resolve(session(1));
      await old.promise;
    });
    expect(hook.result.current.session.card.wordId).toBe(20);
  });
  it("does not let a pending grade restore the previous deck", async () => {
    const write = deferred();
    const repository = {
      getSrsSession: vi.fn((id) => Promise.resolve(session(Number(id)))),
      gradeSrsCard: vi.fn().mockReturnValue(write.promise),
    };
    const hook = setup(repository);
    await waitFor(() =>
      expect(hook.result.current.session.card).not.toBeNull(),
    );
    let answer;
    act(() => {
      answer = hook.result.current.rate("good");
    });
    hook.rerender({ deckId: "2", enabled: true, settings, repository });
    await waitFor(() =>
      expect(hook.result.current.session.card?.wordId).toBe(2),
    );
    await act(async () => {
      write.resolve(session(999));
      await answer;
    });
    expect(hook.result.current.session.card.wordId).toBe(2);
  });
  it("keeps the current card on write failure and supports a fresh retry", async () => {
    const repository = {
      getSrsSession: vi.fn().mockResolvedValue(session()),
      gradeSrsCard: vi.fn().mockRejectedValue(new Error("Storage failed")),
    };
    const hook = setup(repository);
    await waitFor(() =>
      expect(hook.result.current.session.card).not.toBeNull(),
    );
    await act(async () => {
      await hook.result.current.rate("good");
    });
    expect(hook.result.current.error).toBe("Your answer could not be saved. Try again.");
    expect(hook.result.current.session.card.wordId).toBe(1);
    repository.getSrsSession.mockResolvedValue(session(2));
    await act(async () => {
      await hook.result.current.refresh();
    });
    expect(hook.result.current.error).toBe("");
    expect(hook.result.current.session.card.wordId).toBe(2);
  });
  it("wakes a waiting queue when the learning step becomes due", async () => {
    vi.useFakeTimers();
    const waiting = {
      ...session(),
      card: null,
      nextDueAt: new Date(Date.now() + 60_000).toISOString(),
      completionState: { done: true, canStartNewSession: false },
    };
    const repository = {
      getSrsSession: vi
        .fn()
        .mockResolvedValueOnce(waiting)
        .mockResolvedValue(session(2)),
    };
    const hook = setup(repository);
    await act(async () => {
      await Promise.resolve();
    });
    expect(hook.result.current.session.card).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_100);
    });
    expect(hook.result.current.session.card.wordId).toBe(2);
  });
  it("clears the old snapshot when the account changes", async () => {
    let onAuth;
    const authRepository = {
      subscribe: (callback) => {
        onAuth = callback;
        return () => {};
      },
    };
    const repository = { getSrsSession: vi.fn().mockResolvedValue(session()) };
    const hook = setup(repository, { authRepository });
    await waitFor(() =>
      expect(hook.result.current.session.card).not.toBeNull(),
    );
    repository.getSrsSession.mockResolvedValue({
      ...session(7),
      profileScope: "user:next",
    });
    await act(async () => {
      onAuth({ user: { id: "next" } });
    });
    expect(hook.result.current.session.card.wordId).toBe(7);
  });
});

describe("daily rollover and extra study", () => {
  it("refreshes an exhausted daily limit at local midnight", async () => {
    vi.useFakeTimers();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    vi.setSystemTime(midnight.getTime() - 1000);
    const blocked = { ...session(), card: null, completionState: { done: true, canStartNewSession: true } };
    const repository = { getSrsSession: vi.fn().mockResolvedValueOnce(blocked).mockResolvedValue(session(4)) };
    const hook = setup(repository);
    await act(async () => { await Promise.resolve(); });
    expect(hook.result.current.session.card).toBeNull();
    await act(async () => { await vi.advanceTimersByTimeAsync(1100); });
    expect(hook.result.current.session.card.wordId).toBe(4);
  });
  it("bypasses card limits only when extra study is explicitly started", async () => {
    const blocked = { ...session(), card: null, completionState: { done: true, canStartNewSession: true } };
    const repository = { getSrsSession: vi.fn().mockResolvedValue(blocked) };
    const hook = setup(repository);
    await waitFor(() => expect(hook.result.current.session.deck).not.toBeNull());
    expect(repository.getSrsSession).toHaveBeenLastCalledWith("1", settings, { forceAllCards: false });
    await act(async () => { hook.result.current.startExtra(); });
    expect(repository.getSrsSession).toHaveBeenLastCalledWith("1", settings, { forceAllCards: true });
  });
  it("does not replace a card for unrelated sync-status notifications", async () => {
    let onSync;
    const syncRepository = { subscribe: (callback) => { onSync = callback; return () => {}; } };
    const repository = { getSrsSession: vi.fn().mockResolvedValue(session()) };
    const hook = setup(repository, { syncRepository });
    await waitFor(() => expect(hook.result.current.session.card).not.toBeNull());
    const before = repository.getSrsSession.mock.calls.length;
    await act(async () => { onSync({ syncing: true }); onSync({ syncing: false }); });
    expect(repository.getSrsSession).toHaveBeenCalledTimes(before);
    await act(async () => { onSync({ lastSuccessfulPullAt: "2026-09-28T12:00:00Z" }); });
    expect(repository.getSrsSession).toHaveBeenCalledTimes(before + 1);
  });
});
