import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  AppPreferencesSection,
  ImportExportSettingsSection,
} from "@features/app-preferences";
import { CreateDeckFromJsonModal, ImportDeckModal } from "@features/deck-import";
import { IntegrityRepairModal } from "@features/integrity-repair";
import { ShortcutSettingsSection } from "@features/shortcut-settings";
import { ThemeSwitch } from "@features/theme-switch";
import { SETTINGS_SECTION_IDS, SETTINGS_TAB_KEYS } from "@shared/config/settingsTabs";
import {
  ActionModal,
  Button,
  InlineAlert,
  Panel,
  SectionHeader,
  Tabs,
} from "@shared/ui";
import { useSettingsDatabasePanel } from "../model";
import "./SettingsDatabasePanel.css";

const BASE_SETTINGS_NAV_ITEMS = [
  { key: SETTINGS_TAB_KEYS.general, label: "General" },
  { key: SETTINGS_TAB_KEYS.learningCore, label: "Learning Core" },
  { key: SETTINGS_TAB_KEYS.deckDefaults, label: "Deck Defaults" },
  { key: SETTINGS_TAB_KEYS.workspaceSafety, label: "Workspace and Safety" },
];

const APP_PREFERENCES_TAB_KEYS = new Set([
  SETTINGS_TAB_KEYS.learningCore,
  SETTINGS_TAB_KEYS.deckDefaults,
  SETTINGS_TAB_KEYS.workspaceSafety,
  SETTINGS_TAB_KEYS.advancedDesktop,
]);

const resolveSectionClassName = (tabKey, highlightedTab) => {
  if (highlightedTab === tabKey) {
    return "settings-page-panel__section settings-page-panel__section--active";
  }

  return "settings-page-panel__section";
};

export const SettingsDatabasePanel = memo(() => {
  const panel = useSettingsDatabasePanel();

  const settingsNavItems = useMemo(() => {
    const items = [
      ...BASE_SETTINGS_NAV_ITEMS,
      {
        key: SETTINGS_TAB_KEYS.advancedDesktop,
        label: panel.isDesktopMode ? "Desktop and Privacy" : "Privacy",
      },
      { key: SETTINGS_TAB_KEYS.importExport, label: "Import and Export" },
    ];

    if (panel.isDesktopMode) {
      items.push({
        key: SETTINGS_TAB_KEYS.storageIntegrity,
        label: "Storage and Integrity",
      });
    }

    return items;
  }, [panel.isDesktopMode]);
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
  const [activeSettingsTab, setActiveSettingsTab] = useState(panel.selectedSettingsTab);
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

  useEffect(() => {
    const nextTab = availableSettingsTabs.has(panel.selectedSettingsTab)
      ? panel.selectedSettingsTab
      : SETTINGS_TAB_KEYS.general;

    if (typeof window === "undefined") {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setActiveSettingsTab((currentTab) => {
        if (currentTab === nextTab) {
          return currentTab;
        }

        return nextTab;
      });
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [availableSettingsTabs, panel.selectedSettingsTab]);

  const handleQuickNavClick = useCallback((nextTabKey) => {
    if (!nextTabKey) {
      return;
    }

    setActiveSettingsTab(nextTabKey);
  }, []);

  const isAppPreferencesTab = APP_PREFERENCES_TAB_KEYS.has(activeSettingsTab);

  return (
    <Panel className="settings-page-panel">
      <InlineAlert alert={statusAlert} />

      <ActionModal dialog={updatePromptDialog} />

      <Tabs
        ariaLabel="Settings sections"
        items={settingsNavItems}
        activeKey={activeSettingsTab}
        highlightedKey={resolvedHighlightedTab}
        onSelect={handleQuickNavClick}
      />

      {activeSettingsTab === SETTINGS_TAB_KEYS.general ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.general]}
          className={resolveSectionClassName(
            SETTINGS_TAB_KEYS.general,
            resolvedHighlightedTab,
          )}
        >
          <SectionHeader
            title="General"
            description="Theme, shortcuts, and everyday interface behavior."
          />

          <div className="settings-page-panel__stack">
            <div className="settings-page-panel__slot">
              <h4>Appearance</h4>
              <ThemeSwitch control={themeControl} />
            </div>

            <div className="settings-page-panel__slot">
              <h4>Shortcuts</h4>
              <ShortcutSettingsSection compact />
            </div>

            {panel.isDesktopMode ? (
              <div className="settings-page-panel__slot">
                <h4>Updates</h4>
                <div className="settings-page-panel__actions">
                  <Button
                    onClick={panel.checkForUpdates}
                    disabled={panel.isCheckingUpdates}
                    variant="secondary"
                  >
                    {panel.isCheckingUpdates ? "Checking..." : "Check for updates"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="settings-page-panel__slot">
              <h4>About</h4>
              <div className="settings-page-panel__meta">
                <span>Version</span>
                <strong>{panel.appVersionLabel}</strong>
                <span className="settings-page-panel__meta-separator">•</span>
                <span>{panel.appPlatformLabel}</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isAppPreferencesTab ? (
        <AppPreferencesSection
          highlightedTab={resolvedHighlightedTab}
          activeTabKey={activeSettingsTab}
          isDesktopMode={panel.isDesktopMode}
        />
      ) : null}

      {activeSettingsTab === SETTINGS_TAB_KEYS.importExport ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.importExport]}
          className={resolveSectionClassName(
            SETTINGS_TAB_KEYS.importExport,
            resolvedHighlightedTab,
          )}
        >
          <SectionHeader
            title="Deck Import and Export"
            description="Import local deck files and define default import/export behavior."
          />

          <div className="settings-page-panel__actions">
            <Button
              onClick={panel.openImportConfirm}
              disabled={panel.isImporting}
              variant="primary"
            >
              {panel.isImporting ? "Importing..." : "Import deck file"}
            </Button>
            <Button onClick={panel.openJsonImport} disabled={panel.isImporting}>
              Create deck from JSON
            </Button>
          </div>

          <ImportExportSettingsSection />
        </section>
      ) : null}

      {panel.isDesktopMode && activeSettingsTab === SETTINGS_TAB_KEYS.storageIntegrity ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.storageIntegrity]}
          className={resolveSectionClassName(
            SETTINGS_TAB_KEYS.storageIntegrity,
            resolvedHighlightedTab,
          )}
        >
          <SectionHeader
            title="Storage and Integrity"
            description="Control database location and run file/database integrity checks."
          />

          <div className="settings-page-panel__path">
            DB: {panel.dbPath || "Loading..."}
          </div>

          <div className="settings-page-panel__section-grid settings-page-panel__section-grid--actions">
            <div className="settings-page-panel__actions">
              <Button
                onClick={panel.changeDbLocation}
                disabled={panel.isChangingDbLocation}
              >
                {panel.isChangingDbLocation
                  ? "Changing database location..."
                  : "Change database location"}
              </Button>

              <Button onClick={panel.openDbFolder}>Open database folder</Button>
              <Button
                onClick={panel.verifyIntegrity}
                disabled={panel.isVerifyingIntegrity}
              >
                {panel.isVerifyingIntegrity
                  ? "Checking integrity..."
                  : "Check file integrity"}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {activeSettingsTab === SETTINGS_TAB_KEYS.general ? (
        <section className="settings-page-panel__section settings-page-panel__section--danger">
          <SectionHeader
            title="Reset"
            description="Restore all settings to the default configuration."
          />

          <div className="settings-page-panel__actions">
            <Button
              onClick={panel.openResetSettingsConfirm}
              disabled={panel.isResetAllDisabled}
              variant="danger"
            >
              {panel.isResettingSettings
                ? "Resetting settings..."
                : "Reset all settings to defaults"}
            </Button>
          </div>
        </section>
      ) : null}

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
