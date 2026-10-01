import { useCallback, useMemo, useRef, useState } from "react";
import {
  buildDeckDescriptionRequest,
  canDescribeDeck,
  mergeDeckTags,
  normalizeDeckDescription,
} from "@shared/core/usecases/wordSuggest";
import { useAiAccess } from "./useAiAccess";

// A description and tags for the deck being edited, asked for when the
// person presses the button and shown before anything changes.

export const DECK_DESCRIPTION_STATUS = Object.freeze({
  idle: "idle",
  loading: "loading",
  ready: "ready",
  empty: "empty",
  quota: "quota",
  busy: "busy",
  error: "error",
});

const statusOf = (error) =>
  error?.code === "quota"
    ? DECK_DESCRIPTION_STATUS.quota
    : error?.code === "busy"
      ? DECK_DESCRIPTION_STATUS.busy
      : DECK_DESCRIPTION_STATUS.error;

export const useDeckDescription = ({ deck, words, onApply }) => {
  const ai = useAiAccess();
  const [state, setState] = useState({ status: DECK_DESCRIPTION_STATUS.idle, draft: null });
  const controllerRef = useRef(null);
  const request = useMemo(
    () => buildDeckDescriptionRequest({ deck, words, writeIn: ai.language }),
    [ai.language, deck, words],
  );
  const canAsk = ai.isReady && canDescribeDeck(request) && typeof ai.repository?.suggestDeck === "function";

  const ask = useCallback(async () => {
    if (!canAsk) {
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: DECK_DESCRIPTION_STATUS.loading, draft: null });

    try {
      const draft = normalizeDeckDescription(await ai.repository.suggestDeck(request, { signal: controller.signal }));
      const hasDraft = Boolean(draft.description || draft.tags.length);
      setState({ status: hasDraft ? DECK_DESCRIPTION_STATUS.ready : DECK_DESCRIPTION_STATUS.empty, draft: hasDraft ? draft : null });
    } catch (error) {
      if (error?.code !== "aborted") {
        setState({ status: statusOf(error), draft: null });
      }
    }
  }, [ai.repository, canAsk, request]);

  // The description replaces what is there (the person saw both); the tags
  // join the deck's own.
  const take = useCallback(() => {
    const { draft } = state;

    if (!draft) {
      return;
    }

    onApply?.({
      ...(draft.description ? { description: draft.description } : {}),
      ...(draft.tags.length ? { tagsInput: mergeDeckTags(deck?.tagsInput, draft.tags) } : {}),
    });
    setState({ status: DECK_DESCRIPTION_STATUS.idle, draft: null });
  }, [deck?.tagsInput, onApply, state]);

  const dismiss = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: DECK_DESCRIPTION_STATUS.idle, draft: null });
  }, []);

  return {
    isAvailable: ai.isWanted,
    needsSignIn: ai.needsSignIn,
    canAsk,
    ...state,
    ask,
    take,
    dismiss,
  };
};
