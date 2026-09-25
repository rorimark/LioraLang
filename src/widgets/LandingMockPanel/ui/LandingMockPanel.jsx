import { memo } from "react";
import { Link } from "react-router";
import {
  IoArrowForward,
  IoBookOutline,
  IoGlobeOutline,
  IoLayersOutline,
  IoStatsChartOutline,
} from "react-icons/io5";
import { Flashcard } from "@features/flashcard";
import { SrsRatingControls } from "@features/srs-rating-controls";
import { useLandingMockPanel } from "../model/useLandingMockPanel";
import { useLandingDemoSession } from "../model/useLandingDemoSession";
import { useReviewTimeline } from "../model/useReviewTimeline";
import "./LandingMockPanel.css";

const EXTERNAL_LINK_REL = "noopener noreferrer";

// The sidebar's own icons, so each row reads as the page it describes.
const SECTION_ICONS = {
  learn: IoLayersOutline,
  decks: IoBookOutline,
  browse: IoGlobeOutline,
  progress: IoStatsChartOutline,
};

const DemoSession = memo(() => {
  const {
    deckName,
    card,
    ratingOptions,
    canRate,
    position,
    total,
    isDone,
    log,
    handleRate,
    handleRestart,
  } = useLandingDemoSession();

  return (
    <section className="landing-demo" aria-label="Try a study session">
      <header className="landing-demo__head">
        <span>{deckName}</span>
        <span className="landing-demo__count">
          {isDone ? "Done" : `${position} / ${total}`}
        </span>
      </header>

      {isDone ? (
        <div className="landing-demo__done">
          <strong>That is the whole loop.</strong>
          <p>
            Each word now has its own next review. In the app they come back on
            that day, mixed with whatever else is due.
          </p>
          <button type="button" className="ui-button ui-button--secondary" onClick={handleRestart}>
            Study them again
          </button>
        </div>
      ) : (
        <>
          <div className="landing-demo__card">
            <Flashcard card={card} />
          </div>
          <div className="landing-demo__ratings">
            <SrsRatingControls
              ratingOptions={ratingOptions}
              onRate={handleRate}
              disabled={!canRate}
            />
          </div>
          <p className="landing-demo__hint" aria-live="polite">
            {canRate
              ? "How well did you know it? The number is when it comes back."
              : "Tap the card to see the answer."}
          </p>
        </>
      )}

      {log.length > 0 && (
        <ol className="landing-demo__log" aria-label="Your answers">
          {log.map((entry) => (
            <li key={entry.word}>
              <span>{entry.word}</span>
              <span>{entry.rating}</span>
              <span>back in {entry.interval}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
});

DemoSession.displayName = "DemoSession";

const ReviewTimeline = memo(() => {
  const { points, reviews, months } = useReviewTimeline();

  return (
    <section className="landing-block landing-timeline" aria-labelledby="timeline-title">
      <div className="landing-timeline__copy">
        <h2 id="timeline-title">
          {reviews} reviews, {months} months.
        </h2>
        <p>
          This is the schedule the app runs for a new word you answer Good every
          time. The first days are short learning steps. After that each gap is
          about two and a half times the last, so the words you already know
          stop taking up your day.
        </p>
      </div>

      <ol className="landing-timeline__chart">
        {points.map((point) => (
          <li
            key={point.review}
            className="landing-timeline__column"
            style={{ "--height": point.height }}
          >
            <span className="landing-timeline__gap">{point.gapLabel}</span>
            <span className="landing-timeline__bar" aria-hidden />
            <span className="landing-timeline__review">Review {point.review}</span>
            <span className="landing-timeline__day">day {point.day}</span>
          </li>
        ))}
      </ol>
    </section>
  );
});

ReviewTimeline.displayName = "ReviewTimeline";

export const LandingMockPanel = memo(() => {
  const {
    appSections,
    footerLinks,
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
          <Link to="/" className="landing-brand">
            <span className="landing-logo" aria-hidden>
              LL
            </span>
            <strong>LioraLang</strong>
          </Link>
          <nav className="landing-topbar__actions" aria-label="LioraLang">
            <a
              href={githubRepoUrl}
              className="landing-topbar__link"
              target="_blank"
              rel={EXTERNAL_LINK_REL}
            >
              GitHub
            </a>
            <Link
              to={openWebTo}
              className="ui-button ui-button--primary landing-button"
              {...prefetchProps}
            >
              Open web app
            </Link>
          </nav>
        </div>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__copy">
          <h1 id="landing-title">Stop forgetting words after one review.</h1>
          <p className="landing-hero__lead">
            LioraLang is a flashcard app with spaced repetition. You grade each
            card, and it decides when you see it again: soon if you struggled,
            weeks later if you knew it.
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
              className="landing-text-link"
              target="_blank"
              rel={EXTERNAL_LINK_REL}
            >
              Download for macOS or Windows
              <IoArrowForward aria-hidden />
            </a>
          </div>
          <p className="landing-hero__note">Free. No account needed. Your cards stay on your device.</p>
        </div>

        <DemoSession />
      </section>

      <ReviewTimeline />

      <section className="landing-block" aria-labelledby="inside-title">
        <h2 id="inside-title" className="landing-block__title">
          What is in the app
        </h2>
        <dl className="landing-sections">
          {appSections.map((section) => {
            const Icon = SECTION_ICONS[section.key];
            return (
              <div key={section.key} className="landing-sections__row">
                <dt>
                  {Icon ? <Icon aria-hidden /> : null}
                  {section.title}
                </dt>
                <dd>{section.text}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <section className="landing-block" aria-labelledby="platforms-title">
        <h2 id="platforms-title" className="landing-block__title">
          Where it runs
        </h2>
        <div className="landing-platforms">
          <div>
            <h3>In the browser</h3>
            <p>Everything, with nothing to install. Cards are kept in the browser’s storage.</p>
            <Link to={openWebTo} className="landing-text-link" {...prefetchProps}>
              Open web app
              <IoArrowForward aria-hidden />
            </Link>
          </div>
          <div>
            <h3>macOS and Windows</h3>
            <p>A desktop app with a local SQLite database, fully offline.</p>
            <a
              href={desktopReleaseUrl}
              className="landing-text-link"
              target="_blank"
              rel={EXTERNAL_LINK_REL}
            >
              Download builds
              <IoArrowForward aria-hidden />
            </a>
          </div>
          <div>
            <h3>On your phone</h3>
            <p>
              Open the web app in Safari or Chrome, then choose Add to Home
              Screen. It opens like an app and works offline.
            </p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <span className="landing-brand landing-brand--muted">
          <span className="landing-logo landing-logo--sm" aria-hidden>
            LL
          </span>
          LioraLang
        </span>
        <ul>
          {footerLinks.map((link) => (
            <li key={link.title}>
              <a
                href={link.href}
                target={link.isExternal ? "_blank" : undefined}
                rel={link.isExternal ? EXTERNAL_LINK_REL : undefined}
              >
                {link.title}
              </a>
            </li>
          ))}
        </ul>
      </footer>
    </article>
  );
});

LandingMockPanel.displayName = "LandingMockPanel";
