// The landing, rendered to HTML at build time: one static page per
// language, so search engines and slow phones read it before any script
// runs. scripts/prerender-landing.mjs builds this file for Node, calls
// render() for each language and writes the pages around what it returns.

import { renderToString } from "react-dom/server";
import { Route, Routes, StaticRouter } from "react-router";
import { LandingPage } from "@pages/landing/ui/LandingPage";
import { buildI18nValue, I18nProvider, loadMessages, READY_LOCALES } from "@shared/lib/i18n";
import { getLandingMessages, LANDING_FALLBACK, preloadLandingMessages } from "@shared/lib/i18n/landingMessages";
import { buildFaqItems } from "@widgets/LandingMockPanel/model/landingFaq";
import { buildLandingRoute } from "@shared/config/routes";
import { PlatformContext } from "@shared/providers/PlatformProvider/PlatformContext";

// Nothing on the landing reads the platform while it renders; the language
// picker saves through settings only when used, in the browser.
const STATIC_SERVICES = {
  settingsRepository: {
    getAppSettings: async () => ({}),
    updateAppSettings: async () => {},
  },
};

export const LANDING_LOCALES = READY_LOCALES.map((item) => item.code);

export const render = async (locale) => {
  await preloadLandingMessages(locale);

  const html = renderToString(
    <PlatformContext.Provider value={STATIC_SERVICES}>
      <I18nProvider choice={locale} initialLocale={locale}>
        <StaticRouter location={buildLandingRoute(locale)}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/:locale" element={<LandingPage />} />
          </Routes>
        </StaticRouter>
      </I18nProvider>
    </PlatformContext.Provider>,
  );

  const landing = getLandingMessages(locale);
  const { t, languageName } = buildI18nValue(locale, { ...(await loadMessages(locale)), landing }, LANDING_FALLBACK);

  return { html, meta: landing.meta, faq: buildFaqItems({ t, languageName }) };
};
