import { memo } from "react";
import "./InlineAlert.css";

export const InlineAlert = memo(({ text, variant = "info", onClose }) => {
  if (!text) {
    return null;
  }

  return (
    <div
      className={`inline-alert inline-alert--${variant}`}
      role={variant === "error" ? "alert" : "status"}
    >
      <span className="inline-alert__text">{text}</span>

      <button
        type="button"
        className="inline-alert__close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
});

InlineAlert.displayName = "InlineAlert";
