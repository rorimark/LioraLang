import { memo } from "react";
import { FiAlertTriangle, FiBookOpen, FiChevronRight, FiHardDrive, FiTrash2 } from "react-icons/fi";
import { ActionModal } from "@shared/ui";
import "./DeleteDeckModal.css";

export const DeleteDeckModal = memo(
  ({
    isOpen,
    deckName,
    isSyncedDeck = false,
    canManageSyncedLibrary = false,
    isDeleting,
    onConfirmLocal,
    onConfirmLibrary,
    onClose,
  }) => {
    const normalizedDeckName = deckName?.trim() || "this deck";
    const showSyncedChoices = Boolean(isSyncedDeck && canManageSyncedLibrary);

    return (
      <ActionModal
        dialog={{
          isOpen,
          title: "Delete deck",
          description: showSyncedChoices
            ? "Choose where to delete it."
            : normalizedDeckName,
          onClose,
          renderActions: ({ onClose: handleClose }) => (
            <div className="action-modal__actions delete-deck-modal__actions">
              <button
                type="button"
                className="delete-deck-modal__cancel"
                onClick={handleClose}
                data-autofocus
              >
                Cancel
              </button>
            </div>
          ),
        }}
      >
        <div className="delete-deck-modal__section-label">Deck</div>
        <div className="delete-deck-modal__deck" role="note">
          <FiBookOpen aria-hidden="true" />
          <div className="delete-deck-modal__deck-copy">
            <strong>{normalizedDeckName}</strong>
            {showSyncedChoices ? (
              <span className="delete-deck-modal__deck-meta">
                <FiAlertTriangle aria-hidden="true" />
                <span>Synced deck</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="delete-deck-modal__section-label">Delete from</div>
        {showSyncedChoices ? (
          <div className="delete-deck-modal__choices">
            <button
              type="button"
              className="delete-deck-modal__choice"
              onClick={onConfirmLocal}
              disabled={isDeleting}
            >
              <FiHardDrive aria-hidden="true" />
              <span className="delete-deck-modal__choice-copy">
                <span className="delete-deck-modal__choice-head">
                  <strong>This device</strong>
                  <small className="delete-deck-modal__choice-badge">Only here</small>
                </span>
                <small>Other devices keep it.</small>
              </span>
              <FiChevronRight className="delete-deck-modal__choice-arrow" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="delete-deck-modal__choice delete-deck-modal__choice--danger"
              onClick={onConfirmLibrary}
              disabled={isDeleting}
            >
              <FiTrash2 aria-hidden="true" />
              <span className="delete-deck-modal__choice-copy">
                <span className="delete-deck-modal__choice-head">
                  <strong>Synced library</strong>
                  <small className="delete-deck-modal__choice-badge delete-deck-modal__choice-badge--danger">
                    All devices
                  </small>
                </span>
                <small>Deletes it everywhere.</small>
              </span>
              <FiChevronRight className="delete-deck-modal__choice-arrow" aria-hidden="true" />
            </button>
          </div>
        ) : (
          <div className="delete-deck-modal__choices">
            <button
              type="button"
              className="delete-deck-modal__choice delete-deck-modal__choice--danger"
              onClick={onConfirmLocal}
              disabled={isDeleting}
            >
              <FiTrash2 aria-hidden="true" />
              <span className="delete-deck-modal__choice-copy">
                <strong>Delete</strong>
                <small>Remove it from this device.</small>
              </span>
              <FiChevronRight className="delete-deck-modal__choice-arrow" aria-hidden="true" />
            </button>
          </div>
        )}
      </ActionModal>
    );
  },
);

DeleteDeckModal.displayName = "DeleteDeckModal";
