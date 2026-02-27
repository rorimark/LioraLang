import { useCallback, useEffect, useState } from "react";
import { desktopApi } from "@shared/api";
import {
  useAppPreferences,
} from "@shared/lib/appPreferences";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  LANGUAGE_OPTIONS,
} from "@shared/config/languages";

const createDefaultImportLanguages = () => ({
  sourceLanguage: DEFAULT_SOURCE_LANGUAGE,
  targetLanguage: DEFAULT_TARGET_LANGUAGE,
  tertiaryLanguage: "",
});
const toLanguageKey = (value) => value.trim().toLowerCase();

const resolveImportLanguages = (value = {}) => {
  const selectedSource = typeof value?.sourceLanguage === "string"
    ? value.sourceLanguage.trim()
    : "";
  const selectedTarget = typeof value?.targetLanguage === "string"
    ? value.targetLanguage.trim()
    : "";
  const selectedTertiary = typeof value?.tertiaryLanguage === "string"
    ? value.tertiaryLanguage.trim()
    : "";

  const sourceLanguage = selectedSource || DEFAULT_SOURCE_LANGUAGE;
  const fallbackTargetLanguage =
    LANGUAGE_OPTIONS.find((language) => language !== sourceLanguage) ||
    DEFAULT_TARGET_LANGUAGE;
  const targetLanguage = selectedTarget && selectedTarget !== sourceLanguage
    && toLanguageKey(selectedTarget) !== toLanguageKey(sourceLanguage)
    ? selectedTarget
    : fallbackTargetLanguage;
  const tertiaryLanguage =
    selectedTertiary &&
    toLanguageKey(selectedTertiary) !== toLanguageKey(sourceLanguage) &&
    toLanguageKey(selectedTertiary) !== toLanguageKey(targetLanguage)
      ? selectedTertiary
      : "";

  return {
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage,
  };
};

export const useDeckImportFlow = ({ onMessage, onImportSuccess } = {}) => {
  const { appPreferences } = useAppPreferences();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportFilePath, setSelectedImportFilePath] = useState("");
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [selectedImportWordsCount, setSelectedImportWordsCount] = useState(null);
  const [importDeckNameDraft, setImportDeckNameDraft] = useState("");
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isLanguageReviewOpen, setIsLanguageReviewOpen] = useState(false);
  const [importLanguages, setImportLanguages] = useState(() =>
    createDefaultImportLanguages(),
  );

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
    setSelectedImportWordsCount(null);
    setImportDeckNameDraft("");
    setIsLanguageReviewOpen(false);
    setImportLanguages(createDefaultImportLanguages());
  }, []);

  const applyImportSelection = useCallback((result) => {
    const filePath =
      typeof result?.filePath === "string" ? result.filePath : "";
    const fileName =
      typeof result?.fileName === "string" ? result.fileName : "";
    const suggestedDeckName =
      typeof result?.suggestedDeckName === "string"
        ? result.suggestedDeckName
        : "";
    const suggestedWordsCount = Number.isInteger(result?.wordsCount)
      ? result.wordsCount
      : null;

    if (!filePath) {
      reportMessage("Selected file is invalid", "error");
      return;
    }

    setSelectedImportFilePath(filePath);
    setSelectedImportFileName(fileName);
    setSelectedImportWordsCount(suggestedWordsCount);
    setImportDeckNameDraft(suggestedDeckName);
    setImportLanguages(resolveImportLanguages({
      sourceLanguage: result?.sourceLanguage,
      targetLanguage: result?.targetLanguage,
      tertiaryLanguage: result?.tertiaryLanguage,
    }));
    setIsLanguageReviewOpen(
      Boolean(appPreferences.importExport.autoOpenLanguageReview),
    );
    setIsImportConfirmOpen(true);
  }, [appPreferences.importExport.autoOpenLanguageReview, reportMessage]);

  const openImportConfirm = useCallback(() => {
    reportMessage("", "info");

    desktopApi
      .pickImportDeckJson()
      .then((result) => {
        if (result?.canceled) {
          return;
        }
        applyImportSelection(result);
      })
      .catch((pickError) => {
        reportMessage(pickError.message || "Failed to select import file", "error");
      });
  }, [applyImportSelection, reportMessage]);

  useEffect(() => {
    let pendingRequest = desktopApi.consumePendingImportDeckFileRequest();

    while (pendingRequest) {
      applyImportSelection(pendingRequest);
      pendingRequest = desktopApi.consumePendingImportDeckFileRequest();
    }

    return desktopApi.subscribeImportDeckFileRequested((payload) => {
      reportMessage("", "info");
      applyImportSelection(payload);
    });
  }, [applyImportSelection, reportMessage]);

  const closeImportConfirm = useCallback(() => {
    if (!isImporting) {
      resetImportState();
    }
  }, [isImporting, resetImportState]);

  const handleImportDeckNameDraftChange = useCallback((event) => {
    setImportDeckNameDraft(event.target.value);
  }, []);

  const handleImportLanguageChange = useCallback((event) => {
    const { name, value } = event.target;

    setImportLanguages((currentState) => ({
      ...currentState,
      [name]: value,
    }));
  }, []);

  const openLanguageReview = useCallback(() => {
    setIsLanguageReviewOpen(true);
  }, []);

  const closeLanguageReview = useCallback(() => {
    setIsLanguageReviewOpen(false);
  }, []);

  const toggleLanguageReview = useCallback(() => {
    setIsLanguageReviewOpen((value) => !value);
  }, []);

  const confirmImportDeck = useCallback(async () => {
    const nextDeckName = importDeckNameDraft.trim();
    const sourceLanguage = importLanguages.sourceLanguage.trim();
    const targetLanguage = importLanguages.targetLanguage.trim();
    const tertiaryLanguage = importLanguages.tertiaryLanguage.trim();

    if (!selectedImportFilePath) {
      reportMessage("Select a .lioradeck or .json file before confirming import", "error");
      return;
    }

    if (!sourceLanguage || !targetLanguage) {
      reportMessage("Source and target languages are required", "error");
      return;
    }

    if (toLanguageKey(sourceLanguage) === toLanguageKey(targetLanguage)) {
      reportMessage("Source and target languages should be different", "error");
      return;
    }

    if (
      tertiaryLanguage &&
      (
        toLanguageKey(tertiaryLanguage) === toLanguageKey(sourceLanguage) ||
        toLanguageKey(tertiaryLanguage) === toLanguageKey(targetLanguage)
      )
    ) {
      reportMessage("Optional language must be different from source and target", "error");
      return;
    }

    reportMessage("", "info");
    setIsImporting(true);

    try {
      const result = await desktopApi.importDeckFromJson({
        filePath: selectedImportFilePath,
        deckName: nextDeckName,
        sourceLanguage,
        targetLanguage,
        tertiaryLanguage,
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
    importLanguages.sourceLanguage,
    importLanguages.targetLanguage,
    importLanguages.tertiaryLanguage,
    selectedImportFilePath,
  ]);

  return {
    isImporting,
    selectedImportFileName,
    selectedImportWordsCount,
    importDeckNameDraft,
    importLanguages,
    languageOptions: LANGUAGE_OPTIONS,
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
  };
};
