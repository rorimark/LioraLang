const MAX_TOASTS = 8;
const subscribers = new Set();
let toasts = [];

const notifySubscribers = () => {
  subscribers.forEach((listener) => listener());
};

const toToastId = () => `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export const getToastsSnapshot = () => toasts;

export const subscribeToasts = (listener) => {
  if (typeof listener !== "function") {
    return () => {};
  }

  subscribers.add(listener);

  return () => {
    subscribers.delete(listener);
  };
};

export const showToast = ({
  text,
  variant = "info",
  autoCloseMs = 4200,
  disableAutoClose = false,
} = {}) => {
  if (typeof text !== "string" || !text.trim()) {
    return "";
  }

  const nextToast = {
    id: toToastId(),
    text: text.trim(),
    variant,
    autoCloseMs,
    disableAutoClose,
  };

  toasts = [...toasts, nextToast];

  if (toasts.length > MAX_TOASTS) {
    toasts = toasts.slice(toasts.length - MAX_TOASTS);
  }

  notifySubscribers();

  return nextToast.id;
};

export const removeToast = (toastId) => {
  if (typeof toastId !== "string" || !toastId) {
    return;
  }

  const nextToasts = toasts.filter((toast) => toast.id !== toastId);

  if (nextToasts.length === toasts.length) {
    return;
  }

  toasts = nextToasts;
  notifySubscribers();
};
