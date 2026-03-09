import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { desktopApi, hubDecksApi } from "@shared/api";
import { useAppPreferences } from "@shared/lib/appPreferences";

const BROWSE_PAGE_SIZE = 6;
const SEARCH_DEBOUNCE_MS = 280;

const toVariant = (value) => {
  if (value === "success" || value === "warning" || value === "error" || value === "danger") {
    return value;
  }

  return "info";
};

const resolveImportMessage = (result, fallbackDeckName) => {
  const importedCount = Number.isFinite(Number(result?.importedCount))
    ? Number(result.importedCount)
    : 0;
  const skippedCount = Number.isFinite(Number(result?.skippedCount))
    ? Number(result.skippedCount)
    : 0;
  const resolvedDeckName =
    typeof result?.deckName === "string" && result.deckName.trim()
      ? result.deckName.trim()
      : fallbackDeckName || "Deck";

  if (importedCount <= 0 && skippedCount > 0) {
    return {
      text: `No new words imported from "${resolvedDeckName}" (${skippedCount} skipped)`,
      variant: "warning",
    };
  }

  if (skippedCount > 0) {
    return {
      text: `Imported "${resolvedDeckName}": ${importedCount} words, ${skippedCount} skipped`,
      variant: "warning",
    };
  }

  return {
    text: `Imported "${resolvedDeckName}": ${importedCount} words`,
    variant: "success",
  };
};

const withDownloadsCounterWarning = (message) => {
  const baseText = typeof message?.text === "string" ? message.text.trim() : "";
  const fallbackText = "Deck imported";

  return {
    text: `${baseText || fallbackText}. Downloads counter was not updated.`,
    variant: "warning",
  };
};

export const useBrowseDecksPanel = () => {
  const { appPreferences } = useAppPreferences();
  const [decks, setDecks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchValue, setSearchValue] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalDecks, setTotalDecks] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [importingDeckId, setImportingDeckId] = useState("");
  const requestIdRef = useRef(0);

  const isConfigured = hubDecksApi.isConfigured();
  const totalPages = useMemo(() => {
    if (totalDecks <= 0) {
      return 1;
    }

    return Math.max(1, Math.ceil(totalDecks / BROWSE_PAGE_SIZE));
  }, [totalDecks]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSearchValue = searchInput.trim();
      setSearchValue(nextSearchValue);
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchInput]);

  useEffect(() => {
    if (!isConfigured) {
      setDecks([]);
      setTotalDecks(0);
      setIsLoading(false);
      setError("");
      return;
    }

    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;
    setIsLoading(true);
    setError("");

    hubDecksApi
      .listDecks({
        page: currentPage,
        pageSize: BROWSE_PAGE_SIZE,
        search: searchValue,
      })
      .then((response) => {
        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        const nextDecks = Array.isArray(response?.items) ? response.items : [];
        const nextTotal = Number.isFinite(Number(response?.total))
          ? Number(response.total)
          : 0;

        setDecks(nextDecks);
        setTotalDecks(nextTotal);
      })
      .catch((loadError) => {
        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        setDecks([]);
        setTotalDecks(0);
        setError(loadError.message || "Failed to load community decks");
      })
      .finally(() => {
        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        setIsLoading(false);
      });
  }, [currentPage, isConfigured, refreshToken, searchValue]);

  useEffect(() => {
    if (currentPage <= totalPages) {
      return;
    }

    setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const reportMessage = useCallback((text, variant = "info") => {
    setMessage(text);
    setMessageVariant(toVariant(variant));
  }, []);

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  const refreshDecks = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  const handleSearchInputChange = useCallback((event) => {
    setSearchInput(event.target.value);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchInput("");
  }, []);

  const goToPreviousPage = useCallback(() => {
    setCurrentPage((value) => Math.max(1, value - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setCurrentPage((value) => Math.min(totalPages, value + 1));
  }, [totalPages]);

  const importDeckFromHub = useCallback(async (deck) => {
    if (!deck?.id) {
      return;
    }

    if (!desktopApi.isDesktopMode()) {
      reportMessage("Hub import is available only in desktop mode", "error");
      return;
    }

    const filePath = deck?.latestVersion?.filePath || "";

    if (!filePath) {
      reportMessage("Deck package file is unavailable for this item", "error");
      return;
    }

    setImportingDeckId(String(deck.id));
    reportMessage("", "info");

    try {
      const downloadUrl = await hubDecksApi.createDownloadUrl(filePath);
      const targetLanguages = Array.isArray(deck.targetLanguages)
        ? deck.targetLanguages
        : [];
      const targetLanguage = targetLanguages[0] || "";
      const tertiaryLanguage = targetLanguages[1] || "";
      const fileName = filePath.split("/").pop() || filePath;
      const result = await desktopApi.importDeckFromUrl({
        downloadUrl,
        fileName,
        deckName: deck.title || "",
        sourceLanguage: deck.sourceLanguage || "",
        targetLanguage,
        tertiaryLanguage,
        settings: {
          duplicateStrategy: appPreferences.importExport.duplicateStrategy,
          includeExamples: appPreferences.importExport.includeExamples,
          includeTags: appPreferences.importExport.includeTags,
        },
      });
      const importMessage = resolveImportMessage(result, deck.title);

      try {
        const nextDownloadsCount = await hubDecksApi.incrementDeckDownloads(
          deck.id,
          deck.downloadsCount,
        );

        setDecks((previousDecks) => {
          if (!Array.isArray(previousDecks) || previousDecks.length === 0) {
            return previousDecks;
          }

          return previousDecks.map((item) => {
            if (String(item?.id) !== String(deck.id)) {
              return item;
            }

            return {
              ...item,
              downloadsCount: nextDownloadsCount,
            };
          });
        });

        reportMessage(importMessage.text, importMessage.variant);
      } catch {
        const warningMessage = withDownloadsCounterWarning(importMessage);
        reportMessage(warningMessage.text, warningMessage.variant);
      }
    } catch (importError) {
      reportMessage(importError.message || "Failed to import deck from Hub", "error");
    } finally {
      setImportingDeckId("");
    }
  }, [
    appPreferences.importExport.duplicateStrategy,
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    reportMessage,
  ]);

  return {
    decks,
    isLoading,
    error,
    isConfigured,
    searchInput,
    currentPage,
    totalPages,
    totalDecks,
    importingDeckId,
    message,
    messageVariant,
    refreshDecks,
    handleSearchInputChange,
    clearSearch,
    goToPreviousPage,
    goToNextPage,
    importDeckFromHub,
    clearMessage,
  };
};
