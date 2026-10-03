import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { isAiFeatureEnabled } from "@shared/config/aiFeatures";
import { useI18n } from "@shared/lib/i18n";
import { languageNameOf } from "./useAiAccess";
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

const PAUSE_MS = 350;
const INK_MS = 900;
const CACHE_LIMIT = 150;
// After this many failures in a row the service is taken to be down for
// the session, so typing does not keep knocking on a closed door.
const FAILURES_BEFORE_PAUSE = 3;
// A busy service is asked again, quietly, a couple of times.
const BUSY_RETRIES = 2;
const BUSY_RETRY_MS = 2_500;

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
// extra language, the examples, an unset level or part of speech, tags.
// With all of them written there is nothing worth a request.
const hasRoomForSuggestion = (draft, deck, anchor, defaults) => {
  if (!anchor) {
    return false;
  }

  const otherSide = anchor.side === "source" ? "target" : "source";
  const otherSideIsText = deck?.pictureSide !== otherSide;
  const tags = clean(draft?.tagsInput);

  return (
    (otherSideIsText && !clean(draft?.[otherSide])) ||
    (Boolean(clean(deck?.tertiaryLanguage)) && !clean(draft?.tertiary)) ||
    !clean(draft?.examplesInput) ||
    (deck?.usesWordLevels !== false && !clean(draft?.level)) ||
    !clean(draft?.part_of_speech) ||
    !tags ||
    tags === clean(defaults?.tagsInput)
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
  const { locale } = useI18n();
  const tagLanguage = useMemo(() => languageNameOf(locale), [locale]);
  // The deck's tags by value: a list rebuilt on every render asks nothing new.
  const deckTagsKey = Array.isArray(deck?.tags) ? deck.tags.join("\u0000") : "";
  const isWanted =
    enabled &&
    isAiFeatureEnabled(appPreferences, "wordSuggestions") &&
    typeof repository?.suggestWord === "function" &&
    Boolean(authRepository?.isConfigured?.());

  const [isSignedIn, setIsSignedIn] = useState(null);
  const [result, setResult] = useState({ key: "", status: SUGGEST_STATUS.idle, suggestion: null });
  const [dismissedKey, setDismissedKey] = useState("");
  const [retry, setRetry] = useState({ key: "", count: 0 });
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
  const filledSource = tracked.filled.source;
  const filledTarget = tracked.filled.target;
  const anchor = useMemo(
    () =>
      resolveSuggestionAnchor({ source: draft?.source, target: draft?.target }, pictureSide, {
        filled: { source: filledSource, target: filledTarget },
      }),
    [draft?.source, draft?.target, filledSource, filledTarget, pictureSide],
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
              tags: deckTagsKey ? deckTagsKey.split("\u0000") : [],
              tagLanguage,
            },
          })
        : null,
    [
      anchor,
      deck?.sourceLanguage,
      deck?.targetLanguage,
      deck?.tertiaryLanguage,
      deck?.usesWordLevels,
      deckTagsKey,
      pictureSide,
      tagLanguage,
    ],
  );
  const key = request ? suggestionCacheKey(request) : "";
  const isActive = isWanted && isSignedIn === true;
  const isAsking = isActive && Boolean(request) && hasRoomForSuggestion(draft, deck, anchor, defaults);
  const cached = isAsking ? answers.get(key) : undefined;
  const retryCount = retry.key === key ? retry.count : 0;

  useEffect(() => {
    if (!isAsking || cached || failuresInARow >= FAILURES_BEFORE_PAUSE) {
      return undefined;
    }

    const controller = new AbortController();
    let retryTimer = null;
    const timer = window.setTimeout(async () => {
      setResult({ key, status: SUGGEST_STATUS.loading, suggestion: null });

      try {
        const raw = await repository.suggestWord(request, { signal: controller.signal });
        if (controller.signal.aborted) return;
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

        // Busy or briefly offline: the shimmer stays and the same word is
        // asked again in a moment.
        if ((error?.code === "busy" || error?.code === "offline") && retryCount < BUSY_RETRIES) {
          retryTimer = window.setTimeout(() => setRetry({ key, count: retryCount + 1 }), BUSY_RETRY_MS);
          return;
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
      window.clearTimeout(retryTimer);
      controller.abort();
    };
  }, [cached, isAsking, key, repository, request, retryCount]);

  const status = !isAsking
    ? SUGGEST_STATUS.idle
    : cached
      ? SUGGEST_STATUS.ready
      : result.key === key
        ? result.status
        : SUGGEST_STATUS.idle;
  const suggestion = isAsking && dismissedKey !== key ? cached || (result.key === key ? result.suggestion : null) : null;
  const fills = useMemo(
    () =>
      suggestion
        ? resolveSuggestionFills(draft, suggestion, {
            defaults: defaults || {},
            locked: tracked.locked,
            filled: tracked.filled,
          })
        : {},
    [defaults, draft, suggestion, tracked.filled, tracked.locked],
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
    tagsBefore: draft?.tagsInput || "",
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
