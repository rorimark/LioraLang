import { useMemo } from "react";
import { useDecks } from "./useDecks";

// Which Hub decks are already in this library, and as which local deck:
// a deck added from the Hub remembers the Hub deck it came from.
export const useHubLibraryIndex = () => {
  const { decks } = useDecks();

  return useMemo(() => {
    const index = new Map();

    decks.forEach((deck) => {
      const hubId = typeof deck?.originRef === "string" ? deck.originRef.trim() : "";

      if (deck?.originKind === "hub" && hubId && !index.has(hubId)) {
        index.set(hubId, String(deck.id));
      }
    });

    return index;
  }, [decks]);
};
