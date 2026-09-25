import { memo } from "react";
import { Link } from "react-router";
import {
  FiBookOpen,
  FiCheck,
  FiClock,
  FiDatabase,
  FiDownload,
  FiGlobe,
  FiLayers,
  FiMonitor,
  FiRepeat,
  FiShield,
  FiStar,
  FiTrendingUp,
} from "react-icons/fi";
import { MetaBadge, Panel } from "@shared/ui";
import { useLandingMockPanel } from "../model/useLandingMockPanel";
import { LandingAppPreview } from "./LandingAppPreview";
import { LandingPhonePreview } from "./LandingPhonePreview";
import "./LandingMockPanel.css";

const EXTERNAL_LINK_REL = "noopener noreferrer";

const ICONS = {
  srs: FiRepeat,
  offline: FiDatabase,
  platforms: FiMonitor,
  deck: FiLayers,
  study: FiBookOpen,
  control: FiShield,
  web: FiGlobe,
  desktop: FiDownload,
};

// The landing is built from the app's own parts (Panel, MetaBadge, the
// ui-button styles and the design tokens) so leaving it for the app does
// not feel like changing products.
export const LandingMockPanel = memo(() => {
  const {
    heroHighlights,
    featureCards,
    startOptions,
    hubHighlights,
    mobileSteps,
    sectionLinks,
    previewNavItems,
    previewCard,
    previewRatings,
    contactLinks,
    openWebTo,
    desktopReleaseUrl,
    githubRepoUrl,
    handlePrefetchApp,
  } = useLandingMockPanel();

  const prefetchProps = {
    onMouseEnter: handlePrefetchApp,
    onFocus: handlePrefetchApp,
    onTouchStart: handlePrefetchApp,
  };

  return (
    <article className="landing-shell">
      <header className="landing-topbar">
        <div className="landing-topbar__inner">
          <Link to="/" className="landing-brand" aria-label="LioraLang home">
            <span className="landing-logo" aria-hidden>
              LL
            </span>
            <span className="landing-brand__text">
              <strong>LioraLang</strong>
              <span>Flashcards and spaced repetition</span>
            </span>
          </Link>

          <nav className="landing-topbar__nav" aria-label="Page sections">
            {sectionLinks.map((link) => (
              <a key={link.id} href={`#${link.id}`}>
                {link.title}
              </a>
            ))}
          </nav>

          <div className="landing-topbar__actions">
            <a
              href={desktopReleaseUrl}
              className="ui-button ui-button--secondary landing-button landing-topbar__secondary"
              target="_blank"
              rel={EXTERNAL_LINK_REL}
            >
              Download
            </a>
            <Link
              to={openWebTo}
              className="ui-button ui-button--primary landing-button"
              {...prefetchProps}
            >
              Open web app
            </Link>
          </div>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__content">
          <MetaBadge text="Web · macOS · Windows · Offline-first" />
          <h1 id="landing-title">Stop forgetting words after one review.</h1>
          <p className="landing-hero__lead">
            Build decks from the words you actually need, review them on a spaced
            repetition schedule, and keep every card on your own device.
          </p>
          <div className="landing-hero__actions">
            <Link
              to={openWebTo}
              className="ui-button ui-button--primary landing-button landing-button--lg"
              {...prefetchProps}
            >
              Open web app
            </Link>
            <a
              href={desktopReleaseUrl}
              className="ui-button ui-button--secondary landing-button landing-button--lg"
              target="_blank"
              rel={EXTERNAL_LINK_REL}
            >
              <FiDownload aria-hidden />
              Download desktop
            </a>
          </div>
          <ul className="landing-hero__highlights" aria-label="Key product highlights">
            {heroHighlights.map((item) => {
              const Icon = ICONS[item.iconKey];
              return (
                <li key={item.title} className="landing-highlight">
                  <span className="landing-icon-tile" aria-hidden>
                    {Icon ? <Icon /> : null}
                  </span>
                  <span className="landing-highlight__text">
                    <span>{item.title}</span>
                    <strong>{item.subtitle}</strong>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <LandingAppPreview
          navItems={previewNavItems}
          card={previewCard}
          ratings={previewRatings}
        />
      </section>

      <section id="features" className="landing-section" aria-labelledby="features-title">
        <header className="landing-section__head">
          <p className="landing-eyebrow">Features</p>
          <h2 id="features-title">Everything you need, nothing you don’t.</h2>
          <p>Short, focused tools that keep learning clean and fast.</p>
        </header>
        <div className="landing-grid landing-grid--three">
          {featureCards.map((card) => {
            const Icon = ICONS[card.iconKey];
            return (
              <Panel key={card.title} className="landing-feature">
                <div className="landing-feature__head">
                  <span className="landing-icon-tile" aria-hidden>
                    {Icon ? <Icon /> : null}
                  </span>
                  <h3>{card.title}</h3>
                </div>
                <div className="landing-feature__badges">
                  {card.points.map((point) => (
                    <MetaBadge key={point} text={point} />
                  ))}
                </div>
              </Panel>
            );
          })}
        </div>
      </section>

      <section id="hub" className="landing-section" aria-label="Ways to start and the deck hub">
        <div className="landing-grid landing-grid--two">
          <Panel className="landing-card">
            <header className="landing-card__head">
              <p className="landing-eyebrow">Get started</p>
              <h2>Pick your entry point</h2>
            </header>
            <ul className="landing-start-list">
              {startOptions.map((option) => {
                const Icon = ICONS[option.iconKey];
                const actionClassName =
                  "ui-button ui-button--secondary ui-button--sm landing-button";
                return (
                  <li key={option.title} className="landing-start-row">
                    <span className="landing-icon-tile" aria-hidden>
                      {Icon ? <Icon /> : null}
                    </span>
                    <span className="landing-start-row__text">
                      <strong>{option.title}</strong>
                      <span>{option.description}</span>
                    </span>
                    {option.to ? (
                      <Link to={option.to} className={actionClassName} {...prefetchProps}>
                        {option.actionLabel}
                      </Link>
                    ) : (
                      <a
                        href={option.href}
                        className={actionClassName}
                        target="_blank"
                        rel={EXTERNAL_LINK_REL}
                      >
                        {option.actionLabel}
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel className="landing-card">
            <header className="landing-card__head">
              <p className="landing-eyebrow">LioraLangHub</p>
              <h2>Community decks, one click away</h2>
              <p>Find a deck someone already built, import it, and start reviewing.</p>
            </header>
            <ul className="landing-checks">
              {hubHighlights.map((item) => (
                <li key={item}>
                  <span className="landing-checks__mark" aria-hidden>
                    <FiCheck />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </section>

      <section id="mobile" className="landing-section" aria-labelledby="mobile-title">
        <Panel className="landing-card landing-mobile">
          <div className="landing-mobile__copy">
            <header className="landing-card__head">
              <p className="landing-eyebrow">On your phone</p>
              <h2 id="mobile-title">Install it like an app</h2>
              <p>LioraLang runs from your home screen and keeps working offline.</p>
            </header>
            <ol className="landing-steps">
              {mobileSteps.map((step, index) => (
                <li key={step}>
                  <span className="landing-steps__index" aria-hidden>
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <ul className="landing-habits">
              <li>
                <FiStar aria-hidden /> One clear queue that tells you what matters today.
              </li>
              <li>
                <FiClock aria-hidden /> Short sessions that fit commutes and breaks.
              </li>
              <li>
                <FiTrendingUp aria-hidden /> Visible progress that keeps motivation real.
              </li>
            </ul>
          </div>
          <LandingPhonePreview
            navItems={previewNavItems}
            card={previewCard}
            ratings={previewRatings}
          />
        </Panel>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer__brand">
          <span className="landing-logo" aria-hidden>
            LL
          </span>
          <span>
            <strong>LioraLang</strong>
            <span>Offline-first language learning with spaced repetition.</span>
          </span>
        </div>
        <ul className="landing-footer__links">
          {contactLinks.map((link) => (
            <li key={link.title}>
              <a
                href={link.href}
                target={link.openInNewTab ? "_blank" : undefined}
                rel={link.openInNewTab ? EXTERNAL_LINK_REL : undefined}
              >
                {link.title}
              </a>
              <span>{link.description}</span>
            </li>
          ))}
        </ul>
        <div className="landing-footer__actions">
          <Link
            to={openWebTo}
            className="ui-button ui-button--primary landing-button"
            {...prefetchProps}
          >
            Open LioraLang
          </Link>
          <a
            href={githubRepoUrl}
            className="ui-button ui-button--ghost landing-button"
            target="_blank"
            rel={EXTERNAL_LINK_REL}
          >
            View on GitHub
          </a>
        </div>
      </footer>
    </article>
  );
});

LandingMockPanel.displayName = "LandingMockPanel";
