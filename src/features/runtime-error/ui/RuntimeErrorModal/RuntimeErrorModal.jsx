import { memo, useId, useRef } from "react";
import { useDialogA11y } from "@shared/lib/a11y";
import "./RuntimeErrorModal.css";

export const RuntimeErrorModal = memo(
  ({
    isOpen,
    title,
    message,
    details,
    onClose,
  }) => {
    const contentRef = useRef(null);
    const titleId = useId();
    const messageId = useId();

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
        className="runtime-error-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        <button
          type="button"
          className="runtime-error-modal__overlay"
          onClick={onClose}
          aria-hidden="true"
          tabIndex={-1}
        />

        <section className="runtime-error-modal__content" ref={contentRef} tabIndex={-1}>
          <header className="runtime-error-modal__header">
            <h3 id={titleId}>{title}</h3>
            <button
              type="button"
              className="runtime-error-modal__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </header>

          <p className="runtime-error-modal__message" id={messageId}>
            {message}
          </p>

          {details ? (
            <pre className="runtime-error-modal__details">{details}</pre>
          ) : null}

          <div className="runtime-error-modal__actions">
            <button
              type="button"
              className="runtime-error-modal__dismiss"
              onClick={onClose}
              data-autofocus
            >
              Close
            </button>
          </div>
        </section>
      </div>
    );
  },
);

RuntimeErrorModal.displayName = "RuntimeErrorModal";
