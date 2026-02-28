import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useDecks } from "@entities/deck";
import { useDeckImportFlow } from "@features/deck-import";
import { desktopApi } from "@shared/api";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { ROUTE_PATHS } from "@shared/config/routes";

export const useDecksOverviewPanel = () => {
  const navigate = useNavigate();
  const { decks, isLoading, error, refreshDecks } = useDecks();
  const { appPreferences } = useAppPreferences();
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [exportingDeckId, setExportingDeckId] = useState(null);
  const [deletingDeckId, setDeletingDeckId] = useState(null);
  const [deleteState, setDeleteState] = useState({
    isOpen: false,
    deckId: null,
    deckName: "",
  });

  const reportMessage = useCallback((text, variant = "info") => {
    setMessage(text);
    setMessageVariant(variant);
  }, []);

  const {
    isImporting,
    selectedImportFileName,
    selectedImportWordsCount,
    importDeckNameDraft,
    importLanguages,
    languageOptions,
    isImportConfirmOpen,
    isLanguageReviewOpen,
    openImportConfirm,
    closeImportConfirm,
    openLanguageReview,
    closeLanguageReview,
    toggleLanguageReview,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
  } = useDeckImportFlow({
    onMessage: reportMessage,
    onImportSuccess: refreshDecks,
  });

  const openDeck = useCallback(
    (deckId) => {
      navigate(`/decks/${deckId}`);
    },
    [navigate],
  );

  const openCreateDeck = useCallback(() => {
    navigate(ROUTE_PATHS.deckCreate);
  }, [navigate]);

  const openEditDeck = useCallback(
    (deckId) => {
      navigate(`/decks/${deckId}/edit`);
    },
    [navigate],
  );

  const exportDeck = useCallback(async (deckId) => {
    reportMessage("", "info");
    setExportingDeckId(deckId);

    try {
      const result = await desktopApi.exportDeckToJson(deckId, {
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
    reportMessage,
  ]);

  const deleteDeckById = useCallback(async (deckId, deckName = "") => {
    if (!deckId) {
      return;
    }

    reportMessage("", "info");
    setDeletingDeckId(deckId);

    try {
      await desktopApi.deleteDeck(deckId);
      const deletedName = deckName?.trim() || "Deck";
      reportMessage(`Deck deleted: ${deletedName}`, "danger");
      await refreshDecks();
    } catch (deleteError) {
      reportMessage(deleteError.message || "Failed to delete deck", "error");
    } finally {
      setDeletingDeckId(null);
    }
  }, [refreshDecks, reportMessage]);

  const openDeleteModal = useCallback((deckId, deckName = "") => {
    if (!appPreferences.dataSafety.confirmDestructive) {
      void deleteDeckById(deckId, deckName);
      return;
    }

    setDeleteState({
      isOpen: true,
      deckId,
      deckName,
    });
  }, [appPreferences.dataSafety.confirmDestructive, deleteDeckById]);

  const closeDeleteModal = useCallback(() => {
    if (!deletingDeckId) {
      setDeleteState(() => ({
        isOpen: false,
        deckId: null,
        deckName: "",
      }));
    }
  }, [deletingDeckId]);

  const confirmDeleteDeck = useCallback(async () => {
    if (!deleteState.deckId) {
      return;
    }

    await deleteDeckById(deleteState.deckId, deleteState.deckName);
    setDeleteState(() => ({
      isOpen: false,
      deckId: null,
      deckName: "",
    }));
  }, [deleteDeckById, deleteState.deckId, deleteState.deckName]);

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  return {
    decks,
    isLoading,
    error,
    message,
    messageVariant,
    exportingDeckId,
    deletingDeckId,
    isImporting,
    selectedImportFileName,
    selectedImportWordsCount,
    importDeckNameDraft,
    importLanguages,
    languageOptions,
    isImportConfirmOpen,
    isLanguageReviewOpen,
    deleteState,
    refreshDecks,
    openDeck,
    openCreateDeck,
    openEditDeck,
    exportDeck,
    openDeleteModal,
    closeDeleteModal,
    confirmDeleteDeck,
    openImportConfirm,
    closeImportConfirm,
    openLanguageReview,
    closeLanguageReview,
    toggleLanguageReview,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
    clearMessage,
  };
};
