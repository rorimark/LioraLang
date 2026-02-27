import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getToastsSnapshot,
  removeToast,
  subscribeToasts,
} from "@shared/lib/toast";
import "./ToastViewport.css";

const AUTO_CLOSE_VARIANTS = new Set(["info", "success", "warning", "danger"]);
const EXIT_ANIMATION_MS = 170;

const resolveExitAnimationDuration = () => {
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return 0;
  }

  return EXIT_ANIMATION_MS;
};

const ToastItem = memo(
  ({
    id,
    text,
    variant,
    autoCloseMs = 4200,
    disableAutoClose = false,
  }) => {
    const [isExiting, setIsExiting] = useState(false);
    const removeTimeoutRef = useRef(0);
    const autoCloseTimeoutRef = useRef(0);

    const closeToast = useCallback(() => {
      if (isExiting) {
        return;
      }

      setIsExiting(true);
      const exitDelay = resolveExitAnimationDuration();

      if (exitDelay === 0) {
        removeToast(id);
        return;
      }

      removeTimeoutRef.current = window.setTimeout(() => {
        removeToast(id);
      }, exitDelay);
    }, [id, isExiting]);

    useEffect(() => {
      if (
        disableAutoClose ||
        !AUTO_CLOSE_VARIANTS.has(variant) ||
        isExiting
      ) {
        return undefined;
      }

      autoCloseTimeoutRef.current = window.setTimeout(() => {
        closeToast();
      }, autoCloseMs);

      return () => {
        window.clearTimeout(autoCloseTimeoutRef.current);
      };
    }, [autoCloseMs, closeToast, disableAutoClose, isExiting, variant]);

    useEffect(
      () => () => {
        window.clearTimeout(autoCloseTimeoutRef.current);
        window.clearTimeout(removeTimeoutRef.current);
      },
      [],
    );

    return (
      <div
        className={`toast-item toast-item--${variant} ${isExiting ? "toast-item--exiting" : ""}`.trim()}
        role={variant === "error" || variant === "danger" ? "alert" : "status"}
      >
        <span className="toast-item__text">{text}</span>
        <button
          type="button"
          className="toast-item__close"
          onClick={closeToast}
          aria-label="Close notification"
        >
          ×
        </button>
      </div>
    );
  },
);

ToastItem.displayName = "ToastItem";

export const ToastViewport = memo(() => {
  const toasts = useSyncExternalStore(subscribeToasts, getToastsSnapshot);

  if (!Array.isArray(toasts) || toasts.length === 0) {
    return null;
  }

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  );
});

ToastViewport.displayName = "ToastViewport";
