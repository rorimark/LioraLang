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
  const {
    isDesktopMode,
    dbPath,
    appVersionLabel,
    appPlatformLabel,
    statusMessage,
    statusVariant,
    statusAction,
    statusActionSticky,
    isUpdatePromptOpen,
    updatePromptVersion,
    isUpdateDownloading,
    isCheckingUpdates,
    isChangingDbLocation,
    isVerifyingIntegrity,
    isRepairingIntegrity,
    isResettingSettings,
    selectedSettingsTab,
    highlightedSettingsTab,
    isResetSettingsConfirmOpen,
    isResetAllDisabled,
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
        isIntegrityRepairConfirmOpen,
        integrityRepairIssues,
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
    handlePasteTextChange,
    handleJsonDeckNameChange,
    importFromPaste,
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
  } = useSettingsDatabasePanel();

  const settingsNavItems = useMemo(() => {
    const items = [
      ...BASE_SETTINGS_NAV_ITEMS,
      {
        key: SETTINGS_TAB_KEYS.advancedDesktop,
        label: isDesktopMode ? "Desktop and Privacy" : "Privacy",
      },
      { key: SETTINGS_TAB_KEYS.importExport, label: "Import and Export" },
    ];

    if (isDesktopMode) {
      items.push({
        key: SETTINGS_TAB_KEYS.storageIntegrity,
        label: "Storage and Integrity",
      });
    }

    return items;
  }, [isDesktopMode]);
  const availableSettingsTabs = useMemo(
    () => new Set(settingsNavItems.map((item) => item.key)),
    [settingsNavItems],
  );
  const resolvedHighlightedTab = useMemo(
    () => (availableSettingsTabs.has(highlightedSettingsTab) ? highlightedSettingsTab : ""),
    [availableSettingsTabs, highlightedSettingsTab],
  );
  const [activeSettingsTab, setActiveSettingsTab] = useState(selectedSettingsTab);

  useEffect(() => {
    const nextTab = availableSettingsTabs.has(selectedSettingsTab)
      ? selectedSettingsTab
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
  }, [availableSettingsTabs, selectedSettingsTab]);

  const handleQuickNavClick = useCallback((nextTabKey) => {
    if (!nextTabKey) {
      return;
    }

    setActiveSettingsTab(nextTabKey);
  }, []);

  const isAppPreferencesTab = APP_PREFERENCES_TAB_KEYS.has(activeSettingsTab);

  return (
    <Panel className="settings-page-panel">
      <InlineAlert
        text={statusMessage}
        variant={statusVariant}
        action={statusAction}
        disableAutoClose={statusActionSticky}
        onClose={clearStatusMessage}
      />

      <ActionModal
        isOpen={isUpdatePromptOpen}
        title="Update Available"
        description={
          updatePromptVersion
            ? `Version ${updatePromptVersion} is ready to download.`
            : "A new version is ready to download."
        }
        confirmLabel="Download update"
        cancelLabel="Not now"
        isConfirming={isUpdateDownloading}
        onConfirm={confirmUpdateDownload}
        onClose={closeUpdatePrompt}
      />

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
              <ThemeSwitch
                themeMode={themeMode}
                themeModeOptions={themeModeOptions}
                onThemeModeChange={handleThemeModeChange}
              />
            </div>

            <div className="settings-page-panel__slot">
              <h4>Shortcuts</h4>
              <ShortcutSettingsSection compact />
            </div>

            {isDesktopMode ? (
              <div className="settings-page-panel__slot">
                <h4>Updates</h4>
                <div className="settings-page-panel__actions">
                  <Button
                    onClick={checkForUpdates}
                    disabled={isCheckingUpdates}
                    variant="secondary"
                  >
                    {isCheckingUpdates ? "Checking..." : "Check for updates"}
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="settings-page-panel__slot">
              <h4>About</h4>
              <div className="settings-page-panel__meta">
                <span>Version</span>
                <strong>{appVersionLabel}</strong>
                <span className="settings-page-panel__meta-separator">•</span>
                <span>{appPlatformLabel}</span>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {isAppPreferencesTab ? (
        <AppPreferencesSection
          highlightedTab={resolvedHighlightedTab}
          activeTabKey={activeSettingsTab}
          isDesktopMode={isDesktopMode}
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
              onClick={openImportConfirm}
              disabled={isImporting}
              variant="primary"
            >
              {isImporting ? "Importing..." : "Import deck file"}
            </Button>
            <Button onClick={openJsonImport} disabled={isImporting}>
              Create deck from JSON
            </Button>
          </div>

          <ImportExportSettingsSection />
        </section>
      ) : null}

      {isDesktopMode && activeSettingsTab === SETTINGS_TAB_KEYS.storageIntegrity ? (
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
            DB: {dbPath || "Loading..."}
          </div>

          <div className="settings-page-panel__section-grid settings-page-panel__section-grid--actions">
            <div className="settings-page-panel__actions">
              <Button onClick={changeDbLocation} disabled={isChangingDbLocation}>
                {isChangingDbLocation
                  ? "Changing database location..."
                  : "Change database location"}
              </Button>

              <Button onClick={openDbFolder}>Open database folder</Button>
              <Button
                onClick={verifyIntegrity}
                disabled={isVerifyingIntegrity}
              >
                {isVerifyingIntegrity
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
              onClick={openResetSettingsConfirm}
              disabled={isResetAllDisabled}
              variant="danger"
            >
              {isResettingSettings
                ? "Resetting settings..."
                : "Reset all settings to defaults"}
            </Button>
          </div>
        </section>
      ) : null}

      <ImportDeckModal
        isOpen={isImportConfirmOpen}
        isImporting={isImporting}
        selectedFileName={selectedImportFileName}
        selectedWordsCount={selectedImportWordsCount}
        deckNameDraft={importDeckNameDraft}
        importLanguages={importLanguages}
        languageOptions={languageOptions}
        isLanguageReviewOpen={isLanguageReviewOpen}
        onDeckNameChange={handleImportDeckNameDraftChange}
        onLanguageChange={handleImportLanguageChange}
        onOpenLanguageReview={openLanguageReview}
        onCloseLanguageReview={closeLanguageReview}
        onToggleLanguageReview={toggleLanguageReview}
        onConfirm={confirmImportDeck}
        onClose={closeImportConfirm}
      />

      <CreateDeckFromJsonModal
        isOpen={isJsonImportOpen}
        isImporting={isImporting}
        deckNameDraft={jsonDeckNameDraft}
        jsonText={pasteTextDraft}
        jsonError={pasteError}
        onDeckNameChange={handleJsonDeckNameChange}
        onJsonTextChange={handlePasteTextChange}
        onConfirm={importFromPaste}
        onClose={closeJsonImport}
      />

      <IntegrityRepairModal
        isOpen={isIntegrityRepairConfirmOpen}
        issues={integrityRepairIssues}
        isRepairing={isRepairingIntegrity}
        onConfirm={confirmIntegrityRepair}
        onClose={closeIntegrityRepairConfirm}
      />

      <ActionModal
        isOpen={isResetSettingsConfirmOpen}
        title="Reset all settings?"
        description="This will restore preferences, shortcuts, and color scheme mode to defaults."
        confirmLabel="Reset settings"
        cancelLabel="Cancel"
        isConfirming={isResettingSettings}
        onConfirm={resetAllSettingsToDefaults}
        onClose={closeResetSettingsConfirm}
      />
    </Panel>
  );
});

SettingsDatabasePanel.displayName = "SettingsDatabasePanel";
