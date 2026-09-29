import { AUTO_LOCALE, resolveLocale } from "./locales.js";
import { loadMessages } from "./loadMessages.js";

const STORAGE_KEY = "lioralang.locale";

// The choice is also kept on this device, so the next start can load the
// right language before the first paint (settings arrive a moment later).
export const readStoredLocaleChoice = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || AUTO_LOCALE;
  } catch {
    return AUTO_LOCALE;
  }
};

export const storeLocaleChoice = (choice) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, choice || AUTO_LOCALE);
  } catch {
    // The language still applies; it is only not remembered for the start.
  }
};

// Called before the first render: which language to start in, loaded.
export const prepareInitialLocale = async () => {
  const locale = resolveLocale(readStoredLocaleChoice());
  await loadMessages(locale);
  return locale;
};
