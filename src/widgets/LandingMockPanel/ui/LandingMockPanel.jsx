import { memo } from "react";
import { Link } from "react-router";
import { useLandingMockPanel } from "../model/useLandingMockPanel";
import "./LandingMockPanel.css";

const EXTERNAL_LINK_REL = "noopener noreferrer";

export const LandingMockPanel = memo(() => {
  const {
    heroMetrics,
    features,
    workflowSteps,
    contactLinks,
    openWebTo,
    exploreDecksTo,
    desktopReleaseUrl,
    githubRepoUrl,
    handlePrefetchApp,
  } = useLandingMockPanel();

  return (
    <article className="landing-mock-panel">
      <header className="landing-mock-panel__hero">
        <p className="landing-mock-panel__eyebrow">LioraLang</p>
        <h1>Stop forgetting words after one review and build lasting vocabulary</h1>
        <p className="landing-mock-panel__lead">
          LioraLang gives you one focused language workspace. Create your own
          decks, study with spaced repetition flashcards, and track visible
          progress without losing control over your data.
        </p>
        <div className="landing-mock-panel__actions">
          <Link
            to={openWebTo}
            className="landing-mock-panel__cta"
            onMouseEnter={handlePrefetchApp}
            onFocus={handlePrefetchApp}
            onTouchStart={handlePrefetchApp}
          >
            Open web app
          </Link>
          <a
            href={desktopReleaseUrl}
            className="landing-mock-panel__cta landing-mock-panel__cta--secondary"
            target="_blank"
            rel={EXTERNAL_LINK_REL}
          >
            Download desktop app
          </a>
          <a
            href={githubRepoUrl}
            className="landing-mock-panel__cta landing-mock-panel__cta--ghost"
            target="_blank"
            rel={EXTERNAL_LINK_REL}
          >
            GitHub
          </a>
        </div>
        <div className="landing-mock-panel__hero-metrics" aria-label="Core product values">
          {heroMetrics.map((metric) => (
            <article key={metric.value} className="landing-mock-panel__metric">
              <h2>{metric.value}</h2>
              <p>{metric.label}</p>
            </article>
          ))}
        </div>
      </header>

      <section className="landing-mock-panel__section" aria-label="Core features">
        <h2 className="landing-mock-panel__section-title">Why users stay with LioraLang</h2>
        <div className="landing-mock-panel__grid">
          {features.map((feature) => (
            <article key={feature.title} className="landing-mock-panel__card">
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-mock-panel__split" aria-label="Start options and workflow">
        <article className="landing-mock-panel__workflow">
          <h2>How fast you can start</h2>
          <ol>
            {workflowSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </article>

        <article className="landing-mock-panel__entry">
          <h2>Choose your way in</h2>
          <p>Start in browser now, then install desktop if you want full offline mode.</p>
          <div className="landing-mock-panel__entry-actions">
            <Link
              to={exploreDecksTo}
              className="landing-mock-panel__entry-link"
              onMouseEnter={handlePrefetchApp}
              onFocus={handlePrefetchApp}
              onTouchStart={handlePrefetchApp}
            >
              Explore community decks
            </Link>
            <a
              href={desktopReleaseUrl}
              className="landing-mock-panel__entry-link"
              target="_blank"
              rel={EXTERNAL_LINK_REL}
            >
              Download macOS and Windows builds
            </a>
          </div>
        </article>
      </section>

      <section className="landing-mock-panel__contacts" aria-label="Contact and support links">
        <h2>Need support or want to contribute</h2>
        <div className="landing-mock-panel__contact-grid">
          {contactLinks.map((contact) => (
            <a
              key={contact.title}
              href={contact.href}
              target={contact.openInNewTab ? "_blank" : undefined}
              rel={contact.openInNewTab ? EXTERNAL_LINK_REL : undefined}
              className="landing-mock-panel__contact-card"
            >
              <h3>{contact.title}</h3>
              <p>{contact.description}</p>
            </a>
          ))}
        </div>
      </section>

      <footer className="landing-mock-panel__footer">
        <p>
          Ready to build your own learning system?
          <Link
            to={openWebTo}
            onMouseEnter={handlePrefetchApp}
            onFocus={handlePrefetchApp}
            onTouchStart={handlePrefetchApp}
          >
            Open LioraLang
          </Link>
        </p>
      </footer>
    </article>
  );
});

LandingMockPanel.displayName = "LandingMockPanel";
