import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { ROUTE_PATHS } from "@shared/config/routes";
import { copyTextToClipboard } from "@shared/lib/clipboard";
import { buildPublicDeckShareUrl } from "@shared/lib/share";
import { useI18n } from "@shared/lib/i18n";
import { hubDeckSides } from "@shared/core/usecases/hub";

// Twelve fills two, three or four columns without a gap.
const BROWSE_PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 280;

const toVariant = (value) => {
  if (value === "success" || value === "warning" || value === "error" || value === "danger") {
    return value;
  }

  return "info";
};

const resolveImportMessage = (result, fallbackDeckName, t) => {
  const importedCount = Number.isFinite(Number(result?.importedCount))
    ? Number(result.importedCount)
    : 0;
  const skippedCount = Number.isFinite(Number(result?.skippedCount))
    ? Number(result.skippedCount)
    : 0;
  const name =
    typeof result?.deckName === "string" && result.deckName.trim()
      ? result.deckName.trim()
      : fallbackDeckName || t("decks.untitled");

  if (importedCount <= 0 && skippedCount > 0) {
    return {
      text: t("browse.status.nothingNew", { name, count: skippedCount }),
      variant: "warning",
    };
  }

  if (skippedCount > 0) {
    return {
      text: t("import.status.importedWithSkipped", { name, added: importedCount, skipped: skippedCount }),
      variant: "warning",
    };
  }

  return {
    text: t("import.status.imported", { name, count: importedCount }),
    variant: "success",
  };
};

// The import worked; only the public download counter did not move.
const withCounterNote = (message, noteKey, t) => ({
  text: `${message?.text?.trim() || t("import.done.title")} ${t(noteKey)}`,
  variant: "warning",
});

const buildDeckSharePreviewKey = (deck) => {
  const versionToken =
    deck?.latestVersion?.version != null ? `v${String(deck.latestVersion.version).trim()}` : "";
  const timestampToken = Date.now().toString(36);
  return [versionToken, timestampToken].filter(Boolean).join("-");
};

export const useBrowseDecksPanel = () => {
  const navigate = useNavigate();
  const { t, errorText } = useI18n();
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
        console.warn(loadError);
        setError("browse.errors.load");
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
        : fallbackDeckName || t("import.importedDeck");

    setPostImportModal({
      isOpen: true,
      deckId: normalizedDeckId,
      deckName: normalizedDeckName,
    });
  }, [t]);

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
      reportMessage(t("browse.errors.noPackage"), "error");
      return;
    }

    setImportingDeckId(String(deck.id));
    reportMessage("", "info");

    try {
      const downloadUrl = await hubRepository.createDownloadUrl(filePath);
      const fileName = filePath.split("/").pop() || filePath;
      const result = await deckRepository.importDeckFromUrl({
        downloadUrl,
        fileName,
        deckName: deck.title || "",
        ...hubDeckSides(deck),
        originKind: "hub",
        originRef: deck.id,
        settings: {
          duplicateStrategy: appPreferences.importExport.duplicateStrategy,
          includeExamples: appPreferences.importExport.includeExamples,
          includeTags: appPreferences.importExport.includeTags,
        },
      });
      const importMessage = resolveImportMessage(result, deck.title, t);
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
          resolvedStatus = withCounterNote(importMessage, "browse.status.counterQueued", t);
        } else {
          resolvedStatus = importMessage;
        }
      } catch {
        resolvedStatus = withCounterNote(importMessage, "browse.status.counterFailed", t);
      }

      reportMessage(resolvedStatus.text, resolvedStatus.variant);
      openPostImportModal(result, deck.title);
    } catch (importError) {
      reportMessage(errorText(importError, "browse.errors.import"), "error");
    } finally {
      setImportingDeckId("");
    }
  }, [
    appPreferences.importExport.duplicateStrategy,
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    deckRepository,
    errorText,
    hubRepository,
    openPostImportModal,
    reportMessage,
    t,
  ]);

  const resolvePublicDeckUrl = useCallback((deck) => {
    const slug = typeof deck?.slug === "string" ? deck.slug.trim() : "";

    if (!slug) {
      return "";
    }

    return buildPublicDeckShareUrl(slug, {
      envBaseUrl: import.meta.env?.VITE_PUBLIC_APP_URL,
      origin: typeof window !== "undefined" ? window.location?.origin : "",
      previewKey: buildDeckSharePreviewKey(deck),
    });
  }, []);

  const copyDeckLink = useCallback(async (deck) => {
    const publicUrl = resolvePublicDeckUrl(deck);

    if (!publicUrl) {
      reportMessage(t("browse.errors.noLink"), "error");
      return;
    }

    const copied = await copyTextToClipboard(publicUrl);
    reportMessage(
      copied ? t("browse.status.linkCopied") : t("browse.errors.copy"),
      copied ? "success" : "error",
    );
  }, [reportMessage, resolvePublicDeckUrl, t]);

  return {
    decks,
    isLoading,
    error: error ? t(error) : "",
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
