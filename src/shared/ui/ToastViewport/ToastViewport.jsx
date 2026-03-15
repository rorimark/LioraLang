import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getToastsSnapshot,
  removeToast,
  subscribeToasts,
} from "@shared/lib/toast";
import "./ToastViewport.css";

const AUTO_CLOSE_VARIANTS = new Set(["info", "success", "warning", "error", "danger"]);
const AUTO_CLOSE_MS_BY_VARIANT = {
  info: 4200,
  success: 4200,
  warning: 4800,
  error: 5600,
  danger: 5600,
};
const EXIT_ANIMATION_MS = 180;
const MIN_AUTO_CLOSE_MS = 1200;
const MAX_AUTO_CLOSE_MS = 12000;

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

const resolveAutoCloseDuration = (variant, autoCloseMs) => {
  const fallback = AUTO_CLOSE_MS_BY_VARIANT[variant] || AUTO_CLOSE_MS_BY_VARIANT.info;
  const numericValue = Number(autoCloseMs);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  if (numericValue < MIN_AUTO_CLOSE_MS) {
    return MIN_AUTO_CLOSE_MS;
  }

  if (numericValue > MAX_AUTO_CLOSE_MS) {
    return MAX_AUTO_CLOSE_MS;
  }

  return Math.round(numericValue);
};

const ToastItem = memo(
  ({
    id,
    text,
    variant,
    autoCloseMs = 4200,
    disableAutoClose = false,
    action,
  }) => {
    const [isExiting, setIsExiting] = useState(false);
    const removeTimeoutRef = useRef(0);
    const autoCloseTimeoutRef = useRef(0);
    const resolvedAutoCloseMs = resolveAutoCloseDuration(variant, autoCloseMs);

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

    const handleActionClick = useCallback(() => {
      if (!action || typeof action.onClick !== "function") {
        return;
      }

      action.onClick();
      closeToast();
    }, [action, closeToast]);

    const hasAction =
      action &&
      typeof action.label === "string" &&
      typeof action.onClick === "function";

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
      }, resolvedAutoCloseMs);

      return () => {
        window.clearTimeout(autoCloseTimeoutRef.current);
      };
    }, [closeToast, disableAutoClose, isExiting, resolvedAutoCloseMs, variant]);

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
        aria-live={variant === "error" || variant === "danger" ? "assertive" : "polite"}
      >
        <span className="toast-item__text">{text}</span>
        {hasAction ? (
          <button
            type="button"
            className="toast-item__action"
            onClick={handleActionClick}
          >
            {action.label}
          </button>
        ) : null}
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
