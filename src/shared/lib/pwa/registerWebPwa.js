let registerPromise = null;

const canRegisterPwa = () => {
  if (import.meta.env.VITE_APP_TARGET !== "web") {
    return false;
  }

  if (!import.meta.env.PROD) {
    return false;
  }

  return typeof window !== "undefined" && "serviceWorker" in navigator;
};

export const registerWebPwa = async () => {
  if (!canRegisterPwa()) {
    return null;
  }

  if (registerPromise) {
    return registerPromise;
  }

  registerPromise = navigator.serviceWorker
    .register("/sw.js")
    .catch(() => null);

  return registerPromise;
};
