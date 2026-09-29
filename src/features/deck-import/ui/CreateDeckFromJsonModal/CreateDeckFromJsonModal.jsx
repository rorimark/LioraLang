import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "../ImportDeckModal/ImportDeckModal.css";
import "./CreateDeckFromJsonModal.css";
import { useI18n } from "@shared/lib/i18n";

export const CreateDeckFromJsonModal = memo(({ modal }) => {
    const { t } = useI18n();
    const resolvedModal = modal || {};
    const isConfirmDisabled = !(resolvedModal.jsonText || "").trim();

    return (
      <ActionModal
        dialog={{
          isOpen: resolvedModal.isOpen,
          title: t("decks.fromJson"),
          description: t("import.json.description"),
          confirmLabel: t("decks.create"),
          isConfirming: resolvedModal.isImporting,
          isConfirmDisabled,
          onConfirm: resolvedModal.onConfirm,
          onClose: resolvedModal.onClose,
        }}
      >
        <label className="import-deck-modal__label" htmlFor="json-deck-name">
          {t("import.deckNameOptional")}
        </label>
        <input
          id="json-deck-name"
          className="import-deck-modal__input"
          type="text"
          value={resolvedModal.deckNameDraft || ""}
          onChange={resolvedModal.onDeckNameChange}
          placeholder={t("import.json.namePlaceholder")}
        />

        <label className="import-deck-modal__label" htmlFor="json-deck-text">
          {t("import.json.label")}
        </label>
        <textarea
          id="json-deck-text"
          className="import-deck-modal__input import-deck-modal__textarea"
          value={resolvedModal.jsonText || ""}
          onChange={resolvedModal.onJsonTextChange}
          placeholder={t("import.json.placeholder")}
          rows={7}
        />
        {resolvedModal.jsonError ? (
          <p className="json-deck-modal__error">{resolvedModal.jsonError}</p>
        ) : null}
      </ActionModal>
    );
  });

CreateDeckFromJsonModal.displayName = "CreateDeckFromJsonModal";
