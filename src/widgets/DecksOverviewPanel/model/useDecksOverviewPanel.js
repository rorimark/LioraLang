import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useDecks } from "@entities/deck";
import { useDeckImportFlow } from "@features/deck-import";
import { useAppPreferences } from "@shared/lib/appPreferences";
import {
  buildDeckDetailsRoute,
  buildDeckEditRoute,
  ROUTE_PATHS,
} from "@shared/config/routes";

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
  const { decks, isLoading, error, refreshDecks } = useDecks();
  const { appPreferences } = useAppPreferences();
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [publishingDeckId, setPublishingDeckId] = useState(null);
  const [exportingDeckId, setExportingDeckId] = useState(null);
  const [deletingDeckId, setDeletingDeckId] = useState(null);
  const [deckSearch, setDeckSearch] = useState("");
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
          : "Deck";
      const exportFilePath =
        typeof result?.filePath === "string" ? result.filePath.trim() : "";

      if (exportedCount === 0) {
        reportMessage(
          `Exported "${exportedDeckName}" as empty deck`,
          "warning",
        );
      } else if (!exportFilePath) {
        reportMessage(
          `Exported "${exportedDeckName}": ${exportedCount} words (path unavailable)`,
          "warning",
        );
      } else {
        reportMessage(
          `Exported "${exportedDeckName}": ${exportedCount} words`,
          "success",
        );
      }
    } catch (exportError) {
      reportMessage(exportError.message || "Failed to export deck", "error");
    } finally {
      setExportingDeckId(null);
    }
  }, [
    appPreferences.importExport.exportFormat,
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    deckRepository,
    reportMessage,
  ]);

  const publishDeck = useCallback(async (deckId) => {
    reportMessage("", "info");

    if (!hubRepository.isConfigured()) {
      reportMessage(
        "LLH is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY to .env.",
        "error",
      );
      return;
    }

    const normalizedDeckId = Number(deckId);

    if (!Number.isInteger(normalizedDeckId) || normalizedDeckId <= 0) {
      reportMessage("Invalid deck id", "error");
      return;
    }

    const deck = decks.find((item) => Number(item?.id) === normalizedDeckId);

    if (!deck) {
      reportMessage("Deck not found", "error");
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
          : deck.name || "Deck";
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
          `"${publishedTitle}" is already up to date on LLH (v${version}, ${wordsCount} words)`,
          "warning",
        );
        return;
      }

      if (queuedPublish) {
        reportMessage(
          `Queued "${publishedTitle}" for LLH publish. It will sync automatically when you're online.`,
          "warning",
        );
        return;
      }

      reportMessage(
        `Published "${publishedTitle}" to LLH (v${version}, ${wordsCount} words)`,
        "success",
      );
    } catch (publishError) {
      reportMessage(publishError.message || "Failed to publish deck", "error");
    } finally {
      setPublishingDeckId(null);
    }
  }, [
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    deckRepository,
    decks,
    hubRepository,
    reportMessage,
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
      const deletedName = deckName?.trim() || "Deck";

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
        reportMessage(`Removed from this device: ${deletedName}`, "warning");
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
            `Queued "${deletedName}" for removal from your synced library. It will finish when you're online.`,
            "warning",
          );
        } else {
          reportMessage(
            `Deleted from synced library: ${deletedName}`,
            "danger",
          );
        }
      } else {
        await deckRepository.deleteDeck(deckId);
        reportMessage(`Deck deleted: ${deletedName}`, "danger");
      }

      await refreshDecks();
      return true;
    } catch (deleteError) {
      reportMessage(deleteError.message || "Failed to delete deck", "error");
      return false;
    } finally {
      setDeletingDeckId(null);
    }
  }, [
    canManageSyncedLibrary,
    deckRepository,
    refreshDecks,
    reportMessage,
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

  const handleDeckSearchChange = useCallback((value) => {
    setDeckSearch(value);
  }, []);

  return {
    decks: filteredDecks,
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
