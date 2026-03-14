import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { usePlatformService } from "@app/providers";
import { useDeckImportFlow } from "@features/deck-import";
import { useThemeSwitch } from "@features/theme-switch";
import {
  normalizeSettingsTab,
  SETTINGS_TAB_KEYS,
  SETTINGS_TAB_QUERY_KEY,
} from "@shared/config/settingsTabs";
import {
  APP_PREFERENCES_APP_KEY,
  DEFAULT_APP_PREFERENCES,
  useAppPreferences,
} from "@shared/lib/appPreferences";
import {
  DEFAULT_SHORTCUT_SETTINGS,
  SHORTCUT_SETTINGS_APP_KEY,
  useShortcutSettings,
} from "@shared/lib/shortcutSettings";
import { APP_THEME_MODES } from "@shared/lib/theme";

export const useSettingsDatabasePanel = () => {
  const settingsRepository = usePlatformService("settingsRepository");
  const systemRepository = usePlatformService("systemRepository");
  const runtimeGateway = usePlatformService("runtimeGateway");
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { appPreferences } = useAppPreferences();
  const { shortcutSettings } = useShortcutSettings();
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState("info");
  const [dbPath, setDbPath] = useState("");
  const [isChangingDbLocation, setIsChangingDbLocation] = useState(false);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const [isRepairingIntegrity, setIsRepairingIntegrity] = useState(false);
  const [isResettingSettings, setIsResettingSettings] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [isResetSettingsConfirmOpen, setIsResetSettingsConfirmOpen] = useState(false);
  const [integrityRepairConfirmState, setIntegrityRepairConfirmState] = useState({
    isOpen: false,
    issues: [],
  });
  const { themeMode, themeModeOptions, handleThemeModeChange } = useThemeSwitch();
  const requestedSettingsTab = searchParams.get(SETTINGS_TAB_QUERY_KEY);
  const [highlightedSettingsTab, setHighlightedSettingsTab] = useState("");
  const selectedSettingsTab = useMemo(() => {
    return normalizeSettingsTab(
      requestedSettingsTab,
      SETTINGS_TAB_KEYS.general,
    );
  }, [requestedSettingsTab]);
  const isDesktopMode = useMemo(
    () => runtimeGateway.isDesktopMode(),
    [runtimeGateway],
  );
  const menuFocusState =
    location.state?.settingsMenuFocus &&
    typeof location.state.settingsMenuFocus === "object"
      ? location.state.settingsMenuFocus
      : null;
  const menuFocusTab = normalizeSettingsTab(menuFocusState?.tab, "");
  const isMenuFocusNavigation =
    menuFocusState?.source === "app-menu" && Boolean(menuFocusTab);
  const menuFocusToken = Number(menuFocusState?.token) || 0;

  useEffect(() => {
    if (!isMenuFocusNavigation) {
      setHighlightedSettingsTab("");
      return undefined;
    }

    setHighlightedSettingsTab(menuFocusTab);

    if (typeof window === "undefined") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setHighlightedSettingsTab("");
    }, 1800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isMenuFocusNavigation, menuFocusTab, menuFocusToken]);

  const reportMessage = useCallback((text, variant = "info") => {
    setStatusMessage(text);
    setStatusVariant(variant);
  }, []);

  const handleUpdateStatus = useCallback(
    (payload) => {
      if (!payload || typeof payload !== "object") {
        return;
      }

      const status = payload.status;

      if (status === "checking") {
        reportMessage("Checking for updates...", "info");
        return;
      }

      if (status === "available") {
        reportMessage("Update available. Downloading in background.", "info");
        return;
      }

      if (status === "downloaded") {
        reportMessage("Update ready. Restart the app to install.", "success");
        return;
      }

      if (status === "none") {
        reportMessage("You're up to date.", "success");
        return;
      }

      if (status === "error") {
        reportMessage(payload.message || "Update check failed", "error");
      }
    },
    [reportMessage],
  );

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
  });

  useEffect(() => {
    if (!isDesktopMode) {
      return undefined;
    }

    return runtimeGateway.subscribeUpdateStatus(handleUpdateStatus);
  }, [handleUpdateStatus, isDesktopMode, runtimeGateway]);

  useEffect(() => {
    let cancelled = false;

    systemRepository
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
  }, [systemRepository]);

  const openDbFolder = useCallback(async () => {
    try {
      await systemRepository.openDbFolder();
    } catch (openError) {
      reportMessage(openError.message || "Failed to open DB folder", "error");
    }
  }, [reportMessage, systemRepository]);

  const checkForUpdates = useCallback(async () => {
    setIsCheckingUpdates(true);

    try {
      const result = await runtimeGateway.checkForUpdates();
      const status = result?.status;

      if (status === "disabled") {
        reportMessage(result.message || "Updates are available only in desktop builds.", "info");
      } else if (status === "available") {
        reportMessage("Update available. Downloading in background.", "info");
      } else if (status === "none") {
        reportMessage("You're up to date.", "success");
      } else if (status === "error") {
        reportMessage(result.message || "Update check failed", "error");
      } else {
        reportMessage("Checking for updates...", "info");
      }
    } catch (error) {
      reportMessage(error?.message || "Update check failed", "error");
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [reportMessage, runtimeGateway]);

  const changeDbLocation = useCallback(async () => {
    setIsChangingDbLocation(true);

    try {
      const changeResult = await systemRepository.changeDbLocation();

      if (changeResult?.canceled) {
        return;
      }

      const nextDbPath =
        typeof changeResult?.dbPath === "string" ? changeResult.dbPath : "";
      const migrated = Boolean(changeResult?.migrated);

      if (nextDbPath) {
        setDbPath(nextDbPath);
      }

      reportMessage(
        migrated
          ? "Database location updated. Existing data was moved."
          : "Database location updated.",
        "success",
      );
    } catch (changeError) {
      reportMessage(
        changeError.message || "Failed to change database location",
        "error",
      );
    } finally {
      setIsChangingDbLocation(false);
    }
  }, [reportMessage, systemRepository]);

  const closeIntegrityRepairConfirm = useCallback(() => {
    setIntegrityRepairConfirmState({
      isOpen: false,
      issues: [],
    });
  }, []);

  const runIntegrityRepair = useCallback(async ({
    closeConfirm = true,
  } = {}) => {
    setIsRepairingIntegrity(true);

    try {
      const report = await systemRepository.verifyIntegrity({ repair: true });
      const isHealthy = Boolean(report?.ok);
      const backupPaths = Array.isArray(report?.database?.backupPaths)
        ? report.database.backupPaths
        : [];
      const backupHint =
        backupPaths.length > 0 ? ` Backup: ${backupPaths[0]}` : "";

      if (isHealthy) {
        reportMessage(
          `Database restore completed successfully.${backupHint}`,
          "success",
        );
      } else {
        const databaseIssues = Array.isArray(report?.database?.issues)
          ? report.database.issues
          : [];
        const coreFilesIssues = Array.isArray(report?.coreFiles?.issues)
          ? report.coreFiles.issues
          : [];
        const allIssues = [...databaseIssues, ...coreFilesIssues];
        const issuesSummary = allIssues.length > 0 ? allIssues[0] : "Unknown issue";
        reportMessage(`Restore failed: ${issuesSummary}`, "error");
      }
    } catch (repairError) {
      reportMessage(
        repairError.message || "Failed to restore database",
        "error",
      );
    } finally {
      setIsRepairingIntegrity(false);

      if (closeConfirm) {
        closeIntegrityRepairConfirm();
      }
    }
  }, [closeIntegrityRepairConfirm, reportMessage, systemRepository]);

  const verifyIntegrity = useCallback(async () => {
    setIsVerifyingIntegrity(true);

    try {
      const report = await systemRepository.verifyIntegrity({ repair: false });
      const isHealthy = Boolean(report?.ok);
      const needsRepair = Boolean(report?.database?.needsRepair);
      const databaseIssues = Array.isArray(report?.database?.issues)
        ? report.database.issues
        : [];
      const coreFilesIssues = Array.isArray(report?.coreFiles?.issues)
        ? report.coreFiles.issues
        : [];

      closeIntegrityRepairConfirm();

      if (isHealthy) {
        reportMessage("Integrity check passed. No issues found.", "success");
        return;
      }

      if (needsRepair) {
        if (!appPreferences.dataSafety.confirmDestructive) {
          await runIntegrityRepair();
          return;
        }

        setIntegrityRepairConfirmState({
          isOpen: true,
          issues: databaseIssues,
        });
        reportMessage(
          "Integrity issues found. Confirm database restore to continue.",
          "info",
        );
        return;
      }

      const allIssues = [...databaseIssues, ...coreFilesIssues];
      const issuesSummary = allIssues.length > 0 ? allIssues[0] : "Unknown issue";
      reportMessage(`Integrity check failed: ${issuesSummary}`, "error");
    } catch (verifyError) {
      reportMessage(
        verifyError.message || "Failed to run integrity check",
        "error",
      );
    } finally {
      setIsVerifyingIntegrity(false);
    }
  }, [
    appPreferences.dataSafety.confirmDestructive,
    closeIntegrityRepairConfirm,
    reportMessage,
    runIntegrityRepair,
    systemRepository,
  ]);

  const confirmIntegrityRepair = useCallback(async () => {
    await runIntegrityRepair();
  }, [runIntegrityRepair]);

  const clearStatusMessage = useCallback(() => {
    setStatusMessage("");
  }, []);

  const openResetSettingsConfirm = useCallback(() => {
    setIsResetSettingsConfirmOpen(true);
  }, []);

  const closeResetSettingsConfirm = useCallback(() => {
    if (isResettingSettings) {
      return;
    }

    setIsResetSettingsConfirmOpen(false);
  }, [isResettingSettings]);

  const isResetAllDisabled = useMemo(() => {
    const hasDefaultTheme = themeMode === APP_THEME_MODES.system;
    const hasDefaultShortcuts =
      shortcutSettings.historyNavigation ===
        DEFAULT_SHORTCUT_SETTINGS.historyNavigation &&
      shortcutSettings.learnFlip === DEFAULT_SHORTCUT_SETTINGS.learnFlip &&
      shortcutSettings.learnRating === DEFAULT_SHORTCUT_SETTINGS.learnRating &&
      shortcutSettings.showLearnShortcuts ===
        DEFAULT_SHORTCUT_SETTINGS.showLearnShortcuts;
    const hasDefaultAppPreferences =
      JSON.stringify(appPreferences) === JSON.stringify(DEFAULT_APP_PREFERENCES);

    return (
      isResettingSettings ||
      (hasDefaultTheme && hasDefaultShortcuts && hasDefaultAppPreferences)
    );
  }, [appPreferences, isResettingSettings, shortcutSettings, themeMode]);

  const resetAllSettingsToDefaults = useCallback(async () => {
    setIsResettingSettings(true);

    try {
      await settingsRepository.updateAppSettings({
        [APP_PREFERENCES_APP_KEY]: DEFAULT_APP_PREFERENCES,
        [SHORTCUT_SETTINGS_APP_KEY]: DEFAULT_SHORTCUT_SETTINGS,
      });

      reportMessage("All settings restored to defaults.", "success");
    } catch (resetError) {
      reportMessage(
        resetError.message || "Failed to reset settings",
        "error",
      );
    } finally {
      setIsResettingSettings(false);
      setIsResetSettingsConfirmOpen(false);
    }
  }, [reportMessage, settingsRepository]);

  return {
    isDesktopMode,
    selectedSettingsTab,
    highlightedSettingsTab,
    dbPath,
    statusMessage,
    statusVariant,
    isChangingDbLocation,
    isVerifyingIntegrity,
    isRepairingIntegrity,
    isResettingSettings,
    isResetSettingsConfirmOpen,
    isResetAllDisabled,
    isCheckingUpdates,
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
    isIntegrityRepairConfirmOpen: integrityRepairConfirmState.isOpen,
    integrityRepairIssues: integrityRepairConfirmState.issues,
    themeMode,
    themeModeOptions,
    openImportConfirm,
    openJsonImport,
    closeImportConfirm,
    closeJsonImport,
    openLanguageReview,
    closeLanguageReview,
    toggleLanguageReview,
    confirmImportDeck,
    openDbFolder,
    changeDbLocation,
    verifyIntegrity,
    confirmIntegrityRepair,
    closeIntegrityRepairConfirm,
    handleThemeModeChange,
    checkForUpdates,
    openResetSettingsConfirm,
    closeResetSettingsConfirm,
    resetAllSettingsToDefaults,
    clearStatusMessage,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
    handleJsonDeckNameChange,
    handlePasteTextChange,
    importFromPaste,
  };
};
