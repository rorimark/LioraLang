import { LandingMockPanel } from "@widgets/LandingMockPanel";
import { usePageMeta } from "@shared/lib/seo";
import "./LandingPage.css";

export const LandingPage = () => {
  usePageMeta({
    title: "LioraLang - Flashcards and spaced repetition that actually stick",
    description:
      "Stop forgetting words after one review. Build decks, study with spaced repetition, and use LioraLang on web, desktop, or your phone home screen.",
  });

  return (
    <section className="landing-page">
      <LandingMockPanel />
    </section>
  );
};

export default LandingPage;
