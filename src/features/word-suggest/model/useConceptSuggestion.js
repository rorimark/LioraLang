import { useCallback, useEffect, useRef, useState } from "react";
import { buildConceptRequest, conceptCardPatch, readConceptCards } from "@shared/core/usecases/wordSuggest";
import { getSubjectProfile } from "@shared/core/usecases/subjects";
import { useAiAccess } from "./useAiAccess";

const idle = { status: "idle", cards: [] };
export const useConceptSuggestion = ({ deck, draft, onApply }) => {
  const enabled = getSubjectProfile(deck?.subject).assistant?.entry === "concept";
  const ai = useAiAccess({ enabled, feature: "conceptSuggestions" });
  const profile = getSubjectProfile(deck?.subject);
  const language = deck?.subjectFields?.[profile.assistant?.languageField] || "";
  const request = buildConceptRequest({ deck, draft });
  // Includes every edited value, not just the question: changing notes or
  // switching decks invalidates an answer too, even with identical questions.
  const key = JSON.stringify([deck?.id, deck?.name, request, draft]);
  const latest = useRef({ key, draft, onApply });
  const controller = useRef(null);
  const [state, setState] = useState(idle);
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => { latest.current = { key, draft, onApply }; }, [key, draft, onApply]);
  useEffect(() => {
    controller.current?.abort();
    return () => controller.current?.abort();
  }, [key, ai.isReady]);
  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
      if (!navigator.onLine) { controller.current?.abort(); setState(idle); }
    };
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  const visible = state.key === key ? state : idle;
  const canAsk = ai.isReady && online && Boolean(request) && typeof ai.repository?.suggestConcept === "function";
  const ask = useCallback(async () => {
    if (!canAsk) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ key, status: "thinking", cards: [] });
    try {
      const raw = await ai.repository.suggestConcept(request, { signal: current.signal });
      if (current.signal.aborted || latest.current.key !== key) return;
      const cards = readConceptCards(raw, request.subject);
      setState({ key, status: cards.length ? "suggested" : "empty", cards });
    } catch (error) {
      if (current.signal.aborted || latest.current.key !== key) return;
      const status = ["quota", "offline", "busy", "signin"].includes(error?.code) ? error.code : "error";
      setState({ key, status, cards: [] });
    }
  }, [ai.repository, canAsk, key, request]);
  const dismiss = () => { controller.current?.abort(); setState(idle); };
  const take = (index) => {
    const card = visible.cards[index];
    if (!card || latest.current.key !== key || !ai.isReady) return;
    const patch = conceptCardPatch(latest.current.draft, card, request.subject);
    latest.current.onApply?.(patch);
    dismiss();
  };
  return { enabled, language, isAvailable: ai.isWanted, canAsk, ...visible,
    status: !online ? "offline" : profile.assistant?.languageField && !language ? "languageRequired" : ai.needsSignIn ? "signin" : visible.status,
    ask, take, dismiss };
};
