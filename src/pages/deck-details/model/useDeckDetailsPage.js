import { useCallback, useEffect, useState } from "react";
import { useDeckWords } from "@entities/deck";
import { useCardCatalog } from "@features/card-catalog";
import { desktopApi } from "@shared/api";

const FILTERS_BREAKPOINT = 1080;

const isNarrowViewport = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(`(max-width: ${FILTERS_BREAKPOINT}px)`).matches;
};

export const useDeckDetailsPage = (deckId) => {
  const { deck, words, isLoading, error, refreshDeckWords } = useDeckWords(deckId);
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [isExporting, setIsExporting] = useState(false);
  const [isNarrowFiltersViewport, setIsNarrowFiltersViewport] = useState(() =>
    isNarrowViewport(),
  );
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(
    () => !isNarrowViewport(),
  );

  const cardCatalog = useCardCatalog(words);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia(
      `(max-width: ${FILTERS_BREAKPOINT}px)`,
    );

    const handleViewportChange = (event) => {
      const isNarrow = event.matches;
      setIsNarrowFiltersViewport(isNarrow);
      setIsFiltersExpanded(!isNarrow);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleViewportChange);
    } else {
      mediaQuery.addListener(handleViewportChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleViewportChange);
      } else {
        mediaQuery.removeListener(handleViewportChange);
      }
    };
  }, []);

  const exportDeck = useCallback(async () => {
    setMessage("");
    setMessageVariant("info");
    setIsExporting(true);

    try {
      const result = await desktopApi.exportDeckToJson(deckId);

      if (result?.canceled) {
        return;
      }

      setMessage(`Deck exported: ${result?.filePath || "completed"}`);
      setMessageVariant("info");
    } catch (exportError) {
      setMessage(exportError.message || "Failed to export deck");
      setMessageVariant("error");
    } finally {
      setIsExporting(false);
    }
  }, [deckId]);

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  const toggleFilters = useCallback(() => {
    setIsFiltersExpanded((currentState) => !currentState);
  }, []);

  return {
    deck,
    isLoading,
    error,
    refreshDeckWords,
    message,
    messageVariant,
    isExporting,
    exportDeck,
    clearMessage,
    isNarrowFiltersViewport,
    isFiltersExpanded,
    toggleFilters,
    ...cardCatalog,
  };
};
