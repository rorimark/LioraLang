import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "../ImportDeckModal/ImportDeckModal.css";
import "./CreateDeckFromJsonModal.css";

export const CreateDeckFromJsonModal = memo(({ modal }) => {
    const resolvedModal = modal || {};
    const isConfirmDisabled = !(resolvedModal.jsonText || "").trim();

    return (
      <ActionModal
        dialog={{
          isOpen: resolvedModal.isOpen,
          title: "Create deck from JSON",
          description:
            "Paste a deck package JSON (.lioradeck/.lioralang) or a raw words array.",
          confirmLabel: "Create deck",
          isConfirming: resolvedModal.isImporting,
          isConfirmDisabled,
          onConfirm: resolvedModal.onConfirm,
          onClose: resolvedModal.onClose,
        }}
      >
        <label className="import-deck-modal__label" htmlFor="json-deck-name">
          Deck name in Decks (optional)
        </label>
        <input
          id="json-deck-name"
          className="import-deck-modal__input"
          type="text"
          value={resolvedModal.deckNameDraft || ""}
          onChange={resolvedModal.onDeckNameChange}
          placeholder="Use deck name from JSON if empty"
        />

        <label className="import-deck-modal__label" htmlFor="json-deck-text">
          Deck JSON
        </label>
        <textarea
          id="json-deck-text"
          className="import-deck-modal__input import-deck-modal__textarea"
          value={resolvedModal.jsonText || ""}
          onChange={resolvedModal.onJsonTextChange}
          placeholder="Paste deck JSON here"
          rows={7}
        />
        {resolvedModal.jsonError ? (
          <p className="json-deck-modal__error">{resolvedModal.jsonError}</p>
        ) : null}
      </ActionModal>
    );
  });

CreateDeckFromJsonModal.displayName = "CreateDeckFromJsonModal";
