import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router";
import { usePlatformService } from "@shared/providers";
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
import { useI18n } from "@shared/lib/i18n";

const resolveAppVersion = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value.version === "string") {
    return value.version;
  }

  return "";
};

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
  const [statusAction, setStatusAction] = useState(null);
  const lastUpdateToastRef = useRef({
    key: "",
    timestamp: 0,
  });
  const lastUpdatePromptRef = useRef("");
  const [isUpdatePromptOpen, setIsUpdatePromptOpen] = useState(false);
  const [updatePromptVersion, setUpdatePromptVersion] = useState("");
  const [isUpdateDownloading, setIsUpdateDownloading] = useState(false);
  const [dbPath, setDbPath] = useState("");
  const [appVersion, setAppVersion] = useState("");
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

  const { t, errorText } = useI18n();
  const reportMessage = useCallback((text, variant = "info", action = null) => {
    setStatusMessage(text);
    setStatusVariant(variant);
    setStatusAction(action);
  }, []);

  const openDownloadsFolder = useCallback(async () => {
    try {
      await systemRepository.openDownloadsFolder();
    } catch (openError) {
      reportMessage(errorText(openError, "settingsPage.errors.openDownloads"), "error");
    }
  }, [errorText, reportMessage, systemRepository]);

  const handleUpdateStatus = useCallback(
    (payload) => {
      if (!payload || typeof payload !== "object") {
        return;
      }

      const status = payload.status;
      const messageKey = `${status}:${payload.message || ""}:${payload.progress?.percent || ""}`;
      const now = Date.now();

      if (
        lastUpdateToastRef.current.key === messageKey &&
        now - lastUpdateToastRef.current.timestamp < 1500
      ) {
        return;
      }

      lastUpdateToastRef.current = {
        key: messageKey,
        timestamp: now,
      };

      if (status === "checking") {
        reportMessage(t("settingsPage.status.checkingUpdates"), "info");
        return;
      }

      if (status === "available") {
        const nextVersion =
          typeof payload?.info?.version === "string"
            ? payload.info.version
            : "";

        if (nextVersion && lastUpdatePromptRef.current !== nextVersion) {
          lastUpdatePromptRef.current = nextVersion;
          setUpdatePromptVersion(nextVersion);
          setIsUpdatePromptOpen(true);
        }
        return;
      }

      if (status === "downloaded") {
        reportMessage(t("settingsPage.status.updateReady"), "success");
        return;
      }

      if (status === "none") {
        reportMessage(t("settingsPage.status.upToDate"), "success");
        return;
      }

      if (status === "error") {
        if (payload.code === "signature" && payload.downloadsReady) {
          reportMessage(t("settingsPage.errors.updateSignature"), "error", {
            label: t("settingsPage.openDownloads"),
            onClick: openDownloadsFolder,
            disableAutoClose: true,
          });
          return;
        }

        console.warn(payload.message);
        reportMessage(t("settingsPage.errors.updateCheck"), "error");
      }
    },
    [openDownloadsFolder, reportMessage, t],
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
          setDbPath("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [systemRepository]);

  useEffect(() => {
    let cancelled = false;

    runtimeGateway
      .getAppVersion()
      .then((value) => {
        if (!cancelled) {
          setAppVersion(resolveAppVersion(value));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAppVersion("");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [runtimeGateway]);

  const appVersionLabel = useMemo(() => {
    if (!appVersion) {
      return t("account.sync.unavailable.label");
    }

    return `v${appVersion}`;
  }, [appVersion, t]);

  const appPlatformLabel = useMemo(
    () => (isDesktopMode ? t("settingsPage.platformDesktop") : t("settingsPage.platformWeb")),
    [isDesktopMode, t],
  );

  const openDbFolder = useCallback(async () => {
    try {
      await systemRepository.openDbFolder();
    } catch (openError) {
      reportMessage(errorText(openError, "settingsPage.errors.openFolder"), "error");
    }
  }, [errorText, reportMessage, systemRepository]);

  const checkForUpdates = useCallback(async () => {
    setIsCheckingUpdates(true);

    try {
      const result = await runtimeGateway.checkForUpdates();
      const status = result?.status;

      if (status === "disabled") {
        reportMessage(t("settingsPage.status.updatesDesktopOnly"), "info");
      } else if (status === "available") {
        const nextVersion =
          typeof result?.info?.version === "string"
            ? result.info.version
            : "";

        if (nextVersion) {
          lastUpdatePromptRef.current = "";
          setUpdatePromptVersion(nextVersion);
          setIsUpdatePromptOpen(true);
        }
      } else if (status === "none") {
        reportMessage(t("settingsPage.status.upToDate"), "success");
      } else if (status === "error") {
        console.warn(result.message);
        reportMessage(t("settingsPage.errors.updateCheck"), "error");
      } else {
        reportMessage(t("settingsPage.status.checkingUpdates"), "info");
      }
    } catch (error) {
      reportMessage(errorText(error, "settingsPage.errors.updateCheck"), "error");
    } finally {
      setIsCheckingUpdates(false);
    }
  }, [errorText, reportMessage, runtimeGateway, t]);

  const closeUpdatePrompt = useCallback(() => {
    setIsUpdatePromptOpen(false);
    lastUpdatePromptRef.current = "";
  }, []);

  const confirmUpdateDownload = useCallback(async () => {
    setIsUpdateDownloading(true);

    try {
      const result = await runtimeGateway.downloadUpdate();
      if (result?.status === "error") {
        console.warn(result.message);
        reportMessage(t("settingsPage.errors.updateDownload"), "error");
      }
    } catch (error) {
      reportMessage(errorText(error, "settingsPage.errors.updateDownload"), "error");
    } finally {
      setIsUpdateDownloading(false);
      setIsUpdatePromptOpen(false);
    }
  }, [errorText, reportMessage, runtimeGateway, t]);

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
          ? t("settingsPage.status.dbMoved")
          : t("settingsPage.status.dbLocationChanged"),
        "success",
      );
    } catch (changeError) {
      reportMessage(errorText(changeError, "settingsPage.errors.dbLocation"), "error");
    } finally {
      setIsChangingDbLocation(false);
    }
  }, [errorText, reportMessage, systemRepository, t]);

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
      if (isHealthy) {
        reportMessage(
          backupPaths.length > 0
            ? t("settingsPage.status.restoredWithBackup", { path: backupPaths[0] })
            : t("settingsPage.status.restored"),
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
        reportMessage(
          allIssues.length > 0
            ? t("settingsPage.errors.restoreIssue", { issue: allIssues[0] })
            : t("settingsPage.errors.restore"),
          "error",
        );
      }
    } catch (repairError) {
      reportMessage(errorText(repairError, "settingsPage.errors.restore"), "error");
    } finally {
      setIsRepairingIntegrity(false);

      if (closeConfirm) {
        closeIntegrityRepairConfirm();
      }
    }
  }, [closeIntegrityRepairConfirm, errorText, reportMessage, systemRepository, t]);

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
        reportMessage(t("settingsPage.status.integrityOk"), "success");
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
          t("settingsPage.status.integrityNeedsRepair"),
          "info",
        );
        return;
      }

      const allIssues = [...databaseIssues, ...coreFilesIssues];
      reportMessage(
        allIssues.length > 0
          ? t("settingsPage.errors.integrityIssue", { issue: allIssues[0] })
          : t("settingsPage.errors.integrity"),
        "error",
      );
    } catch (verifyError) {
      reportMessage(errorText(verifyError, "settingsPage.errors.integrity"), "error");
    } finally {
      setIsVerifyingIntegrity(false);
    }
  }, [
    appPreferences.dataSafety.confirmDestructive,
    closeIntegrityRepairConfirm,
    errorText,
    reportMessage,
    runIntegrityRepair,
    systemRepository,
    t,
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

      reportMessage(t("settingsPage.status.resetDone"), "success");
    } catch (resetError) {
      reportMessage(errorText(resetError, "settingsPage.errors.reset"), "error");
    } finally {
      setIsResettingSettings(false);
      setIsResetSettingsConfirmOpen(false);
    }
  }, [errorText, reportMessage, settingsRepository, t]);

  return {
    isDesktopMode,
    selectedSettingsTab,
    highlightedSettingsTab,
    dbPath,
    appVersionLabel,
    appPlatformLabel,
    statusMessage,
    statusVariant,
    statusAction,
    statusActionSticky: Boolean(statusAction?.disableAutoClose),
    isUpdatePromptOpen,
    updatePromptVersion,
    isUpdateDownloading,
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
    closeUpdatePrompt,
    confirmUpdateDownload,
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
