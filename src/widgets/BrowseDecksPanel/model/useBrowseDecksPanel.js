import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { ROUTE_PATHS, buildBrowseDeckRoute } from "@shared/config/routes";
import { copyTextToClipboard } from "@shared/lib/clipboard";

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

const withDownloadsCounterQueuedWarning = (message) => {
  const baseText = typeof message?.text === "string" ? message.text.trim() : "";
  const fallbackText = "Deck imported";

  return {
    text: `${baseText || fallbackText}. Downloads update is queued and will sync when you're online.`,
    variant: "warning",
  };
};

export const useBrowseDecksPanel = () => {
  const navigate = useNavigate();
  const deckRepository = usePlatformService("deckRepository");
  const hubRepository = usePlatformService("hubRepository");
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
  const [postImportModal, setPostImportModal] = useState({
    isOpen: false,
    deckId: "",
    deckName: "",
  });
  const requestIdRef = useRef(0);

  const isConfigured = hubRepository.isConfigured();
  const totalPages = useMemo(() => {
    if (totalDecks <= 0) {
      return 1;
    }

    return Math.max(1, Math.ceil(totalDecks / BROWSE_PAGE_SIZE));
  }, [totalDecks]);
  const visibleRange = useMemo(() => {
    if (totalDecks <= 0) {
      return { start: 0, end: 0 };
    }

    const start = (currentPage - 1) * BROWSE_PAGE_SIZE + 1;
    const end = Math.min(start + Math.max(0, decks.length - 1), totalDecks);

    return { start, end };
  }, [currentPage, decks.length, totalDecks]);

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

    hubRepository
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
  }, [currentPage, hubRepository, isConfigured, refreshToken, searchValue]);

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

  const openPostImportModal = useCallback((result, fallbackDeckName = "") => {
    const normalizedDeckId =
      typeof result?.deckId === "string" || typeof result?.deckId === "number"
        ? String(result.deckId).trim()
        : "";

    if (!normalizedDeckId) {
      return;
    }

    const normalizedDeckName =
      typeof result?.deckName === "string" && result.deckName.trim()
        ? result.deckName.trim()
        : fallbackDeckName || "Imported deck";

    setPostImportModal({
      isOpen: true,
      deckId: normalizedDeckId,
      deckName: normalizedDeckName,
    });
  }, []);

  const closePostImportModal = useCallback(() => {
    setPostImportModal((currentState) => {
      if (!currentState.isOpen) {
        return currentState;
      }

      return {
        ...currentState,
        isOpen: false,
      };
    });
  }, []);

  const goToLearnAfterImport = useCallback(() => {
    const importedDeckId = String(postImportModal.deckId || "").trim();
    closePostImportModal();

    navigate(ROUTE_PATHS.learn, {
      state: importedDeckId ? { importedDeckId } : null,
    });
  }, [closePostImportModal, navigate, postImportModal.deckId]);

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

  const handlePageChange = useCallback(
    (page) => {
      const nextPage = Number(page);

      if (!Number.isFinite(nextPage)) {
        return;
      }

      setCurrentPage(Math.max(1, Math.min(totalPages, nextPage)));
    },
    [totalPages],
  );

  const importDeckFromHub = useCallback(async (deck) => {
    if (!deck?.id) {
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
      const downloadUrl = await hubRepository.createDownloadUrl(filePath);
      const targetLanguages = Array.isArray(deck.targetLanguages)
        ? deck.targetLanguages
        : [];
      const targetLanguage = targetLanguages[0] || "";
      const tertiaryLanguage = targetLanguages[1] || "";
      const fileName = filePath.split("/").pop() || filePath;
      const result = await deckRepository.importDeckFromUrl({
        downloadUrl,
        fileName,
        deckName: deck.title || "",
        sourceLanguage: deck.sourceLanguage || "",
        targetLanguage,
        tertiaryLanguage,
        originKind: "hub",
        originRef: deck.id,
        settings: {
          duplicateStrategy: appPreferences.importExport.duplicateStrategy,
          includeExamples: appPreferences.importExport.includeExamples,
          includeTags: appPreferences.importExport.includeTags,
        },
      });
      const importMessage = resolveImportMessage(result, deck.title);
      let resolvedStatus = importMessage;

      try {
        const incrementResult = await hubRepository.incrementDeckDownloads(
          deck.id,
          deck.downloadsCount,
        );
        const isDownloadsIncrementQueued =
          typeof incrementResult === "object" && Boolean(incrementResult?.queued);
        const nextDownloadsCount =
          typeof incrementResult === "object"
            ? Number(incrementResult?.count)
            : Number(incrementResult);
        const normalizedDownloadsCount = Number.isFinite(nextDownloadsCount)
          ? Math.max(0, Math.trunc(nextDownloadsCount))
          : Math.max(0, Number(deck.downloadsCount) || 0);

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
              downloadsCount: normalizedDownloadsCount,
            };
          });
        });

        if (isDownloadsIncrementQueued) {
          resolvedStatus = withDownloadsCounterQueuedWarning(importMessage);
        } else {
          resolvedStatus = importMessage;
        }
      } catch {
        resolvedStatus = withDownloadsCounterWarning(importMessage);
      }

      reportMessage(resolvedStatus.text, resolvedStatus.variant);
      openPostImportModal(result, deck.title);
    } catch (importError) {
      reportMessage(importError.message || "Failed to import deck from Hub", "error");
    } finally {
      setImportingDeckId("");
    }
  }, [
    appPreferences.importExport.duplicateStrategy,
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    deckRepository,
    hubRepository,
    openPostImportModal,
    reportMessage,
  ]);

  const resolvePublicDeckUrl = useCallback((deck) => {
    const slug = typeof deck?.slug === "string" ? deck.slug.trim() : "";

    if (!slug) {
      return "";
    }

    const deckPath = buildBrowseDeckRoute(slug);
    const envBase =
      typeof import.meta.env?.VITE_PUBLIC_APP_URL === "string"
        ? import.meta.env.VITE_PUBLIC_APP_URL.trim()
        : "";

    if (envBase) {
      return `${envBase.replace(/\/+$/, "")}${deckPath}`;
    }

    if (typeof window !== "undefined") {
      const origin = window.location?.origin || "";
      if (origin.startsWith("http")) {
        return `${origin}${deckPath}`;
      }
    }

    return deckPath;
  }, []);

  const copyDeckLink = useCallback(async (deck) => {
    const publicUrl = resolvePublicDeckUrl(deck);

    if (!publicUrl) {
      reportMessage("Public deck link is not available", "error");
      return;
    }

    const copied = await copyTextToClipboard(publicUrl);
    reportMessage(
      copied ? "Public deck link copied" : "Failed to copy deck link",
      copied ? "success" : "error",
    );
  }, [reportMessage, resolvePublicDeckUrl]);

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
    postImportModal,
    message,
    messageVariant,
    refreshDecks,
    handleSearchInputChange,
    clearSearch,
    goToPreviousPage,
    goToNextPage,
    handlePageChange,
    importDeckFromHub,
    copyDeckLink,
    clearMessage,
    closePostImportModal,
    goToLearnAfterImport,
    visibleRange,
  };
};
