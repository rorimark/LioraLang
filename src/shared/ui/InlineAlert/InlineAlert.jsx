import { memo, useEffect } from "react";
import { showToast } from "@shared/lib/toast";

export const InlineAlert = memo(
  ({
    text,
    variant = "info",
    onClose,
    autoCloseMs = 4200,
    disableAutoClose = false,
    action = null,
  }) => {
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
  },
);

InlineAlert.displayName = "InlineAlert";
