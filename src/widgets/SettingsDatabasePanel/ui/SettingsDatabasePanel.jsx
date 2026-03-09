import { memo, useCallback, useEffect, useState } from "react";
import {
  AppPreferencesSection,
  ImportExportSettingsSection,
} from "@features/app-preferences";
import { ImportDeckModal } from "@features/deck-import";
import { IntegrityRepairModal } from "@features/integrity-repair";
import { ShortcutSettingsSection } from "@features/shortcut-settings";
import { ThemeSwitch } from "@features/theme-switch";
import { SETTINGS_SECTION_IDS, SETTINGS_TAB_KEYS } from "@shared/config/settingsTabs";
import { ActionModal, InlineAlert } from "@shared/ui";
import { useSettingsDatabasePanel } from "../model";
import "./SettingsDatabasePanel.css";

const SETTINGS_NAV_ITEMS = [
  { key: SETTINGS_TAB_KEYS.general, label: "General" },
  { key: SETTINGS_TAB_KEYS.learningCore, label: "Learning Core" },
  { key: SETTINGS_TAB_KEYS.deckDefaults, label: "Deck Defaults" },
  { key: SETTINGS_TAB_KEYS.workspaceSafety, label: "Workspace and Safety" },
  { key: SETTINGS_TAB_KEYS.advancedDesktop, label: "Desktop and Privacy" },
  { key: SETTINGS_TAB_KEYS.importExport, label: "Import and Export" },
  { key: SETTINGS_TAB_KEYS.storageIntegrity, label: "Storage and Integrity" },
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

const resolveQuickNavClassName = (tabKey, selectedTab, highlightedTab) => {
  if (highlightedTab === tabKey) {
    return "settings-page-panel__quick-nav-link settings-page-panel__quick-nav-link--highlighted";
  }

  if (selectedTab === tabKey) {
    return "settings-page-panel__quick-nav-link settings-page-panel__quick-nav-link--selected";
  }

  return "settings-page-panel__quick-nav-link";
};

export const SettingsDatabasePanel = memo(() => {
  const {
    dbPath,
    statusMessage,
    statusVariant,
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
    isIntegrityRepairConfirmOpen,
    integrityRepairIssues,
    themeMode,
    themeModeOptions,
    openImportConfirm,
    closeImportConfirm,
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
    openResetSettingsConfirm,
    closeResetSettingsConfirm,
    resetAllSettingsToDefaults,
    clearStatusMessage,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
  } = useSettingsDatabasePanel();

  const [activeSettingsTab, setActiveSettingsTab] = useState(selectedSettingsTab);

  useEffect(() => {
    setActiveSettingsTab(selectedSettingsTab);
  }, [selectedSettingsTab]);

  const handleQuickNavClick = useCallback((event) => {
    const nextTabKey = event.currentTarget.dataset.tabKey;

    if (!nextTabKey) {
      return;
    }

    setActiveSettingsTab(nextTabKey);
  }, []);

  const isAppPreferencesTab = APP_PREFERENCES_TAB_KEYS.has(activeSettingsTab);

  return (
    <article className="panel settings-page-panel">
      <InlineAlert
        text={statusMessage}
        variant={statusVariant}
        onClose={clearStatusMessage}
      />

      <nav className="settings-page-panel__quick-nav" aria-label="Settings sections">
        {SETTINGS_NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={resolveQuickNavClassName(
              item.key,
              activeSettingsTab,
              highlightedSettingsTab,
            )}
            type="button"
            data-tab-key={item.key}
            onClick={handleQuickNavClick}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {activeSettingsTab === SETTINGS_TAB_KEYS.general ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.general]}
          className={resolveSectionClassName(
            SETTINGS_TAB_KEYS.general,
            highlightedSettingsTab,
          )}
        >
          <header className="settings-page-panel__section-head">
            <h3>General</h3>
            <p>Theme, shortcuts, and everyday interface behavior.</p>
          </header>

          <div className="settings-page-panel__section-grid">
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
          </div>
        </section>
      ) : null}

      {isAppPreferencesTab ? (
        <AppPreferencesSection
          highlightedTab={highlightedSettingsTab}
          activeTabKey={activeSettingsTab}
        />
      ) : null}

      {activeSettingsTab === SETTINGS_TAB_KEYS.importExport ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.importExport]}
          className={resolveSectionClassName(
            SETTINGS_TAB_KEYS.importExport,
            highlightedSettingsTab,
          )}
        >
          <header className="settings-page-panel__section-head">
            <h3>Deck Import and Export</h3>
            <p>Import local deck files and define default import/export behavior.</p>
          </header>

          <div className="settings-page-panel__actions">
            <button
              type="button"
              onClick={openImportConfirm}
              disabled={isImporting}
            >
              {isImporting ? "Importing..." : "Import deck file"}
            </button>
          </div>

          <ImportExportSettingsSection />
        </section>
      ) : null}

      {activeSettingsTab === SETTINGS_TAB_KEYS.storageIntegrity ? (
        <section
          id={SETTINGS_SECTION_IDS[SETTINGS_TAB_KEYS.storageIntegrity]}
          className={resolveSectionClassName(
            SETTINGS_TAB_KEYS.storageIntegrity,
            highlightedSettingsTab,
          )}
        >
          <header className="settings-page-panel__section-head">
            <h3>Storage and Integrity</h3>
            <p>Control database location and run file/database integrity checks.</p>
          </header>

          <div className="settings-page-panel__path">
            DB: {dbPath || "Loading..."}
          </div>

          <div className="settings-page-panel__section-grid">
            <div className="settings-page-panel__actions">
              <button
                type="button"
                className="settings-page-panel__path-action"
                onClick={changeDbLocation}
                disabled={isChangingDbLocation}
              >
                {isChangingDbLocation
                  ? "Changing database location..."
                  : "Change database location"}
              </button>

              <button type="button" onClick={openDbFolder}>
                Open database folder
              </button>
            </div>

            <div className="settings-page-panel__actions">
              <button
                type="button"
                onClick={verifyIntegrity}
                disabled={isVerifyingIntegrity}
              >
                {isVerifyingIntegrity
                  ? "Checking integrity..."
                  : "Check file integrity"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <section className="settings-page-panel__section settings-page-panel__section--danger">
        <header className="settings-page-panel__section-head">
          <h3>Reset</h3>
          <p>Restore all settings to the default configuration.</p>
        </header>

        <div className="settings-page-panel__actions">
          <button
            type="button"
            className="settings-page-panel__reset-all-button"
            onClick={openResetSettingsConfirm}
            disabled={isResetAllDisabled}
          >
            {isResettingSettings
              ? "Resetting settings..."
              : "Reset all settings to defaults"}
          </button>
        </div>
      </section>

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
    </article>
  );
});

SettingsDatabasePanel.displayName = "SettingsDatabasePanel";
