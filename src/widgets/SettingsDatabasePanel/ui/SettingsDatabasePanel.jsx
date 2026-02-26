import { memo } from "react";
import { ImportDeckModal } from "@features/deck-import";
import { ThemeSwitch } from "@features/theme-switch";
import { InlineAlert } from "@shared/ui";
import { useSettingsDatabasePanel } from "../model";
import "./SettingsDatabasePanel.css";

export const SettingsDatabasePanel = memo(() => {
  const {
    dbPath,
    statusMessage,
    statusVariant,
    isImporting,
    selectedImportFileName,
    importDeckNameDraft,
    isImportConfirmOpen,
    isDarkTheme,
    openImportConfirm,
    closeImportConfirm,
    confirmImportDeck,
    openDbFolder,
    toggleTheme,
    clearStatusMessage,
    handleImportDeckNameDraftChange,
  } = useSettingsDatabasePanel();

    return (
      <article className="panel settings-page-panel">
        <div className="settings-page-panel__theme">
          <ThemeSwitch isDarkTheme={isDarkTheme} onToggle={toggleTheme} />
        </div>

        <div className="settings-page-panel__actions">
          <button
            type="button"
            onClick={openImportConfirm}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import deck from JSON"}
          </button>

          <button type="button" onClick={openDbFolder}>
            Open database folder
          </button>
        </div>

        <div className="settings-page-panel__path">
          DB: {dbPath || "Loading..."}
        </div>

        <InlineAlert
          text={statusMessage}
          variant={statusVariant}
          onClose={clearStatusMessage}
        />

        <ImportDeckModal
          isOpen={isImportConfirmOpen}
          isImporting={isImporting}
          selectedFileName={selectedImportFileName}
          deckNameDraft={importDeckNameDraft}
          onDeckNameChange={handleImportDeckNameDraftChange}
          onConfirm={confirmImportDeck}
          onClose={closeImportConfirm}
        />
      </article>
    );
});

SettingsDatabasePanel.displayName = "SettingsDatabasePanel";
