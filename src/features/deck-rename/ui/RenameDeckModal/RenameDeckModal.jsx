import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./RenameDeckModal.css";

const EMPTY_MODAL = Object.freeze({});

export const RenameDeckModal = memo(({ modal = EMPTY_MODAL }) => {
    const {
      isOpen,
      value,
      isRenaming,
      onValueChange,
      onConfirm,
      onClose,
    } = modal;
    return (
      <ActionModal
        dialog={{
          isOpen,
          title: "Rename deck",
          description: "Enter a new deck name.",
          confirmLabel: "Save",
          isConfirming: isRenaming,
          isConfirmDisabled: !value?.trim(),
          onConfirm,
          onClose,
        }}
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
  });

RenameDeckModal.displayName = "RenameDeckModal";
