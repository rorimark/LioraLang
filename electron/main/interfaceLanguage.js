// The desktop menus, tray and file dialogs speak the language the app is
// set to, from the same catalogues as the interface. "auto" follows the
// system's preferred languages.
import { ALL_MESSAGES } from "../../packages/shared/src/lib/i18n/allMessages.js";
import { AUTO_LOCALE, resolveLocale } from "../../packages/shared/src/lib/i18n/locales.js";
import { createTranslator } from "../../packages/shared/src/lib/i18n/translator.js";

export const createMainTranslator = ({ app, getInterfaceLanguage }) => {
  let cached = { key: "", t: null };

  return () => {
    const deviceLanguages =
      app.getPreferredSystemLanguages?.()?.length > 0 ? app.getPreferredSystemLanguages() : [app.getLocale?.() || ""];
    const locale = resolveLocale(getInterfaceLanguage() || AUTO_LOCALE, deviceLanguages);

    if (cached.key !== locale) {
      cached = {
        key: locale,
        t: createTranslator({ locale, messages: ALL_MESSAGES[locale], fallbackMessages: ALL_MESSAGES.en }),
      };
    }

    return cached.t;
  };
};
