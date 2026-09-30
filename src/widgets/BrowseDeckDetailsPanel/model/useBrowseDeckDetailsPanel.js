import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { usePlatformService } from "@shared/providers";
import { ROUTE_PATHS } from "@shared/config/routes";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { copyTextToClipboard } from "@shared/lib/clipboard";
import { buildPublicDeckShareUrl } from "@shared/lib/share";
import {
  normalizeWordsForImport,
  parseDeckPackageFileText,
  parseDeckPackageMedia,
  resolveImportConfig,
} from "@shared/core/usecases/importExport";
import { useCardCatalog } from "@features/card-catalog";
import { useI18n } from "@shared/lib/i18n";

const FILTERS_BREAKPOINT = 1450;
const EMPTY_IMAGE_SOURCES = new Map();

// The pictures a hub package carries, as URLs the preview can show. They
// live only while the preview does; adding the deck stores them for good.
const buildPreviewImageSources = (parsedPackage) =>
  new Map(
    parseDeckPackageMedia(parsedPackage).map((item) => [
      item.declaredId,
      URL.createObjectURL(new Blob([item.bytes], { type: item.mimeType })),
    ]),
  );

const revokeImageSources = (sources) => {
  sources.forEach((url) => URL.revokeObjectURL(url));
};

const isNarrowViewport = () => {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia(`(max-width: ${FILTERS_BREAKPOINT}px)`).matches;
};

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

export const useBrowseDeckDetailsPanel = (deckSlug) => {
  const navigate = useNavigate();
  const deckRepository = usePlatformService("deckRepository");
  const hubRepository = usePlatformService("hubRepository");
  const { appPreferences } = useAppPreferences();
  const { t, errorText } = useI18n();
  const [deck, setDeck] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [importing, setImporting] = useState(false);
  const [postImportModal, setPostImportModal] = useState({
    isOpen: false,
    deckId: "",
    deckName: "",
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const [previewWords, setPreviewWords] = useState([]);
  const [previewImageSources, setPreviewImageSources] = useState(EMPTY_IMAGE_SOURCES);
  const [previewLanguages, setPreviewLanguages] = useState({
    sourceLanguage: "",
    targetLanguage: "",
    tertiaryLanguage: "",
  });
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [isNarrowFiltersViewport, setIsNarrowFiltersViewport] = useState(() =>
    isNarrowViewport(),
  );
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const requestIdRef = useRef(0);
  const previewRequestIdRef = useRef(0);
  const previewKeyRef = useRef("");
  const cardCatalog = useCardCatalog(previewWords);

  const isConfigured = hubRepository.isConfigured();
  const normalizedSlug = useMemo(() => {
    if (typeof deckSlug !== "string") {
      return "";
    }

    return deckSlug.trim();
  }, [deckSlug]);

  useEffect(() => {
    if (!isConfigured) {
      setDeck(null);
      setError("");
      setIsLoading(false);
      return;
    }

    if (!normalizedSlug) {
      setDeck(null);
      setError("browse.errors.noDeck");
      setIsLoading(false);
      return;
    }

    const nextRequestId = requestIdRef.current + 1;
    requestIdRef.current = nextRequestId;
    setIsLoading(true);
    setError("");

    hubRepository
      .getDeckBySlug(normalizedSlug)
      .then((result) => {
        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        setDeck(result || null);
      })
      .catch((loadError) => {
        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        setDeck(null);
        console.warn(loadError);
        setError("browse.errors.loadDeck");
      })
      .finally(() => {
        if (requestIdRef.current !== nextRequestId) {
          return;
        }

        setIsLoading(false);
      });
  }, [hubRepository, isConfigured, normalizedSlug, refreshToken]);

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

  useEffect(() => {
    const filePath = deck?.latestVersion?.filePath || "";
    const nextKey = deck?.id && filePath ? `${deck.id}:${filePath}` : "";

    if (!filePath || !isConfigured) {
      setPreviewWords([]);
      setPreviewError("");
      setIsPreviewLoading(false);
      previewKeyRef.current = "";
      return;
    }

    if (previewKeyRef.current === nextKey) {
      return;
    }

    previewKeyRef.current = nextKey;
    const nextRequestId = previewRequestIdRef.current + 1;
    previewRequestIdRef.current = nextRequestId;
    setIsPreviewLoading(true);
    setPreviewError("");

    hubRepository
      .createDownloadUrl(filePath)
      .then((downloadUrl) => fetch(downloadUrl))
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to download deck package");
        }

        return response.text();
      })
      .then((text) => {
        if (previewRequestIdRef.current !== nextRequestId) {
          return;
        }

        const parsedPackage = parseDeckPackageFileText(text);
        const importConfig = resolveImportConfig({
          payload: {
            deckName: deck.title || "",
            sourceLanguage: deck.sourceLanguage || "",
            targetLanguage: Array.isArray(deck.targetLanguages)
              ? deck.targetLanguages[0]
              : "",
            tertiaryLanguage: Array.isArray(deck.targetLanguages)
              ? deck.targetLanguages[1]
              : "",
            settings: {
              includeTags: true,
              includeExamples: true,
              duplicateStrategy: "keep_both",
            },
          },
          parsedPackage,
          fallbackDeckName: deck.title || "Deck",
        });

        const normalized = normalizeWordsForImport({
          parsedPackage,
          sourceLanguage: importConfig.sourceLanguage,
          targetLanguage: importConfig.targetLanguage,
          tertiaryLanguage: importConfig.tertiaryLanguage,
          duplicateStrategy: "keep_both",
          includeTags: true,
          includeExamples: true,
        });

        const words = normalized.words.map((word, index) => ({
          id: word.externalId || `w${index + 1}`,
          ...word,
        }));

        setPreviewImageSources(buildPreviewImageSources(parsedPackage));
        setPreviewWords(words);
        setPreviewLanguages({
          sourceLanguage: importConfig.sourceLanguage,
          targetLanguage: importConfig.targetLanguage,
          tertiaryLanguage: importConfig.tertiaryLanguage,
          pictureSide: importConfig.pictureSide,
        });
      })
      .catch((loadError) => {
        if (previewRequestIdRef.current !== nextRequestId) {
          return;
        }

        setPreviewWords([]);
        console.warn(loadError);
        setPreviewError("browse.errors.preview");
      })
      .finally(() => {
        if (previewRequestIdRef.current !== nextRequestId) {
          return;
        }

        setIsPreviewLoading(false);
      });
  }, [deck, hubRepository, isConfigured]);

  // Each set of preview pictures is released when the next one replaces it,
  // or when the page closes.
  useEffect(() => () => revokeImageSources(previewImageSources), [previewImageSources]);

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

  const toggleFilters = useCallback(() => {
    setIsFiltersExpanded((currentState) => !currentState);
  }, []);

  const refreshDeck = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  const openBrowseDecks = useCallback(() => {
    navigate(ROUTE_PATHS.browse);
  }, [navigate]);

  const importDeckFromHub = useCallback(async () => {
    if (!deck?.id) {
      return;
    }

    const filePath = deck?.latestVersion?.filePath || "";

    if (!filePath) {
      reportMessage(t("browse.errors.noPackage"), "error");
      return;
    }

    setImporting(true);
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

        setDeck((previousDeck) => {
          if (!previousDeck) {
            return previousDeck;
          }

          return {
            ...previousDeck,
            downloadsCount: normalizedDownloadsCount,
          };
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
      setImporting(false);
    }
  }, [
    appPreferences.importExport.duplicateStrategy,
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    deck,
    deckRepository,
    errorText,
    hubRepository,
    openPostImportModal,
    reportMessage,
    t,
  ]);

  const resolvePublicDeckUrl = useCallback(() => {
    if (!normalizedSlug) {
      return "";
    }

    return buildPublicDeckShareUrl(normalizedSlug, {
      envBaseUrl: import.meta.env?.VITE_PUBLIC_APP_URL,
      origin: typeof window !== "undefined" ? window.location?.origin : "",
      previewKey: buildDeckSharePreviewKey(deck),
    });
  }, [deck, normalizedSlug]);

  const copyDeckLink = useCallback(async () => {
    const publicUrl = resolvePublicDeckUrl();

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
    deck,
    isLoading,
    error: error ? t(error) : "",
    isConfigured,
    message,
    messageVariant,
    importing,
    postImportModal,
    refreshDeck,
    importDeckFromHub,
    copyDeckLink,
    openBrowseDecks,
    clearMessage,
    closePostImportModal,
    goToLearnAfterImport,
    previewWords,
    previewImageSources,
    previewLanguages,
    isPreviewLoading,
    previewError: previewError ? t(previewError) : "",
    isNarrowFiltersViewport,
    isFiltersExpanded,
    toggleFilters,
    ...cardCatalog,
  };
};
