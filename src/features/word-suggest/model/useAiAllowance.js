import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useAiAccess } from "./useAiAccess";

// Today's suggestion allowance: { allowance, used, remaining, resetsAt },
// or null before it is known. Read from the server once per app run (and
// again where `refresh` asks, as Settings does); every call to the
// assistant moves it on from there.

// When fewer than this are left, the suggestion line says so.
export const LOW_ALLOWANCE = 20;

let hasAsked = false;
const noSubscription = () => () => {};
const nothing = () => null;

export const useAiAllowance = ({ refresh = false } = {}) => {
  const ai = useAiAccess();
  const repository = ai.repository;
  const canRead = ai.isReady && typeof repository?.getAllowance === "function";
  const subscribe = useCallback(
    (listener) => (canRead ? repository.subscribeAllowance(listener) : noSubscription()),
    [canRead, repository],
  );
  const read = useCallback(() => (canRead ? repository.peekAllowance() : null), [canRead, repository]);
  const allowance = useSyncExternalStore(subscribe, canRead ? read : nothing, nothing);

  useEffect(() => {
    if (!canRead || (hasAsked && !refresh)) {
      return;
    }

    hasAsked = true;
    repository.getAllowance().catch(() => {});
  }, [canRead, refresh, repository]);

  return allowance;
};
