import { useEffect, useMemo, useState } from "react";
import { getLoadedMessages, loadMessages } from "./loadMessages.js";
import { I18nContext, buildI18nValue, useI18n } from "./i18nContext.js";
import { getLandingMessages, LANDING_FALLBACK, loadLanding } from "./landingMessages.js";

// Adds the landing's messages to a language. Without a locale it is the
// language the app already speaks; with one (the landing's own address,
// /ru, /de…) it is that language, app messages included, whatever the app
// is set to. Until the messages arrive the page waits rather than
// flashing English.
export const LandingI18nProvider = ({ locale: pageLocale = "", children }) => {
  const outer = useI18n();
  const locale = pageLocale || outer.locale;
  const isOwnLocale = Boolean(pageLocale) && pageLocale !== outer.locale;
  const [loaded, setLoaded] = useState(() => ({
    locale,
    landing: getLandingMessages(locale),
    app: isOwnLocale ? getLoadedMessages(locale) : outer.messages,
  }));

  useEffect(() => {
    let isCurrent = true;

    Promise.all([loadLanding(locale), isOwnLocale ? loadMessages(locale) : Promise.resolve(null)]).then(
      ([landing, app]) => {
        if (isCurrent) {
          setLoaded({ locale, landing, app });
        }
      },
    );

    return () => {
      isCurrent = false;
    };
  }, [isOwnLocale, locale]);

  useEffect(() => {
    if (pageLocale && typeof document !== "undefined") {
      document.documentElement.lang = pageLocale;
    }
  }, [pageLocale]);

  const isCurrent = loaded.locale === locale;
  const landingMessages = (isCurrent ? loaded.landing : null) || getLandingMessages(locale);
  const appMessages = isOwnLocale ? (isCurrent ? loaded.app : null) || getLoadedMessages(locale) : outer.messages;
  const value = useMemo(() => {
    if (!landingMessages || !appMessages) {
      return null;
    }

    return buildI18nValue(locale, { ...appMessages, landing: landingMessages }, LANDING_FALLBACK);
  }, [appMessages, landingMessages, locale]);

  return value ? <I18nContext.Provider value={value}>{children}</I18nContext.Provider> : null;
};
