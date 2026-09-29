import { memo } from "react";
import { FiAlertTriangle, FiBookOpen, FiChevronRight, FiHardDrive, FiTrash2 } from "react-icons/fi";
import { ActionModal } from "@shared/ui";
import "./DeleteDeckModal.css";
import { useI18n } from "@shared/lib/i18n";

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
    const { t } = useI18n();
    const normalizedDeckName = deckName?.trim() || t("deleteDeck.thisDeck");
    const showSyncedChoices = Boolean(isSyncedDeck && canManageSyncedLibrary);

    return (
      <ActionModal
        dialog={{
          isOpen,
          title: t("deleteDeck.title"),
          description: showSyncedChoices
            ? t("deleteDeck.chooseWhere")
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
                {t("common.cancel")}
              </button>
            </div>
          ),
        }}
      >
        <div className="delete-deck-modal__section-label">{t("decks.table.deck")}</div>
        <div className="delete-deck-modal__deck" role="note">
          <FiBookOpen aria-hidden="true" />
          <div className="delete-deck-modal__deck-copy">
            <strong>{normalizedDeckName}</strong>
            {showSyncedChoices ? (
              <span className="delete-deck-modal__deck-meta">
                <FiAlertTriangle aria-hidden="true" />
                <span>{t("deleteDeck.synced")}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="delete-deck-modal__section-label">{t("deleteDeck.from")}</div>
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
                  <strong>{t("deleteDeck.device")}</strong>
                  <small className="delete-deck-modal__choice-badge">{t("deleteDeck.onlyHere")}</small>
                </span>
                <small>{t("deleteDeck.othersKeep")}</small>
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
                  <strong>{t("deleteDeck.library")}</strong>
                  <small className="delete-deck-modal__choice-badge delete-deck-modal__choice-badge--danger">
                    {t("deleteDeck.allDevices")}
                  </small>
                </span>
                <small>{t("deleteDeck.everywhere")}</small>
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
                <strong>{t("common.delete")}</strong>
                <small>{t("deleteDeck.removeHere")}</small>
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
