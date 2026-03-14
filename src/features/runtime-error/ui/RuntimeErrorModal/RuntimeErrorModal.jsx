import { memo, useId, useMemo, useRef } from "react";
import { useDialogA11y } from "@shared/lib/a11y";
import "./RuntimeErrorModal.css";

const resolveMessageText = (value) =>
  typeof value === "string" ? value.trim() : "";

const resolveDetailsText = (message, details) => {
  const normalizedMessage = resolveMessageText(message);
  const normalizedDetails = resolveMessageText(details);
  const lines = [];

  if (normalizedMessage) {
    lines.push("Message:");
    lines.push(normalizedMessage);
  }

  if (normalizedDetails) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push("Stack trace:");
    lines.push(normalizedDetails);
  }

  return lines.join("\n");
};

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
    const normalizedMessage = useMemo(() => resolveMessageText(message), [message]);
    const detailsText = useMemo(
      () => resolveDetailsText(message, details),
      [message, details],
    );
    const shouldShowDetails = Boolean(detailsText);

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

          <p className="runtime-error-modal__message runtime-error-modal__message--clamped" id={messageId}>
            {normalizedMessage || "Something went wrong."}
          </p>

          {shouldShowDetails ? (
            <details className="runtime-error-modal__details">
              <summary className="runtime-error-modal__details-toggle">
                Show technical details
              </summary>
              <pre className="runtime-error-modal__details-body">
                {detailsText}
              </pre>
            </details>
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
