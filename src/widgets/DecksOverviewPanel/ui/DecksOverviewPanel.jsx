import { memo, useMemo } from "react";
import { DecksTable } from "@entities/deck";
import { CreateDeckFromJsonModal, ImportDeckModal } from "@features/deck-import";
import { DeleteDeckModal } from "@features/deck-delete";
import { InlineAlert } from "@shared/ui";
import { useDecksOverviewPanel } from "../model";
import "./DecksOverviewPanel.css";

export const DecksOverviewPanel = memo(() => {
  const panel = useDecksOverviewPanel();
  const table = useMemo(
    () => ({
      decks: panel.decks,
      actions: {
        onOpenDeck: panel.openDeck,
        onEditDeck: panel.openEditDeck,
        onPublishDeck: panel.publishDeck,
        onExportDeck: panel.exportDeck,
        onDeleteDeck: panel.openDeleteModal,
      },
      pendingState: {
        publishingDeckId: panel.publishingDeckId,
        exportingDeckId: panel.exportingDeckId,
        deletingDeckId: panel.deletingDeckId,
      },
    }),
    [
      panel.decks,
      panel.deletingDeckId,
      panel.exportDeck,
      panel.exportingDeckId,
      panel.openDeleteModal,
      panel.openDeck,
      panel.openEditDeck,
      panel.publishDeck,
      panel.publishingDeckId,
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
      text: panel.message,
      variant: panel.messageVariant,
      onClose: panel.clearMessage,
    }),
    [panel.clearMessage, panel.message, panel.messageVariant],
  );

  return (
    <article className="panel decks-page-panel">
      <div className="decks-page-panel__header">
        <h2>Your Decks</h2>
        <div className="decks-page-panel__controls">
          <button
            type="button"
            className="decks-page-panel__refresh"
            onClick={panel.openCreateDeck}
          >
            Create deck
          </button>
          <button
            type="button"
            className="decks-page-panel__refresh"
            onClick={panel.openImportConfirm}
            disabled={panel.isImporting}
          >
            {panel.isImporting ? "Importing..." : "Import deck file"}
          </button>
          <button
            type="button"
            className="decks-page-panel__refresh"
            onClick={panel.openJsonImport}
            disabled={panel.isImporting}
          >
            Create deck from JSON
          </button>
          <button
            type="button"
            className="decks-page-panel__refresh"
            onClick={panel.refreshDecks}
          >
            Refresh decks
          </button>
        </div>
      </div>

      <InlineAlert alert={statusAlert} />

      <div className="decks-page-panel__search-row">
        <label className="decks-page-panel__search-field">
          <span>Find deck</span>
          <input
            type="search"
            value={panel.deckSearch}
            onChange={(event) => panel.handleDeckSearchChange(event.target.value)}
            placeholder="Search by name, description, language or tag"
            aria-label="Search decks"
          />
        </label>
        <span className="decks-page-panel__search-meta">
          {panel.decks.length} / {panel.totalDecksCount}
        </span>
      </div>

      {panel.error && (
        <div className="decks-page-panel__message decks-page-panel__message--error">
          {panel.error}
        </div>
      )}

      {panel.isLoading ? (
        <div className="decks-page-panel__loading">Loading decks...</div>
      ) : (
        <DecksTable table={table} />
      )}

      <DeleteDeckModal
        isOpen={panel.deleteState?.isOpen}
        deckName={panel.deleteState?.deckName || ""}
        isDeleting={Boolean(panel.deletingDeckId)}
        onConfirm={panel.confirmDeleteDeck}
        onClose={panel.closeDeleteModal}
      />

      <ImportDeckModal modal={importModal} />

      <CreateDeckFromJsonModal modal={jsonImportModal} />
    </article>
  );
});

DecksOverviewPanel.displayName = "DecksOverviewPanel";
