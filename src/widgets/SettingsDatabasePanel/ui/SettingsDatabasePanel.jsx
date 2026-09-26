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

// The sections, in the order people look for them. The keys are the tab
// keys the desktop app menu and links already use.
const SETTINGS_SECTIONS = [
  {
    key: SETTINGS_TAB_KEYS.general,
    title: "General",
    description: "Account, theme, display and keys.",
    keywords: "appearance theme keyboard account about version reset",
    icon: FiSliders,
  },
  {
    key: SETTINGS_TAB_KEYS.learningCore,
    title: "Learning",
    description: "Sessions, and how often words come back.",
    keywords: "study srs spaced repetition review",
    icon: FiLayers,
  },
  {
    key: SETTINGS_TAB_KEYS.deckDefaults,
    title: "New decks",
    description: "What a new deck starts with. Each deck can change it.",
    keywords: "deck defaults language level tags",
    icon: FiBookOpen,
  },
  {
    key: SETTINGS_TAB_KEYS.sync,
    title: "Sync",
    description: "Your decks and progress across devices.",
    keywords: "cloud devices account",
    icon: FiRefreshCw,
  },
  {
    key: SETTINGS_TAB_KEYS.importExport,
    title: "Import and export",
    description: "Deck files in and out.",
    keywords: "file json lioradeck",
    icon: FiDownload,
  },
  {
    key: SETTINGS_TAB_KEYS.workspaceSafety,
    title: "Backups and safety",
    description: "Automatic backups and confirmations.",
    keywords: "backup data protect",
    icon: FiArchive,
  },
  {
    key: SETTINGS_TAB_KEYS.advancedDesktop,
    title: "Privacy",
    description: "Diagnostics, and options for developers.",
    keywords: "analytics crash logs developer desktop",
    icon: FiLock,
  },
  {
    key: SETTINGS_TAB_KEYS.storageIntegrity,
    title: "Storage",
    description: "Where the database lives, and checking it.",
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
        sectionTitle: "Sign in",
        title: "Accounts unavailable",
        description:
          "Add Supabase config to enable sign in, publishing, and Hub management.",
        badge: "Unavailable",
        badgeAccent: false,
      };
    }

    if (!accountSnapshot.isAuthenticated) {
      return {
        sectionTitle: "Sign in",
        title: "Sign in or create account",
        description:
          "Browse stays open for guests. Sign in to publish and manage Hub decks.",
        badge: "Guest",
        badgeAccent: false,
      };
    }

    return {
      sectionTitle: "Account",
      title: accountSnapshot.displayName || accountSnapshot.email || "Open account",
      description: accountSnapshot.isEmailVerified
        ? "Verified account. Manage profile, Hub decks, and account security."
        : "Verify your email to publish and manage Hub decks.",
      badge: accountSnapshot.isEmailVerified ? "Verified" : "Verify email",
      badgeAccent: accountSnapshot.isEmailVerified,
    };
  }, [accountSnapshot, authRepository]);

  const settingsNavItems = useMemo(
    () =>
      SETTINGS_SECTIONS.filter((section) => !section.desktopOnly || panel.isDesktopMode).map(
        (section) =>
          section.key === SETTINGS_TAB_KEYS.advancedDesktop && panel.isDesktopMode
            ? { ...section, title: "Desktop and privacy" }
            : section,
      ),
    [panel.isDesktopMode],
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
      title: "Update Available",
      description: panel.updatePromptVersion
        ? `Version ${panel.updatePromptVersion} is ready to download.`
        : "A new version is ready to download.",
      confirmLabel: "Download update",
      cancelLabel: "Not now",
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
    ],
  );
  const resetSettingsDialog = useMemo(
    () => ({
      isOpen: panel.isResetSettingsConfirmOpen,
      title: "Reset all settings?",
      description:
        "This will restore preferences, shortcuts, and color scheme mode to defaults.",
      confirmLabel: "Reset settings",
      cancelLabel: "Cancel",
      isConfirming: panel.isResettingSettings,
      onConfirm: panel.resetAllSettingsToDefaults,
      onClose: panel.closeResetSettingsConfirm,
    }),
    [
      panel.closeResetSettingsConfirm,
      panel.isResetSettingsConfirmOpen,
      panel.isResettingSettings,
      panel.resetAllSettingsToDefaults,
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
      }),
    [appPreferences, panel.isDesktopMode, panel.themeMode],
  );

  // A phone shows one pane at a time: the list of sections, or the one you
  // opened. Wide screens show both, so the list never hides.
  const view = isSearching ? "results" : hasRequestedTab ? "section" : "list";

  useEffect(() => {
    if (isSearching || !hasRequestedTab || typeof window === "undefined") {
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
            <SettingGroup title="Account" keywords="sign in profile hub">
              <SettingRow
                label={accountEntry.title}
                hint={accountEntry.description}
                keywords="account sign in login profile"
                control={
                  <Link
                    to={ROUTE_PATHS.account}
                    className="ui-button ui-button--secondary ui-button--sm settings__link-key"
                  >
                    <span>{accountEntry.badge}</span>
                    <FiChevronRight aria-hidden="true" />
                  </Link>
                }
              />
            </SettingGroup>

            <SettingGroup title="Appearance" keywords="display look">
              <ThemeSwitch control={themeControl} />
              <DisplayPreferences />
            </SettingGroup>

            <SettingGroup
              title="Keyboard"
              description="Saved as you change them."
              keywords="shortcuts keys hotkeys"
            >
              <ShortcutSettingsSection />
            </SettingGroup>

            <SettingGroup title="About" keywords="version update">
              <SettingRow
                label="Version"
                hint={panel.appPlatformLabel}
                keywords="about build"
                control={<strong className="settings__value">{panel.appVersionLabel}</strong>}
              />
              {panel.isDesktopMode ? (
                <SettingRow
                  label="Updates"
                  keywords="update download new version"
                  control={
                    <Button
                      onClick={panel.checkForUpdates}
                      disabled={panel.isCheckingUpdates}
                      variant="secondary"
                      size="sm"
                    >
                      {panel.isCheckingUpdates ? "Checking..." : "Check now"}
                    </Button>
                  }
                />
              ) : null}
              <SettingRow
                label="Reset all settings"
                hint="Preferences, keys and theme go back to their defaults. Your decks stay."
                keywords="defaults restore"
                tone="danger"
                control={
                  <Button
                    onClick={panel.openResetSettingsConfirm}
                    disabled={panel.isResetAllDisabled}
                    variant="danger"
                    size="sm"
                  >
                    {panel.isResettingSettings ? "Resetting..." : "Reset"}
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
            <SettingGroup title="Add a deck" keywords="import new">
              <SettingRow
                label="Import a deck file"
                hint="A .lioradeck or .json file."
                keywords="import upload open"
                control={
                  <Button
                    onClick={panel.openImportConfirm}
                    disabled={panel.isImporting}
                    variant="primary"
                    size="sm"
                  >
                    {panel.isImporting ? "Importing..." : "Choose file"}
                  </Button>
                }
              />
              <SettingRow
                label="Create a deck from JSON"
                hint="Paste the words as JSON text."
                keywords="paste json text"
                control={
                  <Button
                    onClick={panel.openJsonImport}
                    disabled={panel.isImporting}
                    variant="secondary"
                    size="sm"
                  >
                    Paste JSON
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
          <SettingGroup title="Database" keywords="storage files">
            <SettingRow
              label="Location"
              hint={panel.dbPath || "Loading..."}
              keywords="database path folder"
              control={
                <span className="settings__row-keys">
                  <Button onClick={panel.openDbFolder} variant="secondary" size="sm">
                    Open folder
                  </Button>
                  <Button
                    onClick={panel.changeDbLocation}
                    disabled={panel.isChangingDbLocation}
                    variant="secondary"
                    size="sm"
                  >
                    {panel.isChangingDbLocation ? "Moving..." : "Move"}
                  </Button>
                </span>
              }
            />
            <SettingRow
              label="Check files"
              hint="Looks for damaged or missing deck data, and offers to repair it."
              keywords="integrity verify repair"
              control={
                <Button
                  onClick={panel.verifyIntegrity}
                  disabled={panel.isVerifyingIntegrity}
                  variant="secondary"
                  size="sm"
                >
                  {panel.isVerifyingIntegrity ? "Checking..." : "Check"}
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
          <nav className="settings__nav" aria-label="Settings sections">
            <label className="settings__search">
              <FiSearch aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={handleQueryChange}
                placeholder="Search settings"
                aria-label="Search settings"
                autoComplete="off"
                enterKeyHint="search"
              />
              {isSearching ? (
                <button type="button" onClick={clearQuery} aria-label="Clear search">
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
                  Nothing matches “{query.trim()}”. Try another word, like “theme” or
                  “backup”.
                </p>
              </div>
            ) : (
              <section className="settings__section" key={activeSection.key}>
                <Link className="settings__back" to={ROUTE_PATHS.settings}>
                  <FiChevronLeft aria-hidden="true" />
                  <span>All settings</span>
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
