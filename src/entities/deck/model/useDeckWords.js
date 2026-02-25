import { useCallback, useEffect, useState } from "react";
import { desktopApi } from "@shared/api";

export const useDeckWords = (deckId) => {
  const [deck, setDeck] = useState(null);
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadDeckWords = useCallback(async () => {
    if (!deckId) {
      setDeck(null);
      setWords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const [loadedDeck, loadedWords] = await Promise.all([
        desktopApi.getDeckById(deckId),
        desktopApi.getDeckWords(deckId),
      ]);

      setDeck(loadedDeck);
      setWords(Array.isArray(loadedWords) ? loadedWords : []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load deck words");
      setDeck(null);
      setWords([]);
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  useEffect(() => {
    loadDeckWords();
  }, [loadDeckWords]);

  return {
    deck,
    words,
    isLoading,
    error,
    refreshDeckWords: loadDeckWords,
  };
};
