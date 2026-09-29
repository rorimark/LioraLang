import { memo } from "react";
import { FiBookOpen, FiCheckCircle, FiCompass } from "react-icons/fi";
import { ActionModal, Button } from "@shared/ui";
import "./PostImportChoiceModal.css";
import { useI18n } from "@shared/lib/i18n";

const EMPTY_MODAL = Object.freeze({
  isOpen: false,
  deckName: "",
  onClose: undefined,
  onContinueBrowsing: undefined,
  onGoToLearn: undefined,
});

export const PostImportChoiceModal = memo(({ modal = EMPTY_MODAL }) => {
  const { t } = useI18n();
  const resolvedModal = modal || EMPTY_MODAL;
  const normalizedDeckName = String(resolvedModal.deckName || "").trim() || t("import.importedDeck");

  return (
    <ActionModal
      dialog={{
        isOpen: resolvedModal.isOpen,
        title: t("import.done.title"),
        description: t("import.done.description"),
        onClose: resolvedModal.onClose,
        renderActions: ({ onClose }) => (
          <div className="post-import-choice-modal__actions">
            <Button
              variant="secondary"
              onClick={resolvedModal.onContinueBrowsing || onClose}
              data-autofocus
            >
              <FiCompass aria-hidden />
              <span>{t("import.done.continue")}</span>
            </Button>
            <Button variant="primary" onClick={resolvedModal.onGoToLearn}>
              <FiBookOpen aria-hidden />
              <span>{t("import.done.learn")}</span>
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
          <span>{t("import.done.ready")}</span>
        </div>
      </div>
    </ActionModal>
  );
});

PostImportChoiceModal.displayName = "PostImportChoiceModal";
