import { useCallback, useEffect, useState } from "react";
import { usePlatformService } from "@shared/providers";
import { useI18n } from "@shared/lib/i18n";

export const useDecks = () => {
  const deckRepository = usePlatformService("deckRepository");
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { t } = useI18n();

  const loadDecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const loadedDecks = await deckRepository.listDecks();
      setDecks(Array.isArray(loadedDecks) ? loadedDecks : []);
    } catch (loadError) {
      console.warn(loadError);
      setError(loadError || new Error("load"));
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
    error: error ? t("decks.errors.load") : null,
    refreshDecks: loadDecks,
  };
};
