import { memo } from "react";
import {
  AppPreferencesSection,
  ImportExportSettingsSection,
} from "@features/app-preferences";
import { ImportDeckModal } from "@features/deck-import";
import { IntegrityRepairModal } from "@features/integrity-repair";
import { ShortcutSettingsSection } from "@features/shortcut-settings";
import { ThemeSwitch } from "@features/theme-switch";
import { InlineAlert } from "@shared/ui";
import { useSettingsDatabasePanel } from "../model";
import "./SettingsDatabasePanel.css";

export const SettingsDatabasePanel = memo(() => {
  const {
    dbPath,
    statusMessage,
    statusVariant,
    isChangingDbLocation,
    isVerifyingIntegrity,
    isRepairingIntegrity,
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
    isDarkTheme,
    openImportConfirm,
    closeImportConfirm,
    openLanguageReview,
    closeLanguageReview,
    toggleLanguageReview,
    confirmImportDeck,
    openDbFolder,
    changeDbLocation,
    verifyIntegrity,
    showRuntimeErrorPreview,
    confirmIntegrityRepair,
    closeIntegrityRepairConfirm,
    toggleTheme,
    clearStatusMessage,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
  } = useSettingsDatabasePanel();

  return (
    <article className="panel settings-page-panel">
      <InlineAlert
        text={statusMessage}
        variant={statusVariant}
        onClose={clearStatusMessage}
      />

      <div className="settings-page-panel__layout">
        <div className="settings-page-panel__column settings-page-panel__column--wide">
          <AppPreferencesSection />
        </div>

        <div className="settings-page-panel__column">
          <section className="settings-page-panel__section">
            <h3>General</h3>
            <p>Theme and shortcuts for everyday navigation.</p>
            <div className="settings-page-panel__theme">
              <ThemeSwitch isDarkTheme={isDarkTheme} onToggle={toggleTheme} />
            </div>
            <ShortcutSettingsSection compact />
          </section>

          <section className="settings-page-panel__section">
            <h3>Deck Import and Export</h3>
            <p>Bring external decks into your local library and set defaults.</p>

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

          <section className="settings-page-panel__section">
            <h3>Storage and Integrity</h3>
            <p>Control storage location and integrity checks.</p>

            <div className="settings-page-panel__path">
              DB: {dbPath || "Loading..."}
            </div>

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

              <button
                type="button"
                className="settings-page-panel__temp-action"
                onClick={showRuntimeErrorPreview}
              >
                TEMP: Preview error modal
              </button>
            </div>
          </section>
        </div>
      </div>

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
    </article>
  );
});

SettingsDatabasePanel.displayName = "SettingsDatabasePanel";
