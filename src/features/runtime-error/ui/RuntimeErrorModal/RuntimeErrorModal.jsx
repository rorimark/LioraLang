import { memo } from "react";
import "./RuntimeErrorModal.css";

export const RuntimeErrorModal = memo(
  ({
    isOpen,
    title,
    message,
    details,
    onClose,
  }) => {
    if (!isOpen) {
      return null;
    }

    return (
      <div className="runtime-error-modal" role="dialog" aria-modal="true" aria-label={title}>
        <button
          type="button"
          className="runtime-error-modal__overlay"
          onClick={onClose}
          aria-label="Close dialog"
        />

        <section className="runtime-error-modal__content">
          <header className="runtime-error-modal__header">
            <h3>{title}</h3>
            <button
              type="button"
              className="runtime-error-modal__close"
              onClick={onClose}
              aria-label="Close dialog"
            >
              ×
            </button>
          </header>

          <p className="runtime-error-modal__message">{message}</p>

          {details ? (
            <pre className="runtime-error-modal__details">{details}</pre>
          ) : null}

          <div className="runtime-error-modal__actions">
            <button
              type="button"
              className="runtime-error-modal__dismiss"
              onClick={onClose}
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
