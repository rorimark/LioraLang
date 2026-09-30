import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useDecks } from "@entities/deck";
import { useDeckImportFlow } from "@features/deck-import";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { paginate } from "@shared/lib/pagination";
import {
  buildDeckDetailsRoute,
  buildDeckEditRoute,
  ROUTE_PATHS,
} from "@shared/config/routes";
import { useI18n } from "@shared/lib/i18n";

export const DECK_PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_DECK_PAGE_SIZE = 20;

const buildDeckSearchBlob = (deck) =>
  [
    deck?.name,
    deck?.description,
    deck?.sourceLanguage,
    deck?.targetLanguage,
    deck?.tertiaryLanguage,
    deck?.tagsJson,
  ]
    .map((value) => (typeof value === "string" ? value : ""))
    .join(" ")
    .toLowerCase();

export const useDecksOverviewPanel = () => {
  const navigate = useNavigate();
  const deckRepository = usePlatformService("deckRepository");
  const hubRepository = usePlatformService("hubRepository");
  const syncRepository = usePlatformService("syncRepository");
  const progressRepository = usePlatformService("progressRepository");
  const { decks, isLoading, error, refreshDecks } = useDecks();
  // Where each deck stands: words known, due now, not yet started. Read
  // from the same overview the Progress page uses, again whenever the
  // decks change.
  const [deckProgress, setDeckProgress] = useState({});

  useEffect(() => {
    if (typeof progressRepository?.getProgressOverview !== "function") {
      return undefined;
    }

    let isCurrent = true;

    progressRepository
      .getProgressOverview()
      .then((overview) => {
        if (!isCurrent) return;
        const rows = Array.isArray(overview?.decks) ? overview.decks : [];
        setDeckProgress(
          Object.fromEntries(
            rows.map((row) => [
              String(row.id),
              {
                words: Number(row.words) || 0,
                known: Number(row.known) || 0,
                fresh: Number(row.new) || 0,
                dueNow: Number(row.dueNow) || 0,
              },
            ]),
          ),
        );
      })
      .catch((progressError) => {
        console.warn(progressError);
      });

    return () => {
      isCurrent = false;
    };
  }, [decks, progressRepository]);

  // Straight into a session on this deck, the way Progress does it.
  const learnDeck = useCallback(
    (deckId) => {
      navigate(ROUTE_PATHS.learn, { state: { importedDeckId: String(deckId) } });
    },
    [navigate],
  );
  const { appPreferences } = useAppPreferences();
  const { t, errorText } = useI18n();
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [publishingDeckId, setPublishingDeckId] = useState(null);
  const [exportingDeckId, setExportingDeckId] = useState(null);
  const [deletingDeckId, setDeletingDeckId] = useState(null);
  const [deckSearch, setDeckSearch] = useState("");
  // The page lives in the address, so coming back from a deck lands on the
  // page it was opened from.
  const [searchParams, setSearchParams] = useSearchParams();
  const [deckPageSize, setDeckPageSize] = useState(DEFAULT_DECK_PAGE_SIZE);
  const [syncStatus, setSyncStatus] = useState(null);
  const [deleteState, setDeleteState] = useState({
    isOpen: false,
    deckId: null,
    deckName: "",
    deckSyncId: "",
  });

  const reportMessage = useCallback((text, variant = "info") => {
    setMessage(text);
    setMessageVariant(variant);
  }, []);

  useEffect(() => {
    let isMounted = true;

    void syncRepository.getStatus().then((nextStatus) => {
      if (isMounted) {
        setSyncStatus(nextStatus);
      }
    });

    const unsubscribe = syncRepository.subscribe((nextStatus) => {
      if (isMounted) {
        setSyncStatus(nextStatus);
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [syncRepository]);

  const {
    isImporting,
    selectedImportFileName,
    selectedImportWordsCount,
    importDeckNameDraft,
    importLanguages,
    languageOptions,
    isImportConfirmOpen,
    isLanguageReviewOpen,
    isJsonImportOpen,
    jsonDeckNameDraft,
    pasteTextDraft,
    pasteError,
    openImportConfirm,
    openJsonImport,
    closeImportConfirm,
    closeJsonImport,
    openLanguageReview,
    closeLanguageReview,
    toggleLanguageReview,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
    handleJsonDeckNameChange,
    handlePasteTextChange,
    importFromPaste,
  } = useDeckImportFlow({
    onMessage: reportMessage,
    onImportSuccess: refreshDecks,
  });

  const openDeck = useCallback(
    (deckId) => {
      navigate(buildDeckDetailsRoute(deckId));
    },
    [navigate],
  );

  const openCreateDeck = useCallback(() => {
    navigate(ROUTE_PATHS.deckCreate);
  }, [navigate]);

  const openEditDeck = useCallback(
    (deckId) => {
      navigate(buildDeckEditRoute(deckId));
    },
    [navigate],
  );

  const exportDeck = useCallback(async (deckId) => {
    reportMessage("", "info");
    setExportingDeckId(deckId);

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
        reportMessage(
          t("decks.status.exportedEmpty", { name: exportedDeckName }),
          "warning",
        );
      } else if (!exportFilePath) {
        reportMessage(
          t("decks.status.exportedNoPath", { name: exportedDeckName, count: exportedCount }),
          "warning",
        );
      } else {
        reportMessage(
          t("decks.status.exported", { name: exportedDeckName, count: exportedCount }),
          "success",
        );
      }
    } catch (exportError) {
      reportMessage(errorText(exportError, "decks.errors.export"), "error");
    } finally {
      setExportingDeckId(null);
    }
  }, [
    appPreferences.importExport.exportFormat,
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    deckRepository,
    errorText,
    reportMessage,
    t,
  ]);

  const publishDeck = useCallback(async (deckId) => {
    reportMessage("", "info");

    if (!hubRepository.isConfigured()) {
      reportMessage(
        t("hub.notConfigured"),
        "error",
      );
      return;
    }

    const normalizedDeckId = Number(deckId);

    if (!Number.isInteger(normalizedDeckId) || normalizedDeckId <= 0) {
      reportMessage(t("decks.errors.notFound"), "error");
      return;
    }

    const deck = decks.find((item) => Number(item?.id) === normalizedDeckId);

    if (!deck) {
      reportMessage(t("decks.errors.notFound"), "error");
      return;
    }

    // The Hub lists decks by their languages and cannot yet say that a
    // side is pictures, so a picture deck stays on devices and in sync.
    if (deck.pictureSide) {
      reportMessage(t("decks.errors.publishPictures"), "warning");
      return;
    }

    setPublishingDeckId(normalizedDeckId);

    try {
      const exported = await deckRepository.exportDeckPackage(normalizedDeckId, {
        includeExamples: appPreferences.importExport.includeExamples,
        includeTags: appPreferences.importExport.includeTags,
      });
      const deckPackage = exported?.package;

      if (!deckPackage || typeof deckPackage !== "object") {
        throw new Error("Failed to prepare deck package for publish");
      }

      const publishResult = await hubRepository.publishDeck({
        deck,
        deckPackage,
      });
      const publishedTitle =
        typeof publishResult?.title === "string" && publishResult.title.trim()
          ? publishResult.title.trim()
          : deck.name || t("decks.untitled");
      const version = Number.isFinite(Number(publishResult?.version))
        ? Number(publishResult.version)
        : 1;
      const wordsCount = Number.isFinite(Number(publishResult?.wordsCount))
        ? Number(publishResult.wordsCount)
        : exported?.exportedCount || 0;
      const skippedAsDuplicate = Boolean(publishResult?.skippedAsDuplicate);
      const queuedPublish = Boolean(publishResult?.queued);

      if (skippedAsDuplicate) {
        reportMessage(
          t("decks.status.publishUpToDate", { name: publishedTitle, version, count: wordsCount }),
          "warning",
        );
        return;
      }

      if (queuedPublish) {
        reportMessage(
          t("decks.status.publishQueued", { name: publishedTitle }),
          "warning",
        );
        return;
      }

      reportMessage(
        t("decks.status.published", { name: publishedTitle, version, count: wordsCount }),
        "success",
      );
    } catch (publishError) {
      reportMessage(errorText(publishError, "decks.errors.publish"), "error");
    } finally {
      setPublishingDeckId(null);
    }
  }, [
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    deckRepository,
    decks,
    errorText,
    hubRepository,
    reportMessage,
    t,
  ]);

  const canManageSyncedLibrary = Boolean(
    syncStatus?.configured && syncStatus?.signedIn,
  );

  const deleteDeckById = useCallback(async ({
    deckId,
    deckName = "",
    deckSyncId = "",
    mode = "local",
  } = {}) => {
    if (!deckId) {
      return;
    }

    reportMessage("", "info");
    setDeletingDeckId(deckId);

    try {
      const deletedName = deckName?.trim() || t("decks.untitled");

      if (
        mode === "remove-device" &&
        canManageSyncedLibrary &&
        typeof syncRepository?.removeDeckFromDevice === "function" &&
        deckSyncId
      ) {
        await syncRepository.removeDeckFromDevice({
          id: deckId,
          name: deckName,
          syncId: deckSyncId,
        });
        reportMessage(t("decks.status.removedFromDevice", { name: deletedName }), "warning");
      } else if (
        mode === "delete-library" &&
        canManageSyncedLibrary &&
        typeof syncRepository?.deleteDeckFromSyncedLibrary === "function" &&
        deckSyncId
      ) {
        const result = await syncRepository.deleteDeckFromSyncedLibrary({
          id: deckId,
          name: deckName,
          syncId: deckSyncId,
        });

        if (result?.queued) {
          reportMessage(
            t("decks.status.deleteQueued", { name: deletedName }),
            "warning",
          );
        } else {
          reportMessage(
            t("decks.status.deletedFromLibrary", { name: deletedName }),
            "danger",
          );
        }
      } else {
        await deckRepository.deleteDeck(deckId);
        reportMessage(t("decks.status.deleted", { name: deletedName }), "danger");
      }

      await refreshDecks();
      return true;
    } catch (deleteError) {
      reportMessage(errorText(deleteError, "decks.errors.delete"), "error");
      return false;
    } finally {
      setDeletingDeckId(null);
    }
  }, [
    canManageSyncedLibrary,
    deckRepository,
    errorText,
    refreshDecks,
    reportMessage,
    t,
    syncRepository,
  ]);

  const openDeleteModal = useCallback((deck) => {
    const deckId = Number(deck?.id);
    const deckName = typeof deck?.name === "string" ? deck.name : "";
    const deckSyncId = typeof deck?.syncId === "string" ? deck.syncId : "";

    if (!deckId) {
      return;
    }

    if (!appPreferences.dataSafety.confirmDestructive) {
      void deleteDeckById({
        deckId,
        deckName,
        deckSyncId,
        mode: canManageSyncedLibrary && deckSyncId ? "remove-device" : "local",
      });
      return;
    }

    setDeleteState({
      isOpen: true,
      deckId,
      deckName,
      deckSyncId,
      mode: canManageSyncedLibrary && deckSyncId ? "remove-device" : "local",
    });
  }, [
    appPreferences.dataSafety.confirmDestructive,
    canManageSyncedLibrary,
    deleteDeckById,
  ]);

  const closeDeleteModal = useCallback(() => {
    if (!deletingDeckId) {
      setDeleteState(() => ({
        isOpen: false,
        deckId: null,
        deckName: "",
        deckSyncId: "",
      }));
    }
  }, [deletingDeckId]);

  const confirmDeleteDeck = useCallback(async (mode = "local") => {
    if (!deleteState.deckId) {
      return;
    }

    const didDelete = await deleteDeckById({
      deckId: deleteState.deckId,
      deckName: deleteState.deckName,
      deckSyncId: deleteState.deckSyncId,
      mode,
    });

    if (!didDelete) {
      return;
    }

    setDeleteState(() => ({
      isOpen: false,
      deckId: null,
      deckName: "",
      deckSyncId: "",
    }));
  }, [
    deleteDeckById,
    deleteState.deckId,
    deleteState.deckName,
    deleteState.deckSyncId,
  ]);

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  const normalizedDeckSearch = useMemo(
    () => deckSearch.trim().toLowerCase(),
    [deckSearch],
  );

  const filteredDecks = useMemo(() => {
    if (!normalizedDeckSearch) {
      return decks;
    }

    return decks.filter((deck) =>
      buildDeckSearchBlob(deck).includes(normalizedDeckSearch),
    );
  }, [decks, normalizedDeckSearch]);

  const deckPage = useMemo(
    () => paginate(filteredDecks, searchParams.get("page"), deckPageSize),
    [deckPageSize, filteredDecks, searchParams],
  );

  const setDeckPageParam = useCallback(
    (page) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          if (page > 1) {
            next.set("page", String(page));
          } else {
            next.delete("page");
          }

          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const handleDeckSearchChange = useCallback(
    (value) => {
      setDeckSearch(value);
      setDeckPageParam(1);
    },
    [setDeckPageParam],
  );

  const handleDeckPageChange = useCallback(
    (page) => {
      setDeckPageParam(page);
    },
    [setDeckPageParam],
  );

  const handleDeckPageSizeChange = useCallback(
    (size) => {
      if (DECK_PAGE_SIZE_OPTIONS.includes(size)) {
        setDeckPageSize(size);
        setDeckPageParam(1);
      }
    },
    [setDeckPageParam],
  );

  return {
    decks: deckPage.items,
    deckProgress,
    learnDeck,
    matchingDecksCount: filteredDecks.length,
    deckPage,
    handleDeckPageChange,
    handleDeckPageSizeChange,
    totalDecksCount: decks.length,
    deckSearch,
    isLoading,
    error,
    message,
    messageVariant,
    publishingDeckId,
    exportingDeckId,
    deletingDeckId,
    canManageSyncedLibrary,
    isImporting,
    selectedImportFileName,
    selectedImportWordsCount,
    importDeckNameDraft,
    importLanguages,
    languageOptions,
    isImportConfirmOpen,
    isLanguageReviewOpen,
    isJsonImportOpen,
    jsonDeckNameDraft,
    pasteTextDraft,
    pasteError,
    deleteState,
    refreshDecks,
    handleDeckSearchChange,
    openDeck,
    openCreateDeck,
    openEditDeck,
    publishDeck,
    exportDeck,
    openDeleteModal,
    closeDeleteModal,
    confirmDeleteDeck,
    openImportConfirm,
    openJsonImport,
    closeImportConfirm,
    closeJsonImport,
    openLanguageReview,
    closeLanguageReview,
    toggleLanguageReview,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
    handleJsonDeckNameChange,
    handlePasteTextChange,
    importFromPaste,
    clearMessage,
  };
};
