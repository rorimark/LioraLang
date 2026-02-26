import { useCallback, useEffect, useState } from "react";
import { useDeckImportFlow } from "@features/deck-import";
import { useThemeSwitch } from "@features/theme-switch";
import { desktopApi } from "@shared/api";

export const useSettingsDatabasePanel = () => {
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState("info");
  const [dbPath, setDbPath] = useState("");
  const { isDarkTheme, toggleTheme } = useThemeSwitch();

  const reportMessage = useCallback((text, variant = "info") => {
    setStatusMessage(text);
    setStatusVariant(variant);
  }, []);

  const {
    isImporting,
    selectedImportFileName,
    importDeckNameDraft,
    isImportConfirmOpen,
    openImportConfirm,
    closeImportConfirm,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
  } = useDeckImportFlow({
    onMessage: reportMessage,
  });

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

  const openDbFolder = useCallback(async () => {
    try {
      await desktopApi.openDbFolder();
    } catch (openError) {
      reportMessage(openError.message || "Failed to open DB folder", "error");
    }
  }, [reportMessage]);

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
