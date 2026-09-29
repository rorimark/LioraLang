import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  FiArchive,
  FiBookOpen,
  FiChevronLeft,
  FiChevronRight,
  FiDownload,
  FiHardDrive,
  FiLayers,
  FiLock,
  FiRefreshCw,
  FiSearch,
  FiSliders,
  FiUser,
  FiX,
} from "react-icons/fi";
import {
  DeckDefaultPreferences,
  DisplayPreferences,
  ImportExportPreferences,
  LearningPreferences,
  PrivacyPreferences,
  SafetyPreferences,
} from "@features/app-preferences";
import { CreateDeckFromJsonModal, ImportDeckModal } from "@features/deck-import";
import { IntegrityRepairModal } from "@features/integrity-repair";
import { ShortcutSettingsSection } from "@features/shortcut-settings";
import { SyncSettingsSection } from "@features/sync-settings";
import { ThemeSwitch } from "@features/theme-switch";
import { ROUTE_PATHS } from "@shared/config/routes";
import { SETTINGS_TAB_KEYS, SETTINGS_TAB_QUERY_KEY } from "@shared/config/settingsTabs";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { usePlatformService } from "@shared/providers";
import {
  ActionModal,
  Button,
  InlineAlert,
  Panel,
  SettingGroup,
  SettingRow,
  SettingsScope,
  SettingsSearch,
} from "@shared/ui";
import { useSettingsDatabasePanel } from "../model";
import { buildSettingsSummaries } from "../model/settingsSummaries";
import "./SettingsDatabasePanel.css";
import { useI18n } from "@shared/lib/i18n";

// The sections, in the order people look for them. The keys are the tab
// keys the desktop app menu and links already use; titles and descriptions
// are settingsPage.sections.<key>.
const SETTINGS_SECTIONS = [
  {
    key: SETTINGS_TAB_KEYS.general,
    keywords: "appearance theme keyboard about version reset",
    icon: FiSliders,
  },
  {
    key: SETTINGS_TAB_KEYS.learningCore,
    keywords: "study srs spaced repetition review",
    icon: FiLayers,
  },
  {
    key: SETTINGS_TAB_KEYS.deckDefaults,
    keywords: "deck defaults language level tags",
    icon: FiBookOpen,
  },
  {
    key: SETTINGS_TAB_KEYS.sync,
    keywords: "cloud devices account",
    icon: FiRefreshCw,
  },
  {
    key: SETTINGS_TAB_KEYS.importExport,
    keywords: "file json lioradeck",
    icon: FiDownload,
  },
  {
    key: SETTINGS_TAB_KEYS.workspaceSafety,
    keywords: "backup data protect",
    icon: FiArchive,
  },
  {
    key: SETTINGS_TAB_KEYS.advancedDesktop,
    keywords: "analytics crash logs developer desktop",
    icon: FiLock,
  },
  {
    key: SETTINGS_TAB_KEYS.storageIntegrity,
    keywords: "database folder integrity files",
    icon: FiHardDrive,
    desktopOnly: true,
  },
];

const EMPTY_ACCOUNT_SNAPSHOT = Object.freeze({
  isAuthenticated: false,
  isEmailVerified: false,
  email: "",
  displayName: "",
});

export const SettingsDatabasePanel = memo(() => {
  const panel = useSettingsDatabasePanel();
  const i18n = useI18n();
  const { t } = i18n;
  const authRepository = usePlatformService("authRepository");
  const [accountSnapshot, setAccountSnapshot] = useState(EMPTY_ACCOUNT_SNAPSHOT);

  useEffect(() => {
    if (!authRepository?.isConfigured?.()) {
      return undefined;
    }

    let isSubscribed = true;

    authRepository
      .getSnapshot()
      .then((snapshot) => {
        if (isSubscribed) {
          setAccountSnapshot(snapshot || EMPTY_ACCOUNT_SNAPSHOT);
        }
      })
      .catch(() => {
        if (isSubscribed) {
          setAccountSnapshot(EMPTY_ACCOUNT_SNAPSHOT);
        }
      });

    const unsubscribe = authRepository.subscribe((snapshot) => {
      if (isSubscribed) {
        setAccountSnapshot(snapshot || EMPTY_ACCOUNT_SNAPSHOT);
      }
    });

    return () => {
      isSubscribed = false;
      unsubscribe?.();
    };
  }, [authRepository]);

  const accountEntry = useMemo(() => {
    if (!authRepository?.isConfigured?.()) {
      return {
        title: t("settingsPage.account.unavailableTitle"),
        description: t("settingsPage.account.unavailableText"),
        badge: t("account.sync.unavailable.label"),
        badgeAccent: false,
      };
    }

    if (!accountSnapshot.isAuthenticated) {
      return {
        title: t("settingsPage.account.guestTitle"),
        description: t("settingsPage.account.guestText"),
        badge: t("settingsPage.account.guestBadge"),
        badgeAccent: false,
      };
    }

    return {
      title: accountSnapshot.displayName || accountSnapshot.email || t("settingsPage.account.open"),
      description: accountSnapshot.isEmailVerified
        ? t("settingsPage.account.verifiedText")
        : t("settingsPage.account.unverifiedText"),
      badge: accountSnapshot.isEmailVerified ? t("account.verified") : t("settingsPage.account.verifyBadge"),
      badgeAccent: accountSnapshot.isEmailVerified,
    };
  }, [accountSnapshot, authRepository, t]);

  const accountInitial = accountSnapshot.isAuthenticated
    ? (accountSnapshot.displayName || accountSnapshot.email || "").trim().charAt(0).toUpperCase()
    : "";
  const settingsNavItems = useMemo(
    () =>
      SETTINGS_SECTIONS.filter((section) => !section.desktopOnly || panel.isDesktopMode).map(
        (section) => ({
          ...section,
          title:
            section.key === SETTINGS_TAB_KEYS.advancedDesktop && panel.isDesktopMode
              ? t("settingsPage.sections.advanced-desktop.desktopTitle")
              : t(`settingsPage.sections.${section.key}.title`),
          description: t(`settingsPage.sections.${section.key}.description`),
        }),
      ),
    [panel.isDesktopMode, t],
  );
  const availableSettingsTabs = useMemo(
    () => new Set(settingsNavItems.map((item) => item.key)),
    [settingsNavItems],
  );
  const resolvedHighlightedTab = useMemo(
    () => (
      availableSettingsTabs.has(panel.highlightedSettingsTab)
        ? panel.highlightedSettingsTab
        : ""
    ),
    [availableSettingsTabs, panel.highlightedSettingsTab],
  );
  const themeControl = useMemo(
    () => ({
      themeMode: panel.themeMode,
      themeModeOptions: panel.themeModeOptions,
      onThemeModeChange: panel.handleThemeModeChange,
    }),
    [
      panel.handleThemeModeChange,
      panel.themeMode,
      panel.themeModeOptions,
    ],
  );
  const importModal = useMemo(
    () => ({
      isOpen: panel.isImportConfirmOpen,
      isImporting: panel.isImporting,
      selectedFileName: panel.selectedImportFileName,
      selectedWordsCount: panel.selectedImportWordsCount,
      deckNameDraft: panel.importDeckNameDraft,
      importLanguages: panel.importLanguages,
      languageOptions: panel.languageOptions,
      isLanguageReviewOpen: panel.isLanguageReviewOpen,
      onDeckNameChange: panel.handleImportDeckNameDraftChange,
      onLanguageChange: panel.handleImportLanguageChange,
      onOpenLanguageReview: panel.openLanguageReview,
      onCloseLanguageReview: panel.closeLanguageReview,
      onToggleLanguageReview: panel.toggleLanguageReview,
      onConfirm: panel.confirmImportDeck,
      onClose: panel.closeImportConfirm,
    }),
    [
      panel.closeImportConfirm,
      panel.closeLanguageReview,
      panel.confirmImportDeck,
      panel.handleImportDeckNameDraftChange,
      panel.handleImportLanguageChange,
      panel.importDeckNameDraft,
      panel.importLanguages,
      panel.isImportConfirmOpen,
      panel.isImporting,
      panel.isLanguageReviewOpen,
      panel.languageOptions,
      panel.openLanguageReview,
      panel.selectedImportFileName,
      panel.selectedImportWordsCount,
      panel.toggleLanguageReview,
    ],
  );
  const jsonImportModal = useMemo(
    () => ({
      isOpen: panel.isJsonImportOpen,
      isImporting: panel.isImporting,
      deckNameDraft: panel.jsonDeckNameDraft,
      jsonText: panel.pasteTextDraft,
      jsonError: panel.pasteError,
      onDeckNameChange: panel.handleJsonDeckNameChange,
      onJsonTextChange: panel.handlePasteTextChange,
      onConfirm: panel.importFromPaste,
      onClose: panel.closeJsonImport,
    }),
    [
      panel.closeJsonImport,
      panel.handleJsonDeckNameChange,
      panel.handlePasteTextChange,
      panel.importFromPaste,
      panel.isImporting,
      panel.isJsonImportOpen,
      panel.jsonDeckNameDraft,
      panel.pasteError,
      panel.pasteTextDraft,
    ],
  );
  const statusAlert = useMemo(
    () => ({
      text: panel.statusMessage,
      variant: panel.statusVariant,
      action: panel.statusAction,
      disableAutoClose: panel.statusActionSticky,
      onClose: panel.clearStatusMessage,
    }),
    [
      panel.clearStatusMessage,
      panel.statusAction,
      panel.statusActionSticky,
      panel.statusMessage,
      panel.statusVariant,
    ],
  );
  const updatePromptDialog = useMemo(
    () => ({
      isOpen: panel.isUpdatePromptOpen,
      title: t("settingsPage.update.title"),
      description: panel.updatePromptVersion
        ? t("settingsPage.update.version", { version: panel.updatePromptVersion })
        : t("settingsPage.update.generic"),
      confirmLabel: t("settingsPage.update.download"),
      cancelLabel: t("settingsPage.update.notNow"),
      isConfirming: panel.isUpdateDownloading,
      onConfirm: panel.confirmUpdateDownload,
      onClose: panel.closeUpdatePrompt,
    }),
    [
      panel.closeUpdatePrompt,
      panel.confirmUpdateDownload,
      panel.isUpdateDownloading,
      panel.isUpdatePromptOpen,
      panel.updatePromptVersion,
      t,
    ],
  );
  const resetSettingsDialog = useMemo(
    () => ({
      isOpen: panel.isResetSettingsConfirmOpen,
      title: t("settingsPage.reset.title"),
      description: t("settingsPage.reset.description"),
      confirmLabel: t("settingsPage.reset.confirm"),
      cancelLabel: t("common.cancel"),
      isConfirming: panel.isResettingSettings,
      onConfirm: panel.resetAllSettingsToDefaults,
      onClose: panel.closeResetSettingsConfirm,
    }),
    [
      panel.closeResetSettingsConfirm,
      panel.isResetSettingsConfirmOpen,
      panel.isResettingSettings,
      panel.resetAllSettingsToDefaults,
      t,
    ],
  );

  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const isSearching = query.trim().length > 0;
  const hasRequestedTab = searchParams.has(SETTINGS_TAB_QUERY_KEY);
  const activeSettingsTab = availableSettingsTabs.has(panel.selectedSettingsTab)
    ? panel.selectedSettingsTab
    : SETTINGS_TAB_KEYS.general;
  const activeSection =
    settingsNavItems.find((section) => section.key === activeSettingsTab) || settingsNavItems[0];
  const { appPreferences } = useAppPreferences();
  const summaries = useMemo(
    () =>
      buildSettingsSummaries({
        appPreferences,
        themeMode: panel.themeMode,
        isDesktopMode: panel.isDesktopMode,
        i18n,
      }),
    [appPreferences, i18n, panel.isDesktopMode, panel.themeMode],
  );

  // A phone shows one pane at a time: the list of sections, or the one you
  // opened. Wide screens show both, so the list never hides.
  const view = isSearching ? "results" : hasRequestedTab ? "section" : "list";

  useEffect(() => {
    // Opening a section, or going back to the list, starts at the top.
    if (isSearching || typeof window === "undefined") {
      return;
    }

    window.scrollTo?.({ top: 0 });
    document.querySelector(".app-shell__content")?.scrollTo?.({ top: 0 });
  }, [activeSettingsTab, hasRequestedTab, isSearching]);

  const handleQueryChange = useCallback((event) => {
    setQuery(event.target.value);
  }, []);

  const clearQuery = useCallback(() => {
    setQuery("");
  }, []);

  const renderSectionBody = (sectionKey) => {
    switch (sectionKey) {
      case SETTINGS_TAB_KEYS.general:
        return (
          <>
            <SettingGroup title={t("settingsPage.appearance")} keywords="display look">
              <ThemeSwitch control={themeControl} />
              <DisplayPreferences />
            </SettingGroup>

            <SettingGroup
              title={t("settingsPage.keyboard")}
              description={t("settingsPage.keyboardNote")}
              keywords="shortcuts keys hotkeys"
            >
              <ShortcutSettingsSection />
            </SettingGroup>

            <SettingGroup title={t("settingsPage.about")} keywords="version update">
              <SettingRow
                label={t("settingsPage.version")}
                hint={panel.appPlatformLabel}
                keywords="about build"
                control={<strong className="settings__value">{panel.appVersionLabel}</strong>}
              />
              {panel.isDesktopMode ? (
                <SettingRow
                  label={t("prefs.updates")}
                  keywords="update download new version"
                  control={
                    <Button
                      onClick={panel.checkForUpdates}
                      disabled={panel.isCheckingUpdates}
                      variant="secondary"
                      size="sm"
                    >
                      {panel.isCheckingUpdates ? t("settingsPage.checking") : t("settingsPage.checkNow")}
                    </Button>
                  }
                />
              ) : null}
              <SettingRow
                label={t("settingsPage.resetAll")}
                hint={t("settingsPage.resetAllHint")}
                keywords="defaults restore"
                tone="danger"
                control={
                  <Button
                    onClick={panel.openResetSettingsConfirm}
                    disabled={panel.isResetAllDisabled}
                    variant="danger"
                    size="sm"
                  >
                    {panel.isResettingSettings ? t("settingsPage.resetting") : t("settingsPage.resetButton")}
                  </Button>
                }
              />
            </SettingGroup>
          </>
        );
      case SETTINGS_TAB_KEYS.learningCore:
        return <LearningPreferences />;
      case SETTINGS_TAB_KEYS.deckDefaults:
        return <DeckDefaultPreferences />;
      case SETTINGS_TAB_KEYS.sync:
        return <SyncSettingsSection />;
      case SETTINGS_TAB_KEYS.importExport:
        return (
          <>
            <SettingGroup title={t("settingsPage.addDeck")} keywords="import new">
              <SettingRow
                label={t("settingsPage.importFile")}
                hint={t("settingsPage.importFileHint")}
                keywords="import upload open"
                control={
                  <Button
                    onClick={panel.openImportConfirm}
                    disabled={panel.isImporting}
                    variant="primary"
                    size="sm"
                  >
                    {panel.isImporting ? t("browse.importing") : t("settingsPage.chooseFile")}
                  </Button>
                }
              />
              <SettingRow
                label={t("decks.fromJson")}
                hint={t("settingsPage.pasteHint")}
                keywords="paste json text"
                control={
                  <Button
                    onClick={panel.openJsonImport}
                    disabled={panel.isImporting}
                    variant="secondary"
                    size="sm"
                  >
                    {t("settingsPage.pasteJson")}
                  </Button>
                }
              />
            </SettingGroup>
            <ImportExportPreferences />
          </>
        );
      case SETTINGS_TAB_KEYS.workspaceSafety:
        return <SafetyPreferences />;
      case SETTINGS_TAB_KEYS.advancedDesktop:
        return <PrivacyPreferences isDesktopMode={panel.isDesktopMode} />;
      case SETTINGS_TAB_KEYS.storageIntegrity:
        return (
          <SettingGroup title={t("settingsPage.database")} keywords="storage files">
            <SettingRow
              label={t("settingsPage.location")}
              hint={panel.dbPath || t("common.loading")}
              keywords="database path folder"
              control={
                <span className="settings__row-keys">
                  <Button onClick={panel.openDbFolder} variant="secondary" size="sm">
                    {t("settingsPage.openFolder")}
                  </Button>
                  <Button
                    onClick={panel.changeDbLocation}
                    disabled={panel.isChangingDbLocation}
                    variant="secondary"
                    size="sm"
                  >
                    {panel.isChangingDbLocation ? t("settingsPage.moving") : t("settingsPage.move")}
                  </Button>
                </span>
              }
            />
            <SettingRow
              label={t("settingsPage.checkFiles")}
              hint={t("settingsPage.checkFilesHint")}
              keywords="integrity verify repair"
              control={
                <Button
                  onClick={panel.verifyIntegrity}
                  disabled={panel.isVerifyingIntegrity}
                  variant="secondary"
                  size="sm"
                >
                  {panel.isVerifyingIntegrity ? t("settingsPage.checking") : t("settingsPage.check")}
                </Button>
              }
            />
          </SettingGroup>
        );
      default:
        return null;
    }
  };

  return (
    <Panel className="settings-page-panel">
      <InlineAlert alert={statusAlert} />

      <ActionModal dialog={updatePromptDialog} />

      <SettingsSearch query={query}>
        <div className="settings" data-view={view}>
          <nav className="settings__nav" aria-label={t("settingsPage.sectionsLabel")}>
            {/* The account is who is using the app, not one setting among
                many, so it sits apart, above everything else. */}
            <Link
              to={ROUTE_PATHS.account}
              className="settings__account"
              aria-label={t("settingsPage.account.aria", { title: accountEntry.title, badge: accountEntry.badge })}
            >
              <span className="settings__avatar" aria-hidden="true">
                {accountInitial || <FiUser />}
              </span>
              <span className="settings__account-copy">
                <strong>{accountEntry.title}</strong>
                <span>{accountEntry.description}</span>
              </span>
              <span className="settings__account-badge">{accountEntry.badge}</span>
            </Link>

            <label className="settings__search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={handleQueryChange}
                placeholder={t("settingsPage.search")}
                aria-label={t("settingsPage.search")}
                autoComplete="off"
                enterKeyHint="search"
              />
              {isSearching ? (
                <button type="button" onClick={clearQuery} aria-label={t("common.clearSearch")}>
                  <FiX aria-hidden="true" />
                </button>
              ) : null}
            </label>

            <ul className="settings__sections">
              {settingsNavItems.map((section) => {
                const Icon = section.icon;
                const isActive = section.key === activeSettingsTab;
                const className = [
                  "settings__section-link",
                  isActive ? "is-active" : "",
                  resolvedHighlightedTab === section.key ? "is-highlighted" : "",
                ]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <li key={section.key}>
                    <Link
                      className={className}
                      to={`${ROUTE_PATHS.settings}?${SETTINGS_TAB_QUERY_KEY}=${section.key}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={clearQuery}
                    >
                      <span className="settings__section-icon" aria-hidden="true">
                        <Icon />
                      </span>
                      <span className="settings__section-copy">
                        <strong>{section.title}</strong>
                        <span>{summaries[section.key] || section.description}</span>
                      </span>
                      <FiChevronRight className="settings__section-chevron" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="settings__content">
            {isSearching ? (
              <div className="settings__results">
                {settingsNavItems.map((section) => (
                  <SettingsScope
                    key={section.key}
                    title={section.title}
                    keywords={section.keywords}
                  >
                    <section className="settings__result">
                      <h2 className="settings__result-title">{section.title}</h2>
                      {renderSectionBody(section.key)}
                    </section>
                  </SettingsScope>
                ))}
                <p className="settings__empty">
                  {t("settingsPage.noMatch", { query: query.trim() })}
                </p>
              </div>
            ) : (
              <section className="settings__section" key={activeSection.key}>
                <Link className="settings__back" to={ROUTE_PATHS.settings}>
                  <FiChevronLeft aria-hidden="true" />
                  <span>{t("settingsPage.all")}</span>
                </Link>
                <header className="settings__section-head">
                  <h2>{activeSection.title}</h2>
                  <p>{activeSection.description}</p>
                </header>
                {renderSectionBody(activeSection.key)}
              </section>
            )}
          </div>
        </div>
      </SettingsSearch>

      <ImportDeckModal modal={importModal} />

      <CreateDeckFromJsonModal modal={jsonImportModal} />

      <IntegrityRepairModal
        isOpen={panel.isIntegrityRepairConfirmOpen}
        issues={panel.integrityRepairIssues}
        isRepairing={panel.isRepairingIntegrity}
        onConfirm={panel.confirmIntegrityRepair}
        onClose={panel.closeIntegrityRepairConfirm}
      />

      <ActionModal dialog={resetSettingsDialog} />
    </Panel>
  );
});

SettingsDatabasePanel.displayName = "SettingsDatabasePanel";
