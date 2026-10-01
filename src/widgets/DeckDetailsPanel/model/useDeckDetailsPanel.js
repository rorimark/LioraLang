import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useDeckWords } from "@entities/deck";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { ROUTE_PATHS, buildDeckEditRoute } from "@shared/config/routes";
import { useI18n } from "@shared/lib/i18n";
import { countByStageFilter, filterWords, sortWords } from "./deckDetailsModel";

const WORDS_PAGE = 50;

// The deck page: what the deck is, where the learner stands with it, and
// its words, each with where it stands.
export const useDeckDetailsPanel = () => {
  const navigate = useNavigate();
  const deckRepository = usePlatformService("deckRepository");
  const progressRepository = usePlatformService("progressRepository");
  const { deckId } = useParams();
  const { appPreferences } = useAppPreferences();
  const { deck, words, isLoading, error, refreshDeckWords } = useDeckWords(deckId);
  const { t, errorText, locale } = useI18n();

  const [study, setStudy] = useState(null);
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState("deck");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(WORDS_PAGE);
  const [openWordId, setOpenWordId] = useState(null);
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [isExporting, setIsExporting] = useState(false);

  // Read again with the words, and when the window comes back into view:
  // a session in another tab or window moves the numbers.
  useEffect(() => {
    if (!deckId || typeof progressRepository?.getDeckStudy !== "function") {
      return undefined;
    }

    let isCurrent = true;
    const load = () => {
      progressRepository
        .getDeckStudy(deckId)
        .then((result) => {
          if (isCurrent) setStudy(result || null);
        })
        .catch((studyError) => console.warn(studyError));
    };
    const handleVisibility = () => {
      if (document.visibilityState === "visible") load();
    };

    load();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      isCurrent = false;
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [deckId, progressRepository, words]);

  const counts = useMemo(() => countByStageFilter(words, study), [study, words]);
  const shownWords = useMemo(
    () => sortWords(filterWords(words, study, { filter, query }), study, sort, locale),
    [filter, locale, query, sort, study, words],
  );
  const visibleWords = useMemo(() => shownWords.slice(0, visibleCount), [shownWords, visibleCount]);

  const changeFilter = useCallback((nextFilter) => {
    setFilter(nextFilter);
    setVisibleCount(WORDS_PAGE);
  }, []);

  const changeQuery = useCallback((event) => {
    setQuery(event.target.value);
    setVisibleCount(WORDS_PAGE);
  }, []);

  const clearQuery = useCallback(() => setQuery(""), []);
  const changeSort = useCallback((event) => setSort(event.target.value), []);
  const showMore = useCallback(() => setVisibleCount((count) => count + WORDS_PAGE), []);
  const toggleWord = useCallback(
    (wordId) => setOpenWordId((current) => (String(current) === String(wordId) ? null : wordId)),
    [],
  );

  const exportDeck = useCallback(async () => {
    setMessage("");
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

      const exportedCount = Number.isInteger(result?.exportedCount) ? result.exportedCount : 0;
      const name = typeof result?.deckName === "string" && result.deckName.trim() ? result.deckName : t("decks.untitled");
      const filePath = typeof result?.filePath === "string" ? result.filePath.trim() : "";

      if (exportedCount === 0) {
        setMessage(t("decks.status.exportedEmpty", { name }));
        setMessageVariant("warning");
      } else if (!filePath) {
        setMessage(t("decks.status.exportedNoPath", { name, count: exportedCount }));
        setMessageVariant("warning");
      } else {
        setMessage(t("decks.status.exported", { name, count: exportedCount }));
        setMessageVariant("success");
      }
    } catch (exportError) {
      setMessage(errorText(exportError, "decks.errors.export"));
      setMessageVariant("error");
    } finally {
      setIsExporting(false);
    }
  }, [appPreferences.importExport, deckId, deckRepository, errorText, t]);

  const clearMessage = useCallback(() => setMessage(""), []);

  const openEditDeck = useCallback(() => {
    if (deckId) navigate(buildDeckEditRoute(deckId));
  }, [deckId, navigate]);

  const openDecksOverview = useCallback(() => navigate(ROUTE_PATHS.decks), [navigate]);

  const learnDeck = useCallback(() => {
    navigate(ROUTE_PATHS.learn, { state: { importedDeckId: String(deckId) } });
  }, [deckId, navigate]);

  return {
    deck,
    words,
    isLoading,
    error,
    refreshDeckWords,
    study,
    counts,
    filter,
    changeFilter,
    sort,
    changeSort,
    query,
    changeQuery,
    clearQuery,
    shownCount: shownWords.length,
    visibleWords,
    hasMoreWords: shownWords.length > visibleWords.length,
    showMore,
    openWordId,
    toggleWord,
    message,
    messageVariant,
    clearMessage,
    isExporting,
    exportDeck,
    openEditDeck,
    openDecksOverview,
    learnDeck,
  };
};
