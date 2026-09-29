import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useDeckWords } from "@entities/deck";
import { useCardCatalog } from "@features/card-catalog";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { ROUTE_PATHS, buildDeckEditRoute } from "@shared/config/routes";
import { useI18n } from "@shared/lib/i18n";

const FILTERS_BREAKPOINT = 1450;

const isNarrowViewport = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(`(max-width: ${FILTERS_BREAKPOINT}px)`).matches;
};

export const useDeckDetailsPanel = () => {
  const navigate = useNavigate();
  const deckRepository = usePlatformService("deckRepository");
  const { deckId } = useParams();
  const { appPreferences } = useAppPreferences();
  const { deck, words, isLoading, error, refreshDeckWords } = useDeckWords(deckId);
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [isExporting, setIsExporting] = useState(false);
  const [isNarrowFiltersViewport, setIsNarrowFiltersViewport] = useState(() =>
    isNarrowViewport(),
  );
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);

  const { t, errorText } = useI18n();
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
      setIsFiltersExpanded(false);
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
      const result = await deckRepository.exportDeckToJson(deckId, {
        exportFormat: appPreferences.importExport.exportFormat,
        includeExamples: appPreferences.importExport.includeExamples,
        includeTags: appPreferences.importExport.includeTags,
      });

      if (result?.canceled) {
        return;
      }

      const exportedCount = Number.isInteger(result?.exportedCount)
        ? result.exportedCount
        : 0;
      const exportedDeckName =
        typeof result?.deckName === "string" && result.deckName.trim()
          ? result.deckName
          : t("decks.untitled");
      const exportFilePath =
        typeof result?.filePath === "string" ? result.filePath.trim() : "";

      if (exportedCount === 0) {
        setMessage(t("decks.status.exportedEmpty", { name: exportedDeckName }));
        setMessageVariant("warning");
      } else if (!exportFilePath) {
        setMessage(
          t("decks.status.exportedNoPath", { name: exportedDeckName, count: exportedCount }),
        );
        setMessageVariant("warning");
      } else {
        setMessage(t("decks.status.exported", { name: exportedDeckName, count: exportedCount }));
        setMessageVariant("success");
      }
    } catch (exportError) {
      setMessage(errorText(exportError, "decks.errors.export"));
      setMessageVariant("error");
    } finally {
      setIsExporting(false);
    }
  }, [
    appPreferences.importExport.exportFormat,
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    deckRepository,
    deckId,
    errorText,
    t,
  ]);

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

    navigate(buildDeckEditRoute(deckId));
  }, [deckId, navigate]);

  const openDecksOverview = useCallback(() => {
    navigate(ROUTE_PATHS.decks);
  }, [navigate]);

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
    openDecksOverview,
    clearMessage,
    isNarrowFiltersViewport,
    isFiltersExpanded,
    toggleFilters,
    languageLabels,
    ...cardCatalog,
  };
};
