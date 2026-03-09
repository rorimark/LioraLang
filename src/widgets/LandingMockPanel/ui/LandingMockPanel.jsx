import { memo } from "react";
import { Link } from "react-router";
import { ROUTE_PATHS } from "@shared/config/routes";
import "./LandingMockPanel.css";

const MOCK_FEATURES = [
  {
    title: "Offline-first decks",
    description: "Create and edit decks locally with no server required.",
  },
  {
    title: "Spaced repetition",
    description: "Rate cards as Again, Hard, Good, or Easy and keep momentum.",
  },
  {
    title: "Import and share",
    description: "Import deck files, export your own, and publish to LioraLangHub.",
  },
];

export const LandingMockPanel = memo(() => {
  return (
    <article className="landing-mock-panel">
      <header className="landing-mock-panel__hero">
        <p className="landing-mock-panel__eyebrow">LioraLang</p>
        <h1>Build your language system, not random word lists</h1>
        <p className="landing-mock-panel__lead">
          This is a lightweight landing mock. The app itself is available under
          <strong> /app</strong>.
        </p>
        <div className="landing-mock-panel__actions">
          <Link to={ROUTE_PATHS.learn} className="landing-mock-panel__cta">
            Open app
          </Link>
          <Link
            to={ROUTE_PATHS.decks}
            className="landing-mock-panel__cta landing-mock-panel__cta--secondary"
          >
            Go to decks
          </Link>
        </div>
      </header>

      <section className="landing-mock-panel__grid" aria-label="Core features">
        {MOCK_FEATURES.map((feature) => (
          <article key={feature.title} className="landing-mock-panel__card">
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>
    </article>
  );
});

LandingMockPanel.displayName = "LandingMockPanel";
