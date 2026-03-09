import { LandingMockPanel } from "@widgets/LandingMockPanel";
import { usePageMeta } from "@shared/lib/seo";
import "./LandingPage.css";

export const LandingPage = () => {
  usePageMeta({
    title: "LioraLang - Offline-first language learning",
    description:
      "Create custom decks, learn with spaced repetition flashcards, and track your progress in one local-first app.",
  });

  return (
    <section className="landing-page">
      <LandingMockPanel />
    </section>
  );
};

export default LandingPage;
