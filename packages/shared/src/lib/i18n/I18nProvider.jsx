import { useEffect, useMemo, useState } from "react";
import { AUTO_LOCALE, DEFAULT_LOCALE, resolveLocale } from "./locales.js";
import { ENGLISH_MESSAGES, getLoadedMessages, loadMessages } from "./loadMessages.js";
import { I18nContext, buildI18nValue } from "./i18nContext.js";
import { storeLocaleChoice } from "./storage.js";

// Speaks the chosen language ("auto" follows the device). A change loads
// that language's messages, then the whole app switches at once.
export const I18nProvider = ({ choice = AUTO_LOCALE, initialLocale = DEFAULT_LOCALE, children }) => {
  const [state, setState] = useState(() => ({
    locale: initialLocale,
    messages: getLoadedMessages(initialLocale) || ENGLISH_MESSAGES,
  }));

  useEffect(() => {
    let isCurrent = true;
    const locale = resolveLocale(choice);

    storeLocaleChoice(choice);
    loadMessages(locale).then((messages) => {
      if (isCurrent) {
        setState((current) =>
          current.locale === locale && current.messages === messages ? current : { locale, messages },
        );
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [choice]);

  useEffect(() => {
    document.documentElement.lang = state.locale;
  }, [state.locale]);

  const value = useMemo(() => buildI18nValue(state.locale, state.messages), [state]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
