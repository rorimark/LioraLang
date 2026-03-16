import { memo } from "react";
import { Link } from "react-router";
import {
  FiBookOpen,
  FiCheck,
  FiClock,
  FiDatabase,
  FiDownload,
  FiGlobe,
  FiGrid,
  FiLayers,
  FiMonitor,
  FiRepeat,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import { useLandingMockPanel } from "../model/useLandingMockPanel";
import "./LandingMockPanel.css";

const EXTERNAL_LINK_REL = "noopener noreferrer";

export const LandingMockPanel = memo(() => {
  const {
    heroHighlights,
    featureCards,
    startOptions,
    hubHighlights,
    visualTiles,
    mobileSteps,
    openWebTo,
    desktopReleaseUrl,
    handlePrefetchApp,
  } = useLandingMockPanel();

  const iconMap = {
    srs: FiRepeat,
    offline: FiDatabase,
    platforms: FiMonitor,
    deck: FiLayers,
    study: FiBookOpen,
    control: FiShield,
    web: FiGlobe,
    desktop: FiDownload,
    hub: FiUsers,
    analytics: FiTrendingUp,
    cadence: FiClock,
    layout: FiGrid,
  };

  return (
    <article className="landing-shell">
      <header className="landing-hero">
        <div className="landing-hero__inner">
          <div className="landing-hero__content">
            <span className="landing-hero__eyebrow">LioraLang</span>
            <h1>Stop forgetting words after one review.</h1>
            <p className="landing-hero__lead">
              A clean spaced repetition workspace that turns vocab into a daily habit.
            </p>
            <div className="landing-hero__actions">
              <Link
                to={openWebTo}
                className="landing-cta landing-cta--primary"
                onMouseEnter={handlePrefetchApp}
                onFocus={handlePrefetchApp}
                onTouchStart={handlePrefetchApp}
              >
                Open web app
              </Link>
              <a
                href={desktopReleaseUrl}
                className="landing-cta landing-cta--secondary"
                target="_blank"
                rel={EXTERNAL_LINK_REL}
              >
                Download desktop
              </a>
            </div>
            <div className="landing-hero__highlights" aria-label="Key product highlights">
              {heroHighlights.map((item) => {
                const Icon = item.iconKey ? iconMap[item.iconKey] : null;
                return (
                  <div key={item.title} className="landing-hero__chip">
                    {Icon ? (
                      <span className="landing-hero__chip-icon" aria-hidden>
                        <Icon />
                      </span>
                    ) : null}
                    <span>{item.title}</span>
                    <strong>{item.subtitle}</strong>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="landing-hero__visual" aria-hidden="true">
            <div className="landing-hero__stack">
              <div className="landing-hero__card landing-hero__card--front">
                <span>Front</span>
                <h3>abstraction</h3>
                <p>pojęcie abstrakcyjne</p>
              </div>
              <div className="landing-hero__card landing-hero__card--back">
                <span>Back</span>
                <h3>example</h3>
                <p>Abstract ideas shape design decisions.</p>
              </div>
            </div>
            <div className="landing-hero__dashboard">
              <div className="landing-hero__stat">
                <span>Due</span>
                <strong>18</strong>
              </div>
              <div className="landing-hero__stat">
                <span>Learning</span>
                <strong>42</strong>
              </div>
              <div className="landing-hero__stat">
                <span>Streak</span>
                <strong>7d</strong>
              </div>
            </div>
            <div className="landing-hero__phone">
              <div className="landing-hero__phone-screen">
                <div className="landing-hero__phone-pill">Today</div>
                <div className="landing-hero__phone-card" />
                <div className="landing-hero__phone-card landing-hero__phone-card--light" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="landing-strip" aria-label="Product snapshots">
        {visualTiles.map((tile) => {
          const Icon = tile.iconKey ? iconMap[tile.iconKey] : null;
          return (
            <article key={tile.title} className="landing-strip__tile">
              <span className="landing-strip__icon" aria-hidden>
                {Icon ? <Icon /> : null}
              </span>
              <div className="landing-strip__text">
                <h3>{tile.title}</h3>
                <p>{tile.subtitle}</p>
              </div>
            </article>
          );
        })}
      </section>

      <section className="landing-section" aria-label="Core capabilities">
        <div className="landing-section__head">
          <h2>Everything you need, nothing you don’t.</h2>
          <p>Short, focused features that keep learning clean and fast.</p>
        </div>
        <div className="landing-feature-grid">
          {featureCards.map((card) => {
            const Icon = card.iconKey ? iconMap[card.iconKey] : null;
            return (
              <article key={card.title} className="landing-feature">
                <div className="landing-feature__header">
                  {Icon ? (
                    <span className="landing-feature__icon" aria-hidden>
                      <Icon />
                    </span>
                  ) : null}
                  <h3>{card.title}</h3>
                </div>
                <div className="landing-feature__tags">
                  {card.points.map((point) => (
                    <span key={point}>{point}</span>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-band" aria-label="Ways to start">
        <div className="landing-band__col">
          <h2>Pick your entry point</h2>
          <div className="landing-start-grid">
            {startOptions.map((option) => {
              const Icon = option.iconKey ? iconMap[option.iconKey] : null;
              return (
                <div key={option.title} className="landing-start-row">
                  <div className="landing-start-row__icon" aria-hidden>
                    {Icon ? <Icon /> : null}
                  </div>
                  <div className="landing-start-row__content">
                    <strong>{option.title}</strong>
                    <span>{option.description}</span>
                  </div>
                  {option.to ? (
                    <Link
                      to={option.to}
                      className="landing-start-row__action"
                      onMouseEnter={handlePrefetchApp}
                      onFocus={handlePrefetchApp}
                      onTouchStart={handlePrefetchApp}
                    >
                      {option.actionLabel}
                    </Link>
                  ) : (
                    <a
                      href={option.href}
                      className="landing-start-row__action"
                      target="_blank"
                      rel={EXTERNAL_LINK_REL}
                    >
                      {option.actionLabel}
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="landing-band__col landing-band__col--accent">
          <h2>LioraLangHub</h2>
          <p className="landing-band__lead">Community decks with one-click import.</p>
          <div className="landing-band__icons" aria-hidden>
            <span>
              <FiUsers /> Shared decks
            </span>
            <span>
              <FiLayers /> Curated packs
            </span>
            <span>
              <FiDownload /> One-click import
            </span>
          </div>
          <ul className="landing-mini-list landing-mini-list--checks">
            {hubHighlights.map((item) => (
              <li key={item}>
                <FiCheck />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="landing-band landing-band--phone" aria-label="Mobile usage">
        <div className="landing-phone-layout">
          <div className="landing-phone-copy">
            <article className="landing-phone-card">
              <h2>Use it on your phone</h2>
              <p className="landing-band__lead">
                Add LioraLang to your home screen and use it like a native app.
              </p>
              <ol className="landing-mini-list landing-mini-list--steps">
                {mobileSteps.map((step, index) => (
                  <li key={step}>
                    <span className="landing-step-index">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </article>

            <article className="landing-phone-card">
              <h2>Why it becomes a daily habit</h2>
              <ul className="landing-mini-list">
                <li>
                  <FiStar /> One clear queue that tells you what matters today.
                </li>
                <li>
                  <FiClock /> Short sessions that fit commutes and breaks.
                </li>
                <li>
                  <FiTrendingUp /> Visible progress so motivation stays real.
                </li>
              </ul>
            </article>
          </div>

          <div className="landing-phone-visual" aria-hidden>
            <div className="landing-phone-visual__bezel">
              <div className="landing-phone-visual__screen">
                <div className="landing-phone-visual__status">
                  <span>9:41</span>
                  <span>5G</span>
                </div>
                <div className="landing-phone-visual__page-title">Flashcards</div>
                <div className="landing-phone-visual__row">
                  <span className="landing-phone-visual__select">Travel & Tourism</span>
                  <span className="landing-phone-visual__refresh">Refresh</span>
                </div>
                <div className="landing-phone-visual__flashcard">
                  <span className="landing-phone-visual__pill">Front</span>
                  <strong className="landing-phone-visual__word">guidebook</strong>
                  <span className="landing-phone-visual__hint">Tap to reveal answer</span>
                </div>
                <div className="landing-phone-visual__button">Show answer</div>
                <div className="landing-phone-visual__panel">Reveal the answer to see grading.</div>
                <div className="landing-phone-visual__nav">
                  <span className="landing-phone-visual__nav-item landing-phone-visual__nav-item--active">
                    Learn
                  </span>
                  <span className="landing-phone-visual__nav-item">Decks</span>
                  <span className="landing-phone-visual__nav-item">Browse</span>
                  <span className="landing-phone-visual__nav-item">Progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>Ready to build your own system?</p>
        <Link
          to={openWebTo}
          onMouseEnter={handlePrefetchApp}
          onFocus={handlePrefetchApp}
          onTouchStart={handlePrefetchApp}
        >
          Open LioraLang
        </Link>
      </footer>
    </article>
  );
});

LandingMockPanel.displayName = "LandingMockPanel";
