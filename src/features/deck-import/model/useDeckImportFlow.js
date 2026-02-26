import { useCallback, useState } from "react";
import { desktopApi } from "@shared/api";

export const useDeckImportFlow = ({ onMessage, onImportSuccess } = {}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportFilePath, setSelectedImportFilePath] = useState("");
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [importDeckNameDraft, setImportDeckNameDraft] = useState("");
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);

  const reportMessage = useCallback(
    (text, variant = "info") => {
      if (typeof onMessage === "function") {
        onMessage(text, variant);
      }
    },
    [onMessage],
  );

  const resetImportState = useCallback(() => {
    setIsImportConfirmOpen(false);
    setSelectedImportFilePath("");
    setSelectedImportFileName("");
    setImportDeckNameDraft("");
  }, []);

  const openImportConfirm = useCallback(() => {
    reportMessage("", "info");

    desktopApi
      .pickImportDeckJson()
      .then((result) => {
        if (result?.canceled) {
          return;
        }

        const filePath =
          typeof result?.filePath === "string" ? result.filePath : "";
        const fileName =
          typeof result?.fileName === "string" ? result.fileName : "";
        const suggestedDeckName =
          typeof result?.suggestedDeckName === "string"
            ? result.suggestedDeckName
            : "";

        if (!filePath) {
          reportMessage("Selected file is invalid", "error");
          return;
        }

        setSelectedImportFilePath(filePath);
        setSelectedImportFileName(fileName);
        setImportDeckNameDraft(suggestedDeckName);
        setIsImportConfirmOpen(true);
      })
      .catch((pickError) => {
        reportMessage(pickError.message || "Failed to select import file", "error");
      });
  }, [reportMessage]);

  const closeImportConfirm = useCallback(() => {
    if (!isImporting) {
      resetImportState();
    }
  }, [isImporting, resetImportState]);

  const handleImportDeckNameDraftChange = useCallback((event) => {
    setImportDeckNameDraft(event.target.value);
  }, []);

  const confirmImportDeck = useCallback(async () => {
    const nextDeckName = importDeckNameDraft.trim();

    if (!selectedImportFilePath) {
      reportMessage("Select a JSON file before confirming import", "error");
      return;
    }

    reportMessage("", "info");
    setIsImporting(true);

    try {
      const result = await desktopApi.importDeckFromJson({
        filePath: selectedImportFilePath,
        deckName: nextDeckName,
      });

      if (result?.canceled) {
        resetImportState();
        return;
      }

      reportMessage(
        `Imported "${result.deckName}": ${result.importedCount} words (${result.skippedCount} skipped)`,
        "info",
      );

      resetImportState();

      if (typeof onImportSuccess === "function") {
        await onImportSuccess(result);
      }
    } catch (importError) {
      reportMessage(importError.message || "Failed to import deck", "error");
    } finally {
      setIsImporting(false);
    }
  }, [
    importDeckNameDraft,
    onImportSuccess,
    reportMessage,
    resetImportState,
    selectedImportFilePath,
  ]);

  return {
    isImporting,
    selectedImportFileName,
    importDeckNameDraft,
    isImportConfirmOpen,
    openImportConfirm,
    closeImportConfirm,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
  };
};
