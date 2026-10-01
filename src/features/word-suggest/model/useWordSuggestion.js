import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import {
  SUGGEST_FIELDS,
  buildSuggestionRequest,
  hasSuggestionContent,
  normalizeSuggestion,
  resolveSuggestionAnchor,
  resolveSuggestionFills,
  suggestionCacheKey,
} from "@shared/core/usecases/wordSuggest";

// Suggestions for the rest of a card while someone types a word.
//
// It waits for a pause in typing, asks once per word (answers are kept for
// the session), drops an answer that arrives after the word has changed,
// and offers only fields that are still open: empty, or holding a default
// nobody chose. A field the person changed is theirs from then on.

const PAUSE_MS = 450;
const INK_MS = 900;
const CACHE_LIMIT = 150;
// After this many failures in a row the service is taken to be down for
// the session, so typing does not keep knocking on a closed door.
const FAILURES_BEFORE_PAUSE = 3;

export const SUGGEST_STATUS = Object.freeze({
  idle: "idle",
  loading: "loading",
  ready: "ready",
  signedOut: "signedOut",
  quota: "quota",
  error: "error",
});

const answers = new Map();
let failuresInARow = 0;

const remember = (key, suggestion) => {
  answers.delete(key);
  answers.set(key, suggestion);

  if (answers.size > CACHE_LIMIT) {
    answers.delete(answers.keys().next().value);
  }
};

const clean = (value) => (typeof value === "string" ? value.trim() : "");
const EMPTY_SET = new Set();

// Fields a suggestion could still add something to: the other side, the
// extra language, the examples. With all of them written there is nothing
// worth a request.
const hasRoomForSuggestion = (draft, deck, anchor) => {
  if (!anchor) {
    return false;
  }

  const otherSide = anchor.side === "source" ? "target" : "source";
  const otherSideIsText = deck?.pictureSide !== otherSide;

  return (
    (otherSideIsText && !clean(draft?.[otherSide])) ||
    (Boolean(clean(deck?.tertiaryLanguage)) && !clean(draft?.tertiary)) ||
    !clean(draft?.examplesInput)
  );
};

// The fields the person changed since the word was started: anything that
// moved and is not what a suggestion put there. A cleared word starts over.
const trackChanges = (tracked, draft) => {
  if (!clean(draft?.source) && !clean(draft?.target)) {
    return { draft, locked: EMPTY_SET, filled: {} };
  }

  const changed = SUGGEST_FIELDS.filter(
    (field) =>
      draft?.[field] !== tracked.draft?.[field] &&
      draft?.[field] !== tracked.filled[field] &&
      !tracked.locked.has(field),
  );

  return {
    ...tracked,
    draft,
    locked: changed.length ? new Set([...tracked.locked, ...changed]) : tracked.locked,
  };
};

export const useWordSuggestion = ({ draft, deck, defaults = null, onFill, enabled = true }) => {
  const repository = usePlatformService("wordSuggestRepository");
  const authRepository = usePlatformService("authRepository");
  const { appPreferences } = useAppPreferences();
  const isWanted =
    enabled &&
    appPreferences?.deckDefaults?.wordSuggestions !== false &&
    typeof repository?.suggestWord === "function" &&
    Boolean(authRepository?.isConfigured?.());

  const [isSignedIn, setIsSignedIn] = useState(null);
  const [result, setResult] = useState({ key: "", status: SUGGEST_STATUS.idle, suggestion: null });
  const [dismissedKey, setDismissedKey] = useState("");
  const [tracked, setTracked] = useState(() => ({ draft, locked: EMPTY_SET, filled: {} }));
  const [inked, setInked] = useState(EMPTY_SET);
  const inkTimerRef = useRef(null);

  // Adjusted while rendering, the way React keeps state in step with a
  // prop: no extra pass through an effect.
  if (tracked.draft !== draft) {
    setTracked(trackChanges(tracked, draft));
  }

  useEffect(() => {
    if (!isWanted) {
      return undefined;
    }

    let isLive = true;
    const update = (snapshot) => {
      if (isLive) setIsSignedIn(Boolean(snapshot?.isAuthenticated));
    };

    authRepository.getSnapshot().then(update).catch(() => update(null));
    const unsubscribe = authRepository.subscribe(update);

    return () => {
      isLive = false;
      unsubscribe?.();
    };
  }, [authRepository, isWanted]);

  useEffect(() => () => window.clearTimeout(inkTimerRef.current), []);

  const pictureSide = deck?.pictureSide || "";
  const anchor = useMemo(
    () => resolveSuggestionAnchor({ source: draft?.source, target: draft?.target }, pictureSide),
    [draft?.source, draft?.target, pictureSide],
  );
  const request = useMemo(
    () =>
      anchor
        ? buildSuggestionRequest({
            anchor,
            deck: {
              sourceLanguage: deck?.sourceLanguage,
              targetLanguage: deck?.targetLanguage,
              tertiaryLanguage: deck?.tertiaryLanguage,
              pictureSide,
              usesWordLevels: deck?.usesWordLevels,
            },
          })
        : null,
    [anchor, deck?.sourceLanguage, deck?.targetLanguage, deck?.tertiaryLanguage, deck?.usesWordLevels, pictureSide],
  );
  const key = request ? suggestionCacheKey(request) : "";
  const isActive = isWanted && isSignedIn === true;
  const isAsking = isActive && Boolean(request) && hasRoomForSuggestion(draft, deck, anchor);
  const cached = isAsking ? answers.get(key) : undefined;

  useEffect(() => {
    if (!isAsking || cached || failuresInARow >= FAILURES_BEFORE_PAUSE) {
      return undefined;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setResult({ key, status: SUGGEST_STATUS.loading, suggestion: null });

      try {
        const raw = await repository.suggestWord(request, { signal: controller.signal });
        const suggestion = normalizeSuggestion(raw || {}, request);
        failuresInARow = 0;
        remember(key, suggestion);
        setResult({ key, status: SUGGEST_STATUS.ready, suggestion });
      } catch (error) {
        if (controller.signal.aborted || error?.code === "aborted") {
          return;
        }

        if (error?.code === "unavailable") {
          failuresInARow += 1;
        }

        const status =
          error?.code === "quota"
            ? SUGGEST_STATUS.quota
            : error?.code === "signin"
              ? SUGGEST_STATUS.signedOut
              : SUGGEST_STATUS.error;
        setResult({ key, status, suggestion: null });
      }
    }, PAUSE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [cached, isAsking, key, repository, request]);

  const status = !isAsking
    ? SUGGEST_STATUS.idle
    : cached
      ? SUGGEST_STATUS.ready
      : result.key === key
        ? result.status
        : SUGGEST_STATUS.idle;
  const suggestion = isAsking && dismissedKey !== key ? cached || (result.key === key ? result.suggestion : null) : null;
  const fills = useMemo(
    () => (suggestion ? resolveSuggestionFills(draft, suggestion, { defaults: defaults || {}, locked: tracked.locked }) : {}),
    [defaults, draft, suggestion, tracked.locked],
  );
  const hasFills = Object.keys(fills).length > 0;
  const correction = suggestion && !suggestion.recognized ? suggestion.correction : "";

  // While the answer is on its way, the text fields it may fill.
  const pendingFields = useMemo(() => {
    if (status !== SUGGEST_STATUS.loading || !anchor) {
      return EMPTY_SET;
    }

    const otherSide = anchor.side === "source" ? "target" : "source";
    return new Set(
      [pictureSide !== otherSide ? otherSide : "", deck?.tertiaryLanguage ? "tertiary" : ""].filter(
        (field) => field && !clean(draft?.[field]) && !tracked.locked.has(field),
      ),
    );
  }, [anchor, deck?.tertiaryLanguage, draft, pictureSide, status, tracked.locked]);

  const ink = useCallback((fields) => {
    window.clearTimeout(inkTimerRef.current);
    setInked(new Set(fields));
    inkTimerRef.current = window.setTimeout(() => setInked(EMPTY_SET), INK_MS);
  }, []);

  const fill = useCallback(
    (patch) => {
      const fields = Object.keys(patch);

      if (!fields.length) {
        return false;
      }

      setTracked((current) => ({ ...current, filled: { ...current.filled, ...patch } }));
      onFill?.(patch);
      ink(fields);
      return true;
    },
    [ink, onFill],
  );

  const acceptAll = useCallback(() => fill(fills), [fill, fills]);
  const acceptField = useCallback((field) => (fills[field] ? fill({ [field]: fills[field] }) : false), [fill, fills]);

  // A misspelling is fixed only when asked: it replaces what was typed.
  const acceptCorrection = useCallback(() => {
    if (!correction || !anchor) {
      return false;
    }

    onFill?.({ [anchor.side]: correction });
    ink([anchor.side]);
    return true;
  }, [anchor, correction, ink, onFill]);

  const dismiss = useCallback(() => setDismissedKey(key), [key]);

  // Tab takes the whole suggestion, Escape puts it away. Both leave the
  // keys alone when there is nothing on offer.
  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "Tab" && !event.shiftKey && !event.altKey && !event.metaKey && !event.ctrlKey && hasFills) {
        event.preventDefault();
        acceptAll();
        return;
      }

      if (event.key === "Escape" && (hasFills || correction)) {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }
    },
    [acceptAll, correction, dismiss, hasFills],
  );

  // The fields that still hold what a suggestion put there: a form keeps
  // what the person chose for the next word, not what was suggested.
  const suggestedFields = useMemo(
    () => new Set(SUGGEST_FIELDS.filter((field) => draft?.[field] && draft[field] === tracked.filled[field])),
    [draft, tracked.filled],
  );

  return {
    isActive,
    suggestedFields,
    needsSignIn: isWanted && isSignedIn === false,
    isLoading: status === SUGGEST_STATUS.loading,
    status,
    pendingFields,
    fills,
    hasFills,
    hasContent: hasSuggestionContent(suggestion),
    correction,
    inked,
    acceptAll,
    acceptField,
    acceptCorrection,
    dismiss,
    handleKeyDown,
  };
};
