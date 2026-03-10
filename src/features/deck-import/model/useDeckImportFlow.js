import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlatformService } from "@app/providers";
import {
  useAppPreferences,
} from "@shared/lib/appPreferences";
import {
  getDeckImportMetadata,
  parseDeckPackageFileText,
  validateDeckPackageObject,
} from "@shared/core/usecases/importExport";
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
  const isDesktopMode = runtimeGateway.isDesktopMode();
  const [isImporting, setIsImporting] = useState(false);
  const [selectedImportFilePath, setSelectedImportFilePath] = useState("");
  const [selectedImportFileName, setSelectedImportFileName] = useState("");
  const [selectedImportFileText, setSelectedImportFileText] = useState("");
  const [selectedImportWordsCount, setSelectedImportWordsCount] = useState(null);
  const [importDeckNameDraft, setImportDeckNameDraft] = useState("");
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isLanguageReviewOpen, setIsLanguageReviewOpen] = useState(false);
  const defaultPasteMode = !isDesktopMode;
  const [isPasteMode, setIsPasteMode] = useState(defaultPasteMode);
  const [pasteTextDraft, setPasteTextDraft] = useState("");
  const [pasteError, setPasteError] = useState("");
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
    setSelectedImportFileText("");
    setSelectedImportWordsCount(null);
    setImportDeckNameDraft("");
    setIsLanguageReviewOpen(false);
    setIsPasteMode(defaultPasteMode);
    setPasteTextDraft("");
    setPasteError("");
    setImportLanguages(defaultImportLanguages);
  }, [defaultImportLanguages, defaultPasteMode]);

  const applyImportSelection = useCallback((result) => {
    const filePath =
      typeof result?.filePath === "string" ? result.filePath : "";
    const fileName =
      typeof result?.fileName === "string" ? result.fileName : "";
    const fileText =
      typeof result?.fileText === "string" ? result.fileText : "";
    const suggestedDeckName =
      typeof result?.suggestedDeckName === "string"
        ? result.suggestedDeckName
        : "";
    const suggestedWordsCount = Number.isInteger(result?.wordsCount)
      ? result.wordsCount
      : null;

    if (!filePath && !fileText) {
      reportMessage("Selected file is invalid", "error");
      return;
    }

    setSelectedImportFilePath(filePath);
    setSelectedImportFileName(fileName);
    setSelectedImportFileText(fileText);
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
    setIsPasteMode(defaultPasteMode);
    setPasteTextDraft("");
    setPasteError("");
  }, [
    appPreferences.deckDefaults,
    appPreferences.importExport.autoOpenLanguageReview,
    defaultPasteMode,
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
        const message = pickError.message || "Failed to select import file";
        reportMessage(message, "error");
        if (!isDesktopMode) {
          setIsPasteMode(true);
          setPasteError(message);
          setPasteTextDraft("");
          setIsImportConfirmOpen(true);
        }
      });
  }, [applyImportSelection, deckRepository, isDesktopMode, reportMessage]);

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

  const handlePasteTextChange = useCallback((event) => {
    setPasteTextDraft(event.target.value);
    setPasteError("");
  }, []);

  const runImport = useCallback(async ({
    filePath = "",
    fileText = "",
    fileName = "",
    deckName = "",
    sourceLanguage = "",
    targetLanguage = "",
    tertiaryLanguage = "",
  } = {}) => {
    const normalizedDeckName = deckName.trim();
    const normalizedSource = sourceLanguage.trim();
    const normalizedTarget = targetLanguage.trim();
    const normalizedTertiary = tertiaryLanguage.trim();

    if (!filePath && !fileText) {
      reportMessage(
        "Select a .lioradeck, .lioralang or .json file before confirming import",
        "error",
      );
      return;
    }

    if (!normalizedSource || !normalizedTarget) {
      reportMessage("Source and target languages are required", "error");
      return;
    }

    if (toLanguageKey(normalizedSource) === toLanguageKey(normalizedTarget)) {
      reportMessage("Source and target languages should be different", "error");
      return;
    }

    if (
      normalizedTertiary &&
      (
        toLanguageKey(normalizedTertiary) === toLanguageKey(normalizedSource) ||
        toLanguageKey(normalizedTertiary) === toLanguageKey(normalizedTarget)
      )
    ) {
      reportMessage("Optional language must be different from source and target", "error");
      return;
    }

    reportMessage("", "info");
    setIsImporting(true);

    try {
      const result = await deckRepository.importDeckFromJson({
        filePath,
        fileText,
        fileName,
        deckName: normalizedDeckName,
        sourceLanguage: normalizedSource,
        targetLanguage: normalizedTarget,
        tertiaryLanguage: normalizedTertiary,
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
    deckRepository,
    onImportSuccess,
    reportMessage,
    resetImportState,
  ]);

  const importFromPaste = useCallback(() => {
    const normalizedText = pasteTextDraft.trim();

    if (!normalizedText) {
      setPasteError("Paste deck JSON first");
      return;
    }

    try {
      const parsedPackage = parseDeckPackageFileText(normalizedText);
      validateDeckPackageObject(parsedPackage);
      const metadata = getDeckImportMetadata({
        parsedPackage,
        fileName: "pasted-deck.lioradeck",
      });
      const resolvedLanguages = resolveImportLanguages({
        sourceLanguage: metadata.sourceLanguage,
        targetLanguage: metadata.targetLanguage,
        tertiaryLanguage: metadata.tertiaryLanguage,
      }, appPreferences.deckDefaults);
      const deckName =
        importDeckNameDraft.trim() || metadata.suggestedDeckName || "Imported Deck";

      setPasteError("");

      void runImport({
        filePath: "",
        fileText: normalizedText,
        fileName: "pasted-deck.lioradeck",
        deckName,
        sourceLanguage: resolvedLanguages.sourceLanguage,
        targetLanguage: resolvedLanguages.targetLanguage,
        tertiaryLanguage: resolvedLanguages.tertiaryLanguage,
      });
    } catch (error) {
      setPasteError(error.message || "Failed to parse pasted deck");
    }
  }, [
    appPreferences.deckDefaults,
    importDeckNameDraft,
    pasteTextDraft,
    runImport,
  ]);

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

    await runImport({
      filePath: selectedImportFilePath,
      fileText: selectedImportFileText,
      fileName: selectedImportFileName,
      deckName: nextDeckName,
      sourceLanguage,
      targetLanguage,
      tertiaryLanguage,
    });
  }, [
    importDeckNameDraft,
    importLanguages.sourceLanguage,
    importLanguages.targetLanguage,
    importLanguages.tertiaryLanguage,
    selectedImportFilePath,
    selectedImportFileText,
    selectedImportFileName,
    runImport,
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
    isPasteMode: isPasteMode && !isDesktopMode,
    pasteTextDraft,
    pasteError,
    openImportConfirm,
    closeImportConfirm,
    openLanguageReview,
    closeLanguageReview,
    toggleLanguageReview,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
    handlePasteTextChange,
    importFromPaste,
  };
};
