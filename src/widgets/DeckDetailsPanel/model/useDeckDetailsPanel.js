import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
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

export const useDeckDetailsPanel = () => {
  const navigate = useNavigate();
  const { deckId } = useParams();
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
  const languageLabels = useMemo(() => {
    const sourceLanguage = deck?.sourceLanguage?.trim() || "English";
    const targetLanguage = deck?.targetLanguage?.trim() || "Russian";
    const tertiaryLanguage = deck?.tertiaryLanguage?.trim() || "";

    return {
      sourceLanguage,
      targetLanguage,
      tertiaryLanguage,
    };
  }, [deck?.sourceLanguage, deck?.targetLanguage, deck?.tertiaryLanguage]);

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

      const exportedCount = Number.isInteger(result?.exportedCount)
        ? result.exportedCount
        : 0;
      const exportedDeckName =
        typeof result?.deckName === "string" && result.deckName.trim()
          ? result.deckName
          : "Deck";
      const exportFilePath =
        typeof result?.filePath === "string" ? result.filePath.trim() : "";

      if (exportedCount === 0) {
        setMessage(`Exported "${exportedDeckName}" as empty deck`);
        setMessageVariant("warning");
      } else if (!exportFilePath) {
        setMessage(
          `Exported "${exportedDeckName}": ${exportedCount} words (path unavailable)`,
        );
        setMessageVariant("warning");
      } else {
        setMessage(`Exported "${exportedDeckName}": ${exportedCount} words`);
        setMessageVariant("success");
      }
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

  const openEditDeck = useCallback(() => {
    if (!deckId) {
      return;
    }

    navigate(`/decks/${deckId}/edit`);
  }, [deckId, navigate]);

  return {
    deck,
    isLoading,
    error,
    refreshDeckWords,
    message,
    messageVariant,
    isExporting,
    exportDeck,
    openEditDeck,
    clearMessage,
    isNarrowFiltersViewport,
    isFiltersExpanded,
    toggleFilters,
    languageLabels,
    ...cardCatalog,
  };
};
