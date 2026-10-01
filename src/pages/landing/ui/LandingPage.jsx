import { useLayoutEffect, useRef } from "react";
import { Navigate, useParams } from "react-router";
import { LandingMockPanel } from "@widgets/LandingMockPanel";
import { replacePrerenderedLanding, usePageMeta } from "@shared/lib/seo";
import { isSupportedLocale, readStoredLocaleChoice, resolveLocale, useI18n } from "@shared/lib/i18n";
import { LandingI18nProvider } from "@shared/lib/i18n/LandingI18nProvider";
import { buildLandingRoute } from "@shared/config/routes";
import "./LandingPage.css";

const LandingContent = () => {
  const { t } = useI18n();
  const pageRef = useRef(null);

  usePageMeta({
    title: t("landing.meta.title"),
    description: t("landing.meta.description"),
  });

  // The page was served as static HTML (see scripts/prerender-landing.mjs):
  // this live copy takes its place in the same frame, at the same scroll.
  useLayoutEffect(() => {
    replacePrerenderedLanding(pageRef.current);
  }, []);

  return (
    <section className="landing-page" ref={pageRef}>
      <LandingMockPanel />
    </section>
  );
};

// The landing has an address per language: / is English, /ru Russian and
// so on, so each language can be found and shared. Someone who opens / with
// another language chosen, or in their browser, is taken to theirs; search
// engines, which ask in English, stay on /.
export const LandingPage = () => {
  const { locale: routeLocale = "" } = useParams();

  if (routeLocale && !isSupportedLocale(routeLocale)) {
    return <Navigate to="/" replace />;
  }

  if (routeLocale === "en") {
    return <Navigate to="/" replace />;
  }

  if (!routeLocale) {
    const preferred = resolveLocale(readStoredLocaleChoice());

    if (preferred !== "en") {
      return <Navigate to={buildLandingRoute(preferred)} replace />;
    }
  }

  return (
    <LandingI18nProvider locale={routeLocale || "en"}>
      <LandingContent />
    </LandingI18nProvider>
  );
};

export default LandingPage;
