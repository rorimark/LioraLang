import {
  NavigatorLockAcquireTimeoutError,
  navigatorLock,
} from "@supabase/supabase-js";

const LOCK_UNAVAILABLE = Symbol("lock-unavailable");

const getLockManager = () => globalThis.navigator?.locks;

// Supabase's auth ticker asks for its lock with a zero timeout every 30s and
// skips the tick when another tab holds it. The stock lock signals that by
// throwing inside the navigator.locks callback; Supabase catches the error,
// but Firefox still reports the rejected callback promise as uncaught. Here
// the callback only returns a marker and the error is thrown outside it, so
// the skip stays silent. Every other timeout keeps the stock behaviour.
export const supabaseAuthLock = async (name, acquireTimeout, fn) => {
  const lockManager = getLockManager();

  if (!lockManager?.request) {
    return fn();
  }

  if (acquireTimeout !== 0) {
    return navigatorLock(name, acquireTimeout, fn);
  }

  const outcome = await lockManager.request(
    name,
    { mode: "exclusive", ifAvailable: true },
    async (lock) => (lock ? { value: await fn() } : LOCK_UNAVAILABLE),
  );

  if (outcome === LOCK_UNAVAILABLE) {
    throw new NavigatorLockAcquireTimeoutError(
      `Acquiring an exclusive Navigator LockManager lock "${name}" immediately failed`,
    );
  }

  return outcome.value;
};
