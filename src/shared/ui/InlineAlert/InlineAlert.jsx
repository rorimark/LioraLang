import { memo, useEffect } from "react";
import "./InlineAlert.css";

const AUTO_CLOSE_VARIANTS = new Set(["info", "success", "danger"]);
const DEFAULT_AUTO_CLOSE_MS = 4200;

export const InlineAlert = memo(
  ({
    text,
    variant = "info",
    onClose,
    autoCloseMs = DEFAULT_AUTO_CLOSE_MS,
    disableAutoClose = false,
  }) => {
    useEffect(() => {
      if (
        !text ||
        typeof onClose !== "function" ||
        disableAutoClose ||
        !AUTO_CLOSE_VARIANTS.has(variant)
      ) {
        return undefined;
      }

      const timeoutId = window.setTimeout(() => {
        onClose();
      }, autoCloseMs);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }, [text, variant, onClose, autoCloseMs, disableAutoClose]);

    if (!text) {
      return null;
    }

    return (
      <div
        className={`inline-alert inline-alert--${variant}`}
        role={variant === "error" || variant === "danger" ? "alert" : "status"}
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
  },
);

InlineAlert.displayName = "InlineAlert";
