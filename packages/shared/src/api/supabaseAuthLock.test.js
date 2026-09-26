import { afterEach, describe, expect, it, vi } from "vitest";
import { supabaseAuthLock } from "./supabaseAuthLock";

const setLockManager = (locks) => {
  vi.stubGlobal("navigator", { ...globalThis.navigator, locks });
};

describe("supabaseAuthLock", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs the callback directly when the browser has no lock manager", async () => {
    setLockManager(undefined);

    await expect(supabaseAuthLock("lock:a", 0, async () => "done")).resolves.toBe("done");
  });

  it("returns the callback result when the lock is free", async () => {
    const request = vi.fn(async (_name, _options, callback) => callback({ name: "lock:a" }));
    setLockManager({ request });

    await expect(supabaseAuthLock("lock:a", 0, async () => "done")).resolves.toBe("done");
    expect(request).toHaveBeenCalledWith(
      "lock:a",
      { mode: "exclusive", ifAvailable: true },
      expect.any(Function),
    );
  });

  it("throws an acquire-timeout error outside the lock callback when the lock is held", async () => {
    let callbackResult;
    const request = vi.fn(async (_name, _options, callback) => {
      callbackResult = callback(null);
      return callbackResult;
    });
    const fn = vi.fn();
    setLockManager({ request });

    const error = await supabaseAuthLock("lock:a", 0, fn).catch((caught) => caught);

    expect(error.isAcquireTimeout).toBe(true);
    expect(fn).not.toHaveBeenCalled();
    await expect(callbackResult).resolves.toBeTypeOf("symbol");
  });
});
