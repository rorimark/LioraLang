import { useCallback, useEffect, useState } from "react";
import { desktopApi } from "@shared/api";
import { useThemeSwitch } from "@features/theme-switch";

export const useSettingsPage = () => {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState("info");
  const [dbPath, setDbPath] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportFilePath, setSelectedImportFilePath] = useState("");
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [importDeckNameDraft, setImportDeckNameDraft] = useState("");
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const { isDarkTheme, toggleTheme } = useThemeSwitch();

  useEffect(() => {
    let cancelled = false;

    desktopApi
      .getDbPath()
      .then((path) => {
        if (!cancelled) {
          setDbPath(path || "");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDbPath("Desktop mode is required");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const confirmImportDeck = useCallback(async () => {
    const nextDeckName = importDeckNameDraft.trim();

    if (!selectedImportFilePath) {
      setStatusMessage("Select a JSON file before confirming import");
      setStatusVariant("error");
      return;
    }

    setStatusMessage("");
    setStatusVariant("info");
    setIsImporting(true);

    try {
      const result = await desktopApi.importDeckFromJson({
        filePath: selectedImportFilePath,
        deckName: nextDeckName,
      });

      if (result?.canceled) {
        setIsImportConfirmOpen(false);
        return;
      }

      setStatusMessage(
        `Imported "${result.deckName}": ${result.importedCount} words (${result.skippedCount} skipped)`,
      );
      setStatusVariant("info");
      setIsImportConfirmOpen(false);
      setImportDeckNameDraft("");
      setSelectedImportFilePath("");
      setSelectedImportFileName("");
    } catch (importError) {
      setStatusMessage(importError.message || "Failed to import deck");
      setStatusVariant("error");
    } finally {
      setIsImporting(false);
    }
  }, [importDeckNameDraft, selectedImportFilePath]);

  const openImportConfirm = useCallback(() => {
    setStatusMessage("");
    setStatusVariant("info");

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
          setStatusMessage("Selected file is invalid");
          setStatusVariant("error");
          return;
        }

        setSelectedImportFilePath(filePath);
        setSelectedImportFileName(fileName);
        setImportDeckNameDraft(suggestedDeckName);
        setIsImportConfirmOpen(true);
      })
      .catch((pickError) => {
        setStatusMessage(pickError.message || "Failed to select import file");
        setStatusVariant("error");
      });
  }, []);

  const closeImportConfirm = useCallback(() => {
    if (!isImporting) {
      setIsImportConfirmOpen(false);
      setSelectedImportFilePath("");
      setSelectedImportFileName("");
      setImportDeckNameDraft("");
    }
  }, [isImporting]);

  const handleImportDeckNameDraftChange = useCallback((event) => {
    setImportDeckNameDraft(event.target.value);
  }, []);

  const openDbFolder = useCallback(async () => {
    try {
      await desktopApi.openDbFolder();
    } catch (openError) {
      setStatusMessage(openError.message || "Failed to open DB folder");
      setStatusVariant("error");
    }
  }, []);

  const clearStatusMessage = useCallback(() => {
    setStatusMessage("");
  }, []);

  return {
    dbPath,
    statusMessage,
    statusVariant,
    isImporting,
    selectedImportFileName,
    importDeckNameDraft,
    isImportConfirmOpen,
    isDarkTheme,
    openImportConfirm,
    closeImportConfirm,
    confirmImportDeck,
    openDbFolder,
    toggleTheme,
    clearStatusMessage,
    handleImportDeckNameDraftChange,
  };
};
