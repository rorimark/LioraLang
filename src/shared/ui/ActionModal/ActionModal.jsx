import { memo } from "react";
import "./ActionModal.css";

export const ActionModal = memo(
  ({
    isOpen,
    title,
    description = "",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    isConfirming = false,
    isConfirmDisabled = false,
    onConfirm,
    onClose,
    children = null,
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div className="action-modal" role="dialog" aria-modal="true" aria-label={title}>
        <button
          type="button"
          className="action-modal__overlay"
          onClick={onClose}
          aria-label="Close dialog"
        />

        <div className="action-modal__content">
          <div className="action-modal__header">
            <h3>{title}</h3>
            <button
              type="button"
              className="action-modal__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>

          {description && <p className="action-modal__description">{description}</p>}

          {children}

          <div className="action-modal__actions">
            <button type="button" onClick={onClose}>
              {cancelLabel}
            </button>
            <button
              type="button"
              className="action-modal__confirm"
              onClick={onConfirm}
              disabled={isConfirming || isConfirmDisabled}
            >
              {isConfirming ? "Processing..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    );
  },
);

ActionModal.displayName = "ActionModal";
