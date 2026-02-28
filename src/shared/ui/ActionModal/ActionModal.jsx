import { memo, useId, useRef } from "react";
import { useDialogA11y } from "@shared/lib/a11y";
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
    const contentRef = useRef(null);
    const titleId = useId();
    const descriptionId = useId();

    useDialogA11y({
      isOpen,
      containerRef: contentRef,
      onClose,
    });

    if (!isOpen) {
      return null;
    }

    return (
      <div
        className="action-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <button
          type="button"
          className="action-modal__overlay"
          onClick={onClose}
          aria-hidden="true"
          tabIndex={-1}
        />

        <div className="action-modal__content" ref={contentRef} tabIndex={-1}>
          <div className="action-modal__header">
            <h3 id={titleId}>{title}</h3>
            <button
              type="button"
              className="action-modal__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </div>

          {description && (
            <p className="action-modal__description" id={descriptionId}>
              {description}
            </p>
          )}

          {children}

          <div className="action-modal__actions">
            <button type="button" onClick={onClose} data-autofocus>
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
