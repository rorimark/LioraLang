import { useCallback, useEffect, useRef, useState } from "react";
import { EMPTY_SRS_SESSION } from "@shared/core/usecases/srs";

export const useSrsSession = ({
  deckId,
  enabled,
  settings,
  repository,
  authRepository,
  syncRepository,
}) => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRatingPending, setIsRatingPending] = useState(false);
  const requestRef = useRef(0);
  const ratingLock = useRef(false);
  const extraRef = useRef(false);
  const contextKey = `${enabled}:${deckId}:${JSON.stringify(settings)}`;
  const session =
    result?.contextKey === contextKey ? result.session : EMPTY_SRS_SESSION;

  const refresh = useCallback(async () => {
    if (!enabled || !deckId) return;
    const request = ++requestRef.current;
    setIsLoading(true);
    setError("");
    try {
      const next = await repository.getSrsSession(deckId, settings, {
        forceAllCards: extraRef.current === new Date().toDateString(),
      });
      if (request === requestRef.current)
        setResult({ contextKey, session: next || EMPTY_SRS_SESSION });
    } catch (cause) {
      if (request === requestRef.current)
        setError(cause?.message || "Could not load the session. Try again.");
    } finally {
      if (request === requestRef.current) setIsLoading(false);
    }
  }, [contextKey, deckId, enabled, repository, settings]);

  useEffect(() => {
    extraRef.current = false;
    void refresh();
    return () => {
      requestRef.current += 1;
    };
  }, [refresh]);

  useEffect(() => {
    if (!enabled || !deckId) return undefined;
    const refreshWhenIdle = () => {
      if (!ratingLock.current) void refresh();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshWhenIdle();
    };
    let authUserId;
    let lastPullAt;
    const onAuth = (snapshot) => {
      const nextUserId = snapshot?.user?.id || null;
      if (nextUserId === authUserId) return;
      authUserId = nextUserId;
      requestRef.current += 1;
      extraRef.current = false;
      setResult(null);
      // Loading the new profile is safe; a pending grade still carries the old profile token.
      void refresh();
    };
    window.addEventListener("focus", refreshWhenIdle);
    document.addEventListener("visibilitychange", onVisibility);
    const unsubscribeAuth = authRepository?.subscribe(onAuth);
    const unsubscribeSync = syncRepository?.subscribe((snapshot) => {
      const nextPullAt = snapshot?.lastSuccessfulPullAt;
      if (!nextPullAt || nextPullAt === lastPullAt) return;
      lastPullAt = nextPullAt;
      refreshWhenIdle();
    });
    return () => {
      window.removeEventListener("focus", refreshWhenIdle);
      document.removeEventListener("visibilitychange", onVisibility);
      unsubscribeAuth?.();
      unsubscribeSync?.();
    };
  }, [authRepository, deckId, enabled, refresh, syncRepository]);

  useEffect(() => {
    if (
      !enabled ||
      !deckId ||
      session.card ||
      !session.deck ||
      isLoading ||
      error
    )
      return undefined;
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    const due = Date.parse(session.nextDueAt);
    const wakeAt = Math.min(
      tomorrow.getTime(),
      Number.isFinite(due) ? due : Infinity,
    );
    const timer = window.setTimeout(
      () => {
        if (!ratingLock.current) void refresh();
      },
      Math.max(100, Math.min(2_147_483_647, wakeAt - Date.now() + 50)),
    );
    return () => window.clearTimeout(timer);
  }, [deckId, enabled, error, isLoading, refresh, session]);

  const rate = useCallback(
    async (rating) => {
      if (!enabled || !session.card || ratingLock.current || isLoading)
        return false;
      ratingLock.current = true;
      const request = ++requestRef.current;
      setIsRatingPending(true);
      setError("");
      try {
        const next = await repository.gradeSrsCard({
          deckId,
          wordId: session.card.wordId,
          rating,
          settings,
          forceAllCards: extraRef.current === new Date().toDateString(),
          expectedRevision: session.card.revision,
          expectedProfileScope: session.profileScope,
        });
        if (request !== requestRef.current) return false;
        setResult({ contextKey, session: next || EMPTY_SRS_SESSION });
        return true;
      } catch (cause) {
        if (request === requestRef.current)
          setError(cause?.message || "Could not save your answer. Try again.");
        return false;
      } finally {
        ratingLock.current = false;
        setIsRatingPending(false);
      }
    },
    [contextKey, deckId, enabled, isLoading, repository, session, settings],
  );
  const startExtra = useCallback(() => {
    if (ratingLock.current || !session.completionState.canStartNewSession)
      return;
    extraRef.current = new Date().toDateString();
    void refresh();
  }, [refresh, session.completionState.canStartNewSession]);

  return {
    session,
    error,
    isLoading,
    isRatingPending,
    rate,
    refresh,
    startExtra,
  };
};
