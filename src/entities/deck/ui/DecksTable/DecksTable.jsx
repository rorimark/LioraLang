import { memo, useCallback } from "react";
import "./DecksTable.css";

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const DecksTable = memo(
  ({
    decks,
    onOpenDeck,
    onExportDeck,
    onDeleteDeck,
    onRenameDeck,
    exportingDeckId = null,
    renamingDeckId = null,
    deletingDeckId = null,
  }) => {
    const handleOpenDeck = useCallback(
      (event) => {
        onOpenDeck(event.currentTarget.dataset.deckId);
      },
      [onOpenDeck],
    );

    const handleExportDeck = useCallback(
      (event) => {
        onExportDeck(event.currentTarget.dataset.deckId);
      },
      [onExportDeck],
    );

    const handleRenameDeck = useCallback(
      (event) => {
        onRenameDeck(
          event.currentTarget.dataset.deckId,
          event.currentTarget.dataset.deckName,
        );
      },
      [onRenameDeck],
    );

    const handleDeleteDeck = useCallback(
      (event) => {
        onDeleteDeck(
          event.currentTarget.dataset.deckId,
          event.currentTarget.dataset.deckName,
        );
      },
      [onDeleteDeck],
    );

    return (
      <table className="decks-table" aria-label="Decks table">
        <thead>
          <tr>
            <th>Deck</th>
            <th>Description</th>
            <th>Words</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {decks.length === 0 ? (
            <tr>
              <td colSpan={5} className="decks-table__empty">
                No decks found. Import a JSON deck in Settings.
              </td>
            </tr>
          ) : (
            decks.map((deck) => (
              <tr key={deck.id}>
                <td data-label="Deck">{deck.name}</td>
                <td data-label="Description">{deck.description || "-"}</td>
                <td data-label="Words">{deck.wordsCount ?? 0}</td>
                <td data-label="Created">{formatDate(deck.createdAt)}</td>
                <td data-label="Actions" className="decks-table__actions-cell">
                  <div className="decks-table__actions">
                    <button
                      type="button"
                      data-deck-id={deck.id}
                      onClick={handleOpenDeck}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      data-deck-name={deck.name}
                      data-deck-id={deck.id}
                      onClick={handleRenameDeck}
                      disabled={String(renamingDeckId) === String(deck.id)}
                    >
                      {String(renamingDeckId) === String(deck.id)
                        ? "Renaming..."
                        : "Rename"}
                    </button>
                    <button
                      type="button"
                      data-deck-id={deck.id}
                      onClick={handleExportDeck}
                      disabled={String(exportingDeckId) === String(deck.id)}
                    >
                      {String(exportingDeckId) === String(deck.id)
                        ? "Exporting..."
                        : "Export"}
                    </button>
                    <button
                      type="button"
                      className="decks-table__button--danger"
                      data-deck-name={deck.name}
                      data-deck-id={deck.id}
                      onClick={handleDeleteDeck}
                      disabled={String(deletingDeckId) === String(deck.id)}
                    >
                      {String(deletingDeckId) === String(deck.id)
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    );
  },
);

DecksTable.displayName = "DecksTable";
