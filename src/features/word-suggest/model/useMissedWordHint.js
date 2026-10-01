import { useEffect, useMemo, useState } from "react";
import { buildHintRequest, hintCacheKey } from "@shared/core/usecases/wordSuggest";
import { useAiAccess } from "./useAiAccess";

// A hint for the card just missed in Learn, asked once per word and kept
// for the session. Nothing is said when the assistant has no answer: a
// missed card is not the moment for an error message.

const hints = new Map();
const CACHE_LIMIT = 100;

const remember = (key, hint) => {
  hints.delete(key);
  hints.set(key, hint);

  if (hints.size > CACHE_LIMIT) {
    hints.delete(hints.keys().next().value);
  }
};

export const useMissedWordHint = ({ word, deck }) => {
  const ai = useAiAccess({ enabled: Boolean(word) });
  const request = useMemo(
    () => (word && ai.isReady ? buildHintRequest({ word, deck, explainIn: ai.language }) : null),
    [ai.isReady, ai.language, deck, word],
  );
  const key = hintCacheKey(request);
  const [answer, setAnswer] = useState({ key: "", hint: "", isDone: false });
  const cached = key ? hints.get(key) : undefined;

  useEffect(() => {
    if (!key || cached !== undefined || typeof ai.repository?.suggestHint !== "function") {
      return undefined;
    }

    const controller = new AbortController();

    ai.repository
      .suggestHint(request, { signal: controller.signal })
      .then((hint) => {
        remember(key, hint || "");
        setAnswer({ key, hint: hint || "", isDone: true });
      })
      .catch((error) => {
        if (error?.code !== "aborted") {
          setAnswer({ key, hint: "", isDone: true });
        }
      });

    return () => controller.abort();
  }, [ai.repository, cached, key, request]);

  const hint = cached !== undefined ? cached : answer.key === key ? answer.hint : "";
  const isLoading = Boolean(key) && cached === undefined && !(answer.key === key && answer.isDone);

  return { request, hint, isLoading };
};
