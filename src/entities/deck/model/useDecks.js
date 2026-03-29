import { useCallback, useEffect, useState } from "react";
import { usePlatformService } from "@shared/providers";

export const useDecks = () => {
  const deckRepository = usePlatformService("deckRepository");
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedDecks = await deckRepository.listDecks();
      setDecks(Array.isArray(loadedDecks) ? loadedDecks : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load decks");
    } finally {
      setIsLoading(false);
    }
  }, [deckRepository]);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  useEffect(() => {
    const unsubscribe = deckRepository.subscribeDecksUpdated(() => {
      loadDecks();
    });

    return unsubscribe;
  }, [deckRepository, loadDecks]);

  return {
    decks,
    isLoading,
    error,
    refreshDecks: loadDecks,
  };
};
