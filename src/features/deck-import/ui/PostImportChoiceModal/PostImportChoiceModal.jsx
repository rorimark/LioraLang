import { memo } from "react";
import { FiBookOpen, FiCheckCircle, FiCompass } from "react-icons/fi";
import { ActionModal, Button } from "@shared/ui";
import "./PostImportChoiceModal.css";

const EMPTY_MODAL = Object.freeze({
  isOpen: false,
  deckName: "",
  onClose: undefined,
  onContinueBrowsing: undefined,
  onGoToLearn: undefined,
});

export const PostImportChoiceModal = memo(({ modal = EMPTY_MODAL }) => {
  const resolvedModal = modal || EMPTY_MODAL;
  const normalizedDeckName = String(resolvedModal.deckName || "").trim() || "Imported deck";

  return (
    <ActionModal
      dialog={{
        isOpen: resolvedModal.isOpen,
        title: "Deck imported",
        description:
          "Your deck is now in the local library. You can start learning it right away or keep browsing community decks.",
        onClose: resolvedModal.onClose,
        renderActions: ({ onClose }) => (
          <div className="post-import-choice-modal__actions">
            <Button
              variant="secondary"
              onClick={resolvedModal.onContinueBrowsing || onClose}
              data-autofocus
            >
              <FiCompass aria-hidden />
              <span>Continue browsing</span>
            </Button>
            <Button variant="primary" onClick={resolvedModal.onGoToLearn}>
              <FiBookOpen aria-hidden />
              <span>Go to Learn</span>
            </Button>
          </div>
        ),
      }}
    >
      <div className="post-import-choice-modal__summary">
        <div className="post-import-choice-modal__icon" aria-hidden="true">
          <FiCheckCircle />
        </div>
        <div className="post-import-choice-modal__copy">
          <strong>{normalizedDeckName}</strong>
          <span>Imported successfully and ready to study.</span>
        </div>
      </div>
    </ActionModal>
  );
});

PostImportChoiceModal.displayName = "PostImportChoiceModal";
