import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./RenameDeckModal.css";

export const RenameDeckModal = memo(
  ({ isOpen, value, isRenaming, onValueChange, onConfirm, onClose }) => {
    return (
      <ActionModal
        isOpen={isOpen}
        title="Rename deck"
        description="Enter a new deck name."
        confirmLabel="Save"
        isConfirming={isRenaming}
        isConfirmDisabled={!value?.trim()}
        onConfirm={onConfirm}
        onClose={onClose}
      >
        <label className="rename-deck-modal__label" htmlFor="rename-deck-name">
          Deck name
        </label>
        <input
          id="rename-deck-name"
          className="rename-deck-modal__input"
          type="text"
          value={value || ""}
          onChange={onValueChange}
          placeholder="Enter deck name"
        />
      </ActionModal>
    );
  },
);

RenameDeckModal.displayName = "RenameDeckModal";
