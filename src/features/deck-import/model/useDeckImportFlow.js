import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlatformService } from "@app/providers";
import {
  useAppPreferences,
} from "@shared/lib/appPreferences";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  LANGUAGE_OPTIONS,
} from "@shared/config/languages";

const toLanguageKey = (value) => value.trim().toLowerCase();

const createImportLanguagesFromDefaults = (deckDefaults = {}) => {
  const preferredSource =
    typeof deckDefaults?.sourceLanguage === "string"
      ? deckDefaults.sourceLanguage.trim()
      : "";
  const preferredTarget =
    typeof deckDefaults?.targetLanguage === "string"
      ? deckDefaults.targetLanguage.trim()
      : "";
  const sourceLanguage = preferredSource || DEFAULT_SOURCE_LANGUAGE;
  const fallbackTargetLanguage =
    LANGUAGE_OPTIONS.find((language) => language !== sourceLanguage) ||
    DEFAULT_TARGET_LANGUAGE;
  const targetLanguage =
    preferredTarget &&
    preferredTarget !== sourceLanguage &&
    toLanguageKey(preferredTarget) !== toLanguageKey(sourceLanguage)
      ? preferredTarget
      : fallbackTargetLanguage;

  return {
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage: "",
  };
};

const resolveImportLanguages = (value = {}, deckDefaults = {}) => {
  const selectedSource = typeof value?.sourceLanguage === "string"
    ? value.sourceLanguage.trim()
    : "";
  const selectedTarget = typeof value?.targetLanguage === "string"
    ? value.targetLanguage.trim()
    : "";
  const selectedTertiary = typeof value?.tertiaryLanguage === "string"
    ? value.tertiaryLanguage.trim()
    : "";

  const defaults = createImportLanguagesFromDefaults(deckDefaults);
  const sourceLanguage = selectedSource || defaults.sourceLanguage;
  const fallbackTargetLanguage =
    LANGUAGE_OPTIONS.find((language) => language !== sourceLanguage) ||
    defaults.targetLanguage ||
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
  const deckRepository = usePlatformService("deckRepository");
  const runtimeGateway = usePlatformService("runtimeGateway");
  const { appPreferences } = useAppPreferences();
  const defaultImportLanguages = useMemo(
    () => createImportLanguagesFromDefaults(appPreferences.deckDefaults),
    [appPreferences.deckDefaults],
  );
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportFilePath, setSelectedImportFilePath] = useState("");
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [selectedImportWordsCount, setSelectedImportWordsCount] = useState(null);
  const [importDeckNameDraft, setImportDeckNameDraft] = useState("");
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isLanguageReviewOpen, setIsLanguageReviewOpen] = useState(false);
  const [importLanguages, setImportLanguages] = useState(
    () => defaultImportLanguages,
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
    setImportLanguages(defaultImportLanguages);
  }, [defaultImportLanguages]);

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
    }, appPreferences.deckDefaults));
    setIsLanguageReviewOpen(
      Boolean(appPreferences.importExport.autoOpenLanguageReview),
    );
    setIsImportConfirmOpen(true);
  }, [
    appPreferences.deckDefaults,
    appPreferences.importExport.autoOpenLanguageReview,
    reportMessage,
  ]);

  useEffect(() => {
    if (isImportConfirmOpen) {
      return;
    }

    setImportLanguages(defaultImportLanguages);
  }, [defaultImportLanguages, isImportConfirmOpen]);

  const openImportConfirm = useCallback(() => {
    reportMessage("", "info");

    deckRepository
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
  }, [applyImportSelection, deckRepository, reportMessage]);

  useEffect(() => {
    const unsubscribe = runtimeGateway.subscribeImportDeckFileRequested((payload) => {
      reportMessage("", "info");
      applyImportSelection(payload);
      runtimeGateway.acknowledgeImportDeckFileRequest(payload?.filePath);
    });

    let pendingRequest = runtimeGateway.consumePendingImportDeckFileRequest();

    while (pendingRequest) {
      applyImportSelection(pendingRequest);
      pendingRequest = runtimeGateway.consumePendingImportDeckFileRequest();
    }

    return unsubscribe;
  }, [applyImportSelection, reportMessage, runtimeGateway]);

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
      reportMessage(
        "Select a .lioradeck, .lioralang or .json file before confirming import",
        "error",
      );
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
      const result = await deckRepository.importDeckFromJson({
        filePath: selectedImportFilePath,
        deckName: nextDeckName,
        sourceLanguage,
        targetLanguage,
        tertiaryLanguage,
        settings: {
          duplicateStrategy: appPreferences.importExport.duplicateStrategy,
          includeExamples: appPreferences.importExport.includeExamples,
          includeTags: appPreferences.importExport.includeTags,
        },
      });

      if (result?.canceled) {
        resetImportState();
        return;
      }

      const importedCount = Number.isInteger(result?.importedCount)
        ? result.importedCount
        : 0;
      const skippedCount = Number.isInteger(result?.skippedCount)
        ? result.skippedCount
        : 0;
      const importedDeckName =
        typeof result?.deckName === "string" && result.deckName.trim()
          ? result.deckName
          : "Deck";

      if (importedCount > 0 && skippedCount === 0) {
        reportMessage(
          `Imported "${importedDeckName}": ${importedCount} words`,
          "success",
        );
      } else if (importedCount > 0 && skippedCount > 0) {
        reportMessage(
          `Imported "${importedDeckName}" with warnings: ${importedCount} added, ${skippedCount} skipped`,
          "warning",
        );
      } else if (importedCount === 0 && skippedCount > 0) {
        reportMessage(
          `Import completed with no new words: ${skippedCount} skipped`,
          "danger",
        );
      } else {
        reportMessage(
          `Imported "${importedDeckName}": ${importedCount} words`,
          "success",
        );
      }

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
    appPreferences.importExport.duplicateStrategy,
    appPreferences.importExport.includeExamples,
    appPreferences.importExport.includeTags,
    importDeckNameDraft,
    deckRepository,
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
