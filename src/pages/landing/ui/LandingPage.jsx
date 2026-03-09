import { LandingMockPanel } from "@widgets/LandingMockPanel";
import { usePageMeta } from "@shared/lib/seo";
import "./LandingPage.css";

export const LandingPage = () => {
  usePageMeta({
    title: "LioraLang - Flashcards and spaced repetition that actually stick",
    description:
      "Create and share decks, study with spaced repetition, and use LioraLang on web or desktop with full control over your data.",
  });

  return (
    <section className="landing-page">
      <LandingMockPanel />
    </section>
  );
};

export default LandingPage;
