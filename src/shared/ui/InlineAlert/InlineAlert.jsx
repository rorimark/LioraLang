import { memo, useEffect } from "react";
import { showToast } from "@shared/lib/toast";

export const InlineAlert = memo(
  ({
    text,
    variant = "info",
    onClose,
    autoCloseMs = 4200,
    disableAutoClose = false,
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
      });

      if (typeof onClose === "function") {
        onClose();
      }

      return undefined;
    }, [text, variant, onClose, autoCloseMs, disableAutoClose]);

    return null;
  },
);

InlineAlert.displayName = "InlineAlert";
