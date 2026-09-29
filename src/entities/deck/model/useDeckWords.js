import { useCallback, useEffect, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { debugLogData } from "@shared/lib/debug";
import { useI18n } from "@shared/lib/i18n";

export const useDeckWords = (deckId) => {
  const deckRepository = usePlatformService("deckRepository");
  const [deck, setDeck] = useState(null);
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useI18n();

  const loadDeckWords = useCallback(async () => {
    if (!deckId) {
      setDeck(null);
      setWords([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    debugLogData("deck.words.load.start", { deckId });

    try {
      const [loadedDeck, loadedWords] = await Promise.all([
        deckRepository.getDeckById(deckId),
        deckRepository.getDeckWords(deckId),
      ]);

      setDeck(loadedDeck);
      setWords(Array.isArray(loadedWords) ? loadedWords : []);
      debugLogData("deck.words.load.success", {
        deckId,
        count: Array.isArray(loadedWords) ? loadedWords.length : 0,
      });
    } catch (loadError) {
      console.warn(loadError);
      setError(loadError || new Error("load"));
      setDeck(null);
      setWords([]);
      debugLogData("deck.words.load.error", {
        deckId,
        message: loadError?.message || "load failed",
      });
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
    error: error ? t("decks.errors.loadWords") : null,
    refreshDeckWords: loadDeckWords,
  };
};
