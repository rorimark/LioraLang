import { memo, useEffect } from "react";
import { showToast } from "@shared/lib/toast";

const EMPTY_ALERT = Object.freeze({});

export const InlineAlert = memo(({ alert = EMPTY_ALERT }) => {
    const {
      text,
      variant = "info",
      onClose,
      autoCloseMs = 4200,
      disableAutoClose = false,
      action = null,
    } = alert;
    useEffect(() => {
      if (!text) {
        return undefined;
      }

      showToast({
        text,
        variant,
        autoCloseMs,
        disableAutoClose,
        action,
      });

      if (typeof onClose === "function") {
        onClose();
      }

      return undefined;
    }, [text, variant, onClose, autoCloseMs, disableAutoClose, action]);

    return null;
  });

InlineAlert.displayName = "InlineAlert";
