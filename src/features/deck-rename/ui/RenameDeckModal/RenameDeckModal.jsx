import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./RenameDeckModal.css";
import { useI18n } from "@shared/lib/i18n";

const EMPTY_MODAL = Object.freeze({});

export const RenameDeckModal = memo(({ modal = EMPTY_MODAL }) => {
    const { t } = useI18n();
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
          title: t("renameDeck.title"),
          description: t("renameDeck.description"),
          confirmLabel: t("common.save"),
          isConfirming: isRenaming,
          isConfirmDisabled: !value?.trim(),
          onConfirm,
          onClose,
        }}
      >
        <label className="rename-deck-modal__label" htmlFor="rename-deck-name">
          {t("renameDeck.label")}
        </label>
        <input
          id="rename-deck-name"
          className="rename-deck-modal__input"
          type="text"
          value={value || ""}
          onChange={onValueChange}
          placeholder={t("renameDeck.placeholder")}
        />
      </ActionModal>
    );
  });

RenameDeckModal.displayName = "RenameDeckModal";
