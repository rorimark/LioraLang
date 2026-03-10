import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "../ImportDeckModal/ImportDeckModal.css";
import "./CreateDeckFromJsonModal.css";

export const CreateDeckFromJsonModal = memo(
  ({
    isOpen,
    isImporting,
    deckNameDraft,
    jsonText,
    jsonError,
    onDeckNameChange,
    onJsonTextChange,
    onConfirm,
    onClose,
  }) => {
    const isConfirmDisabled = !jsonText.trim();

    return (
      <ActionModal
        isOpen={isOpen}
        title="Create deck from JSON"
        description="Paste a deck package JSON (.lioradeck/.lioralang) or a raw words array."
        confirmLabel="Create deck"
        isConfirming={isImporting}
        isConfirmDisabled={isConfirmDisabled}
        onConfirm={onConfirm}
        onClose={onClose}
      >
        <label className="import-deck-modal__label" htmlFor="json-deck-name">
          Deck name in Decks (optional)
        </label>
        <input
          id="json-deck-name"
          className="import-deck-modal__input"
          type="text"
          value={deckNameDraft}
          onChange={onDeckNameChange}
          placeholder="Use deck name from JSON if empty"
        />

        <label className="import-deck-modal__label" htmlFor="json-deck-text">
          Deck JSON
        </label>
        <textarea
          id="json-deck-text"
          className="import-deck-modal__input import-deck-modal__textarea"
          value={jsonText}
          onChange={onJsonTextChange}
          placeholder="Paste deck JSON here"
          rows={7}
        />
        {jsonError ? (
          <p className="json-deck-modal__error">{jsonError}</p>
        ) : null}
      </ActionModal>
    );
  },
);

CreateDeckFromJsonModal.displayName = "CreateDeckFromJsonModal";
