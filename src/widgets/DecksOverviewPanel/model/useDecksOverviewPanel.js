import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useDecks } from "@entities/deck";
import { useDeckImportFlow } from "@features/deck-import";
import { desktopApi } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/routes";

export const useDecksOverviewPanel = () => {
  const navigate = useNavigate();
  const { decks, isLoading, error, refreshDecks } = useDecks();
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
      const result = await desktopApi.exportDeckToJson(deckId);

      if (result?.canceled) {
        return;
      }

      reportMessage(`Deck exported: ${result?.filePath || "completed"}`, "info");
    } catch (exportError) {
      reportMessage(exportError.message || "Failed to export deck", "error");
    } finally {
      setExportingDeckId(null);
    }
  }, [reportMessage]);

  const openDeleteModal = useCallback((deckId, deckName = "") => {
    setDeleteState({
      isOpen: true,
      deckId,
      deckName,
    });
  }, []);

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

    reportMessage("", "info");
    setDeletingDeckId(deleteState.deckId);

    try {
      await desktopApi.deleteDeck(deleteState.deckId);
      const deletedName = deleteState.deckName?.trim() || "Deck";
      reportMessage(`Deck deleted: ${deletedName}`, "danger");
      setDeleteState(() => ({
        isOpen: false,
        deckId: null,
        deckName: "",
      }));
      await refreshDecks();
    } catch (deleteError) {
      reportMessage(deleteError.message || "Failed to delete deck", "error");
    } finally {
      setDeletingDeckId(null);
    }
  }, [deleteState.deckId, deleteState.deckName, refreshDecks, reportMessage]);

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
