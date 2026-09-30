import { LandingMockPanel } from "@widgets/LandingMockPanel";
import { usePageMeta } from "@shared/lib/seo";
import { useI18n } from "@shared/lib/i18n";
import "./LandingPage.css";

export const LandingPage = () => {
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

export default LandingPage;
