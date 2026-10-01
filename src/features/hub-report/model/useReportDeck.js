import { useCallback, useState } from "react";
import { usePlatformService } from "@shared/providers";

// Reporting a Hub deck: a reason, an optional note, one request. The
// answer is what the dialog says next; nothing else on the page changes.

export const REPORT_REASONS = Object.freeze(["inappropriate", "spam", "copyright", "wrong", "other"]);
export const REPORT_NOTE_MAX = 500;

// What the dialog shows after sending, by the server's answer or the error.
const OUTCOME_BY_ANSWER = Object.freeze({
  reported: "sent",
  hidden: "hidden",
  own: "own",
  missing: "missing",
});

const OUTCOME_BY_ERROR = Object.freeze({
  report_signin: "signin",
  report_verify: "verify",
  report_offline: "offline",
});

export const useReportDeck = (deckId) => {
  const hubRepository = usePlatformService("hubRepository");
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [isSending, setIsSending] = useState(false);
  // "" while choosing; then sent, hidden, own, missing, signin, verify,
  // offline or failed.
  const [outcome, setOutcome] = useState("");

  const open = useCallback(() => {
    setReason("");
    setNote("");
    setOutcome("");
    setIsOpen(true);
  }, []);

  const close = useCallback(() => setIsOpen(false), []);

  const send = useCallback(async () => {
    if (!reason || isSending || typeof hubRepository?.reportDeck !== "function") {
      return;
    }

    setIsSending(true);

    try {
      const answer = await hubRepository.reportDeck({ deckId, reason, note: note.slice(0, REPORT_NOTE_MAX) });
      setOutcome(OUTCOME_BY_ANSWER[answer] || "sent");
    } catch (error) {
      console.warn(error);
      setOutcome(OUTCOME_BY_ERROR[error?.code] || "failed");
    } finally {
      setIsSending(false);
    }
  }, [deckId, hubRepository, isSending, note, reason]);

  return {
    isAvailable: typeof hubRepository?.reportDeck === "function",
    isOpen,
    reason,
    setReason,
    note,
    setNote,
    isSending,
    outcome,
    open,
    close,
    send,
  };
};
