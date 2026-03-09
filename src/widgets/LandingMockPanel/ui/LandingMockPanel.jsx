import { memo } from "react";
import { Link } from "react-router";
import { useLandingMockPanel } from "../model/useLandingMockPanel";
import "./LandingMockPanel.css";

export const LandingMockPanel = memo(() => {
  const {
    features,
    primaryCtaTo,
    secondaryCtaTo,
    handlePrefetchApp,
  } = useLandingMockPanel();

  return (
    <article className="landing-mock-panel">
      <header className="landing-mock-panel__hero">
        <p className="landing-mock-panel__eyebrow">LioraLang</p>
        <h1>Own your language learning workflow from first card to mastery</h1>
        <p className="landing-mock-panel__lead">
          Build decks, study with spaced repetition, and track real progress in
          one fast workspace. Your data stays under your control.
        </p>
        <div className="landing-mock-panel__actions">
          <Link
            to={primaryCtaTo}
            className="landing-mock-panel__cta"
            onMouseEnter={handlePrefetchApp}
            onFocus={handlePrefetchApp}
            onTouchStart={handlePrefetchApp}
          >
            Open app
          </Link>
          <Link
            to={secondaryCtaTo}
            className="landing-mock-panel__cta landing-mock-panel__cta--secondary"
            onMouseEnter={handlePrefetchApp}
            onFocus={handlePrefetchApp}
            onTouchStart={handlePrefetchApp}
          >
            Explore decks
          </Link>
        </div>
      </header>

      <section className="landing-mock-panel__grid" aria-label="Core features">
        {features.map((feature) => (
          <article key={feature.title} className="landing-mock-panel__card">
            <h2>{feature.title}</h2>
            <p>{feature.description}</p>
          </article>
        ))}
      </section>

      <section className="landing-mock-panel__workflow" aria-label="Study workflow">
        <h2>How it works</h2>
        <ol>
          <li>Create a deck with source and target languages.</li>
          <li>Add words with tags, levels, and examples.</li>
          <li>Study daily sessions and rate each card.</li>
          <li>Use analytics to tune your weak areas.</li>
        </ol>
      </section>
    </article>
  );
});

LandingMockPanel.displayName = "LandingMockPanel";
