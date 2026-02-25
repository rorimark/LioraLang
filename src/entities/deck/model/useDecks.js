import { useCallback, useEffect, useState } from "react";
import { desktopApi } from "@shared/api";

export const useDecks = () => {
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedDecks = await desktopApi.listDecks();
      setDecks(Array.isArray(loadedDecks) ? loadedDecks : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load decks");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDecks();
  }, [loadDecks]);

  useEffect(() => {
    const unsubscribe = desktopApi.subscribeDecksUpdated(() => {
      loadDecks();
    });

    return unsubscribe;
  }, [loadDecks]);

  return {
    decks,
    isLoading,
    error,
    refreshDecks: loadDecks,
  };
};
