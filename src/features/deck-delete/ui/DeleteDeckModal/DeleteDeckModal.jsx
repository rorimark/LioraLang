import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./DeleteDeckModal.css";

export const DeleteDeckModal = memo(
  ({ isOpen, deckName, isDeleting, onConfirm, onClose }) => {
    const normalizedDeckName = deckName?.trim() || "this deck";

    return (
      <ActionModal
        dialog={{
          isOpen,
          title: "Delete deck",
          description:
            `Are you sure you want to delete "${normalizedDeckName}"? This action cannot be undone.`,
          confirmLabel: "Delete",
          isConfirming: isDeleting,
          onConfirm,
          onClose,
        }}
      >
        <p className="delete-deck-modal__warning">
          All words in this deck will be removed.
        </p>
      </ActionModal>
    );
  },
);

DeleteDeckModal.displayName = "DeleteDeckModal";
