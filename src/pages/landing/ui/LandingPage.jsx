import { LandingMockPanel } from "@widgets/LandingMockPanel";
import { usePageMeta } from "@shared/lib/seo";
import { useI18n } from "@shared/lib/i18n";
import { LandingI18nProvider } from "@shared/lib/i18n/LandingI18nProvider";
import "./LandingPage.css";

const LandingContent = () => {
  const { t } = useI18n();

  usePageMeta({
    title: t("landing.meta.title"),
    description: t("landing.meta.description"),
  });

  return (
    <section className="landing-page">
      <LandingMockPanel />
    </section>
  );
};

export const LandingPage = () => (
  <LandingI18nProvider>
    <LandingContent />
  </LandingI18nProvider>
);

export default LandingPage;
