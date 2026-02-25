import { memo } from "react";
import { ImportDeckModal } from "@features/deck-import";
import { ThemeSwitch } from "@features/theme-switch";
import { InlineAlert } from "@shared/ui";
import "./SettingsDatabasePanel.css";

export const SettingsDatabasePanel = memo(
  ({
    dbPath,
    statusMessage,
    statusVariant,
    isImporting,
    selectedImportFileName,
    importDeckNameDraft,
    isImportConfirmOpen,
    isDarkTheme,
    onOpenImportConfirm,
    onCloseImportConfirm,
    onConfirmImportDeck,
    onOpenDbFolder,
    onToggleTheme,
    onCloseStatus,
    onImportDeckNameDraftChange,
  }) => {
    return (
      <article className="panel settings-page-panel">
        <div className="settings-page-panel__theme">
          <ThemeSwitch isDarkTheme={isDarkTheme} onToggle={onToggleTheme} />
        </div>

        <div className="settings-page-panel__actions">
          <button
            type="button"
            onClick={onOpenImportConfirm}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import deck from JSON"}
          </button>

          <button type="button" onClick={onOpenDbFolder}>
            Open database folder
          </button>
        </div>

        <div className="settings-page-panel__path">
          DB: {dbPath || "Loading..."}
        </div>

        <InlineAlert
          text={statusMessage}
          variant={statusVariant}
          onClose={onCloseStatus}
        />

        <ImportDeckModal
          isOpen={isImportConfirmOpen}
          isImporting={isImporting}
          selectedFileName={selectedImportFileName}
          deckNameDraft={importDeckNameDraft}
          onDeckNameChange={onImportDeckNameDraftChange}
          onConfirm={onConfirmImportDeck}
          onClose={onCloseImportConfirm}
        />
      </article>
    );
  },
);

SettingsDatabasePanel.displayName = "SettingsDatabasePanel";
