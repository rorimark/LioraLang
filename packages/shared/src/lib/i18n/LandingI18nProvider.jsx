import { useEffect, useMemo, useState } from "react";
import english from "./messages/landing/en.js";
import { ENGLISH_MESSAGES } from "./loadMessages.js";
import { I18nContext, buildI18nValue, useI18n } from "./i18nContext.js";

// The landing's copy is its own catalogue, so the desktop app, which has
// no landing, never ships it. Import this file only from the landing page.
const LOADERS = {
  uk: () => import("./messages/landing/uk.js"),
  ru: () => import("./messages/landing/ru.js"),
  pl: () => import("./messages/landing/pl.js"),
  de: () => import("./messages/landing/de.js"),
  es: () => import("./messages/landing/es.js"),
  fr: () => import("./messages/landing/fr.js"),
  it: () => import("./messages/landing/it.js"),
  pt: () => import("./messages/landing/pt.js"),
  tr: () => import("./messages/landing/tr.js"),
  cs: () => import("./messages/landing/cs.js"),
  ja: () => import("./messages/landing/ja.js"),
};

const cache = { en: english };
const FALLBACK = { ...ENGLISH_MESSAGES, landing: english };

const loadLanding = async (locale) => {
  if (!cache[locale] && LOADERS[locale]) {
    try {
      cache[locale] = (await LOADERS[locale]()).default;
    } catch {
      cache[locale] = english;
    }
  }

  return cache[locale] || english;
};

// Adds the landing's messages to the language the app already speaks.
// Until they arrive the page waits rather than flashing English.
export const LandingI18nProvider = ({ children }) => {
  const outer = useI18n();
  const { locale } = outer;
  const [landing, setLanding] = useState(() => ({ locale, messages: cache[locale] || null }));

  useEffect(() => {
    let isCurrent = true;

    loadLanding(locale).then((messages) => {
      if (isCurrent) {
        setLanding({ locale, messages });
      }
    });

    return () => {
      isCurrent = false;
    };
  }, [locale]);

  const messages = landing.locale === locale ? landing.messages : cache[locale];
  const value = useMemo(() => {
    if (!messages) {
      return null;
    }

    const base = outer.messages || ENGLISH_MESSAGES;
    return buildI18nValue(locale, { ...base, landing: messages }, FALLBACK);
  }, [locale, messages, outer.messages]);

  return value ? <I18nContext.Provider value={value}>{children}</I18nContext.Provider> : null;
};
