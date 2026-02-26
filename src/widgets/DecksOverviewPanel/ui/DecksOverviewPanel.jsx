import { memo } from "react";
import { DecksTable } from "@entities/deck";
import { ImportDeckModal } from "@features/deck-import";
import { DeleteDeckModal } from "@features/deck-delete";
import { InlineAlert } from "@shared/ui";
import { useDecksOverviewPanel } from "../model";
import "./DecksOverviewPanel.css";

export const DecksOverviewPanel = memo(() => {
  const {
    decks,
    isLoading,
    error,
    message,
    messageVariant,
    exportingDeckId,
    deletingDeckId,
    isImporting,
    selectedImportFileName,
    importDeckNameDraft,
    isImportConfirmOpen,
    deleteState,
    openDeck,
    openCreateDeck,
    openEditDeck,
    exportDeck,
    openDeleteModal,
    closeDeleteModal,
    confirmDeleteDeck,
    openImportConfirm,
    closeImportConfirm,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
    refreshDecks,
    clearMessage,
  } = useDecksOverviewPanel();

  return (
    <article className="panel decks-page-panel">
      <div className="decks-page-panel__header">
        <h2>Your Decks</h2>
        <p>Create, import, export, and browse local SQLite decks.</p>
      </div>

      <InlineAlert
        text={message}
        variant={messageVariant}
        onClose={clearMessage}
      />

      {error && (
        <div className="decks-page-panel__message decks-page-panel__message--error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="decks-page-panel__loading">Loading decks...</div>
      ) : (
        <DecksTable
          decks={decks}
          onOpenDeck={openDeck}
          onEditDeck={openEditDeck}
          onExportDeck={exportDeck}
          onDeleteDeck={openDeleteModal}
          exportingDeckId={exportingDeckId}
          deletingDeckId={deletingDeckId}
        />
      )}

      <div className="decks-page-panel__controls">
        <button
          type="button"
          className="decks-page-panel__refresh"
          onClick={openCreateDeck}
        >
          Create deck
        </button>
        <button
          type="button"
          className="decks-page-panel__refresh"
          onClick={openImportConfirm}
          disabled={isImporting}
        >
          {isImporting ? "Importing..." : "Import deck from JSON"}
        </button>
        <button
          type="button"
          className="decks-page-panel__refresh"
          onClick={refreshDecks}
        >
          Refresh decks
        </button>
      </div>

      <DeleteDeckModal
        isOpen={deleteState?.isOpen}
        deckName={deleteState?.deckName || ""}
        isDeleting={Boolean(deletingDeckId)}
        onConfirm={confirmDeleteDeck}
        onClose={closeDeleteModal}
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

DecksOverviewPanel.displayName = "DecksOverviewPanel";
