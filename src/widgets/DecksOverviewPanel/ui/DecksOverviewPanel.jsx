import { memo } from "react";
import { DecksTable } from "@entities/deck";
import { DeleteDeckModal } from "@features/deck-delete";
import { RenameDeckModal } from "@features/deck-rename";
import { InlineAlert } from "@shared/ui";
import "./DecksOverviewPanel.css";

export const DecksOverviewPanel = memo(
  ({
    decks,
    isLoading,
    error,
    message,
    messageVariant,
    exportingDeckId,
    renamingDeckId,
    deletingDeckId,
    renameState,
    deleteState,
    onOpenDeck,
    onExportDeck,
    onOpenDeleteModal,
    onCloseDeleteModal,
    onConfirmDeleteDeck,
    onOpenRenameModal,
    onCloseRenameModal,
    onRenameValueChange,
    onConfirmRenameDeck,
    onRefresh,
    onCloseMessage,
  }) => {
    return (
      <article className="panel decks-page-panel">
        <div className="decks-page-panel__header">
          <h2>Your Decks</h2>
          <p>Create, import, export, and browse local SQLite decks.</p>
        </div>

        <InlineAlert
          text={message}
          variant={messageVariant}
          onClose={onCloseMessage}
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
            onOpenDeck={onOpenDeck}
            onExportDeck={onExportDeck}
            onDeleteDeck={onOpenDeleteModal}
            onRenameDeck={onOpenRenameModal}
            exportingDeckId={exportingDeckId}
            renamingDeckId={renamingDeckId}
            deletingDeckId={deletingDeckId}
          />
        )}

        <button
          type="button"
          className="decks-page-panel__refresh"
          onClick={onRefresh}
        >
          Refresh decks
        </button>

        <RenameDeckModal
          isOpen={renameState?.isOpen}
          value={renameState?.value || ""}
          isRenaming={Boolean(renamingDeckId)}
          onValueChange={onRenameValueChange}
          onConfirm={onConfirmRenameDeck}
          onClose={onCloseRenameModal}
        />

        <DeleteDeckModal
          isOpen={deleteState?.isOpen}
          deckName={deleteState?.deckName || ""}
          isDeleting={Boolean(deletingDeckId)}
          onConfirm={onConfirmDeleteDeck}
          onClose={onCloseDeleteModal}
        />
      </article>
    );
  },
);

DecksOverviewPanel.displayName = "DecksOverviewPanel";
