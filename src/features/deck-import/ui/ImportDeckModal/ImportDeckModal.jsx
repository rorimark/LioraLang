import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./ImportDeckModal.css";

export const ImportDeckModal = memo(
  ({
    isOpen,
    isImporting,
    selectedFileName,
    deckNameDraft,
    onDeckNameChange,
    onConfirm,
    onClose,
  }) => {
    const normalizedDeckName = deckNameDraft?.trim() || "";

    return (
      <ActionModal
        isOpen={isOpen}
        title="Import deck from JSON"
        description="Do you really want to import words from a JSON file? You can set the deck name before import."
        confirmLabel="Import"
        isConfirming={isImporting}
        onConfirm={onConfirm}
        onClose={onClose}
      >
        <label className="import-deck-modal__label" htmlFor="import-deck-name">
          Deck name in Decks (optional)
        </label>
        <input
          id="import-deck-name"
          className="import-deck-modal__input"
          type="text"
          value={deckNameDraft}
          onChange={onDeckNameChange}
          placeholder="Use filename if empty"
        />
        <p className="import-deck-modal__preview">
          Selected file: {selectedFileName || "-"}
        </p>
        <p className="import-deck-modal__preview">
          Deck name in DB: {normalizedDeckName || "Use filename from JSON"}
        </p>
      </ActionModal>
    );
  },
);

ImportDeckModal.displayName = "ImportDeckModal";
