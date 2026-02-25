import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useDecks } from "@entities/deck";
import { desktopApi } from "@shared/api";

export const useDecksPage = () => {
  const navigate = useNavigate();
  const { decks, isLoading, error, refreshDecks } = useDecks();
  const [message, setMessage] = useState("");
  const [messageVariant, setMessageVariant] = useState("info");
  const [exportingDeckId, setExportingDeckId] = useState(null);
  const [renamingDeckId, setRenamingDeckId] = useState(null);
  const [deletingDeckId, setDeletingDeckId] = useState(null);
  const [renameState, setRenameState] = useState({
    isOpen: false,
    deckId: null,
    value: "",
  });
  const [deleteState, setDeleteState] = useState({
    isOpen: false,
    deckId: null,
    deckName: "",
  });

  const openDeck = useCallback(
    (deckId) => {
      navigate(`/decks/${deckId}`);
    },
    [navigate],
  );

  const exportDeck = useCallback(async (deckId) => {
    setMessage("");
    setMessageVariant("info");
    setExportingDeckId(deckId);

    try {
      const result = await desktopApi.exportDeckToJson(deckId);

      if (result?.canceled) {
        return;
      }

      setMessage(`Deck exported: ${result?.filePath || "completed"}`);
      setMessageVariant("info");
    } catch (exportError) {
      setMessage(exportError.message || "Failed to export deck");
      setMessageVariant("error");
    } finally {
      setExportingDeckId(null);
    }
  }, []);

  const openRenameModal = useCallback((deckId, currentName = "") => {
    setRenameState({
      isOpen: true,
      deckId,
      value: currentName,
    });
  }, []);

  const closeRenameModal = useCallback(() => {
    if (!renamingDeckId) {
      setRenameState(() => ({
        isOpen: false,
        deckId: null,
        value: "",
      }));
    }
  }, [renamingDeckId]);

  const handleRenameValueChange = useCallback((event) => {
    const value = event.target.value;
    setRenameState((state) => ({
      ...state,
      value,
    }));
  }, []);

  const confirmRenameDeck = useCallback(async () => {
    const nextName = renameState.value.trim();

    if (!renameState.deckId || !nextName) {
      return;
    }

    setMessage("");
    setMessageVariant("info");
    setRenamingDeckId(renameState.deckId);

    try {
      const renamedDeck = await desktopApi.renameDeck(
        renameState.deckId,
        nextName,
      );
      setMessage(`Deck renamed: ${renamedDeck?.name || renameState.value.trim()}`);
      setMessageVariant("info");
      setRenameState(() => ({
        isOpen: false,
        deckId: null,
        value: "",
      }));
      await refreshDecks();
    } catch (renameError) {
      setMessage(renameError.message || "Failed to rename deck");
      setMessageVariant("error");
    } finally {
      setRenamingDeckId(null);
    }
  }, [refreshDecks, renameState.deckId, renameState.value]);

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

  const confirmDeleteDeck = useCallback(
    async () => {
      if (!deleteState.deckId) {
        return;
      }

      setMessage("");
      setMessageVariant("info");
      setDeletingDeckId(deleteState.deckId);

      try {
        await desktopApi.deleteDeck(deleteState.deckId);
        const deletedName = deleteState.deckName?.trim() || "Deck";
        setMessage(`Deck deleted: ${deletedName}`);
        setMessageVariant("info");
        setDeleteState(() => ({
          isOpen: false,
          deckId: null,
          deckName: "",
        }));
        await refreshDecks();
      } catch (deleteError) {
        setMessage(deleteError.message || "Failed to delete deck");
        setMessageVariant("error");
      } finally {
        setDeletingDeckId(null);
      }
    },
    [deleteState.deckId, deleteState.deckName, refreshDecks],
  );

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
    renamingDeckId,
    deletingDeckId,
    renameState,
    deleteState,
    refreshDecks,
    openDeck,
    exportDeck,
    openDeleteModal,
    closeDeleteModal,
    confirmDeleteDeck,
    openRenameModal,
    closeRenameModal,
    handleRenameValueChange,
    confirmRenameDeck,
    clearMessage,
  };
};
