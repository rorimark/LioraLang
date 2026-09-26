import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Longer than any exit animation; a safety net for when none runs.
const LEAVING_CARD_TIMEOUT_MS = 900;

// Keeps the card that just left the desk long enough to animate it away.
// The panel announces a move (a grade, or a step while browsing) in the same
// update that swaps the card; this hook pairs that move with the card as it
// was drawn before the swap. It also remembers the last graded card, which
// wide screens show on top of the "done" pile.
export const useLeavingCard = (card, cardMove) => {
  const drawnCardRef = useRef(card);
  const handledTokenRef = useRef(cardMove?.token ?? 0);
  const [leavingCard, setLeavingCard] = useState(null);
  const [lastDoneCard, setLastDoneCard] = useState(null);

  // Declared before the effect that records the drawn card, so it still
  // sees the card from before this update.
  useLayoutEffect(() => {
    if (!cardMove || cardMove.token === handledTokenRef.current) {
      return;
    }

    handledTokenRef.current = cardMove.token;
    const previousCard = drawnCardRef.current;

    if (!previousCard) {
      return;
    }

    setLeavingCard({ token: cardMove.token, kind: cardMove.kind, card: previousCard });

    if (cardMove.kind !== "prev" && cardMove.kind !== "next") {
      setLastDoneCard({ kind: cardMove.kind, text: previousCard.frontText || "" });
    }
  }, [cardMove]);

  useLayoutEffect(() => {
    drawnCardRef.current = card;
  }, [card]);

  useEffect(() => {
    if (!leavingCard) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setLeavingCard((current) => (current?.token === leavingCard.token ? null : current));
    }, LEAVING_CARD_TIMEOUT_MS);

    return () => clearTimeout(timeoutId);
  }, [leavingCard]);

  const clearLeavingCard = useCallback(() => {
    setLeavingCard(null);
  }, []);

  return { leavingCard, lastDoneCard, clearLeavingCard };
};
