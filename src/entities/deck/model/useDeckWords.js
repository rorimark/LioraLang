import { useCallback, useEffect, useState } from "react";
import { usePlatformService } from "@app/providers";

export const useDeckWords = (deckId) => {
  const deckRepository = usePlatformService("deckRepository");
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
        deckRepository.getDeckById(deckId),
        deckRepository.getDeckWords(deckId),
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
  }, [deckId, deckRepository]);

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
