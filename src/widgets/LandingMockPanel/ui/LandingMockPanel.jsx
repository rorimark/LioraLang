import { memo } from "react";
import { Link } from "react-router";
import { Flashcard } from "@features/flashcard";
import { SrsRatingControls } from "@features/srs-rating-controls";
import { useLandingMockPanel } from "../model/useLandingMockPanel";
import { useLandingDemoSession } from "../model/useLandingDemoSession";
import { useReviewTimeline } from "../model/useReviewTimeline";
import {
  DecksIllustration,
  HeroIllustration,
  HubIllustration,
  PlatformsIllustration,
} from "./LandingIllustrations";
import "@fontsource-variable/nunito";
import "./LandingMockPanel.css";

const EXTERNAL_LINK_REL = "noopener noreferrer";
// The app's own icon, the same one the desktop build and the PWA install use.
const APP_ICON_SRC = "/icons/icon-192.png";

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
    <div className="lp-demo">
      <div className="lp-demo__head">
        <span>{deckName}</span>
        <span className="lp-demo__progress" aria-hidden>
          <span style={{ width: `${((isDone ? total : position - 1) / total) * 100}%` }} />
        </span>
        <span className="lp-demo__count">{isDone ? total : position - 1}/{total}</span>
      </div>

      {isDone ? (
        <div className="lp-demo__done">
          <strong>Nice work.</strong>
          <p>
            Every word now has its own next review. In the app each one comes
            back on that day.
          </p>
          <ol className="lp-demo__log" aria-label="Your answers">
            {log.map((entry) => (
              <li key={entry.word}>
                <span>{entry.word}</span>
                <span className={`lp-demo__grade lp-grade-${entry.rating.toLowerCase()}`}>
                  {entry.rating}
                </span>
                <span>back in {entry.interval}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="lp-btn lp-btn--secondary" onClick={handleRestart}>
            Study them again
          </button>
        </div>
      ) : (
        <>
          <div className="lp-demo__card">
            <Flashcard card={card} />
          </div>
          <div className="lp-demo__ratings">
            <SrsRatingControls
              ratingOptions={ratingOptions}
              onRate={handleRate}
              disabled={!canRate}
            />
          </div>
          <p className="lp-demo__hint" aria-live="polite">
            {canRate
              ? "How well did you know it? The time is when it comes back."
              : "Tap the card to flip it."}
          </p>
        </>
      )}
    </div>
  );
});

DemoSession.displayName = "DemoSession";

const TimelineChart = memo(() => {
  const { points } = useReviewTimeline();

  return (
    <ol className="lp-art lp-chart" aria-label="Days between reviews of one word">
      {points.map((point) => (
        <li key={point.review} style={{ "--height": point.height }}>
          <span className="lp-chart__gap">{point.gapLabel}</span>
          <span className="lp-chart__bar" aria-hidden />
          <span className="lp-chart__day">day {point.day}</span>
        </li>
      ))}
    </ol>
  );
});

TimelineChart.displayName = "TimelineChart";

const FeatureRow = memo(({ title, children, art, isReversed = false, id }) => (
  <section
    className={`lp-feature${isReversed ? " lp-feature--reversed" : ""}`}
    aria-labelledby={id}
  >
    <div className="lp-feature__art">{art}</div>
    <div className="lp-feature__copy">
      <h2 id={id}>{title}</h2>
      {children}
    </div>
  </section>
));

FeatureRow.displayName = "FeatureRow";

export const LandingMockPanel = memo(() => {
  const {
    deckLanguages,
    sampleDecks,
    platforms,
    footerLinks,
    openWebTo,
    browseTo,
    desktopReleaseUrl,
    handlePrefetchApp,
  } = useLandingMockPanel();
  const { reviews, months } = useReviewTimeline();

  const prefetchProps = {
    onMouseEnter: handlePrefetchApp,
    onFocus: handlePrefetchApp,
    onTouchStart: handlePrefetchApp,
  };

  return (
    <article className="lp">
      <header className="lp-topbar">
        <div className="lp-topbar__inner">
          <Link to="/" className="lp-brand">
            <img src={APP_ICON_SRC} alt="" width="36" height="36" />
            <span>lioralang</span>
          </Link>
          <Link to={openWebTo} className="lp-btn lp-btn--primary lp-btn--sm" {...prefetchProps}>
            Open web app
          </Link>
        </div>
      </header>

      <section className="lp-hero" aria-labelledby="lp-title">
        <HeroIllustration />
        <div className="lp-hero__copy">
          <h1 id="lp-title">The flashcard app that knows when you’ll forget.</h1>
          <p>
            Grade each word, and LioraLang brings it back right before it slips
            away. Free, and your cards stay on your device.
          </p>
          <div className="lp-hero__actions">
            <Link to={openWebTo} className="lp-btn lp-btn--primary" {...prefetchProps}>
              Start learning
            </Link>
            <a
              href={desktopReleaseUrl}
              className="lp-btn lp-btn--secondary"
              target="_blank"
              rel={EXTERNAL_LINK_REL}
            >
              Download for desktop
            </a>
          </div>
        </div>
      </section>

      <div className="lp-langs">
        <div className="lp-langs__inner">
          <span className="lp-langs__label">Ready-made decks in</span>
          <ul>
            {deckLanguages.map((language) => (
              <li key={language}>{language}</li>
            ))}
          </ul>
        </div>
      </div>

      <section className="lp-try" aria-labelledby="lp-try-title">
        <h2 id="lp-try-title">Try it right now.</h2>
        <p>Six real words from the Travel &amp; Tourism deck. No sign-up.</p>
        <DemoSession />
      </section>

      <FeatureRow
        id="lp-memory"
        title="Learn it once. Remember it for months."
        art={<TimelineChart />}
      >
        <p>
          Answer Good and a new word comes back tomorrow, then in three days,
          then weeks later. {reviews} reviews carry it across {months} months,
          so the words you know stop crowding your day.
        </p>
      </FeatureRow>

      <FeatureRow
        id="lp-decks"
        title="Your words. Your decks."
        art={<DecksIllustration decks={sampleDecks} />}
        isReversed
      >
        <p>
          Make a deck for any language pair, add levels, tags and example
          sentences, and study only what you actually need. Import and export
          as JSON whenever you like.
        </p>
      </FeatureRow>

      <FeatureRow id="lp-hub" title="Somebody already made that deck." art={<HubIllustration />}>
        <p>
          LioraLangHub is full of decks other learners published. Find one,
          import it in a click, and start reviewing. Share your own the same way.
        </p>
        <Link to={browseTo} className="lp-link" {...prefetchProps}>
          Browse the hub
        </Link>
      </FeatureRow>

      <FeatureRow
        id="lp-anywhere"
        title="Learn wherever you are."
        art={<PlatformsIllustration platforms={platforms} />}
        isReversed
      >
        <p>
          Use it in the browser, install the desktop app for macOS or Windows,
          or add it to your phone’s home screen. It keeps working offline.
        </p>
      </FeatureRow>

      <section className="lp-cta" aria-labelledby="lp-cta-title">
        <h2 id="lp-cta-title">Your first review takes a minute.</h2>
        <Link to={openWebTo} className="lp-btn lp-btn--inverse" {...prefetchProps}>
          Start learning
        </Link>
      </section>

      <footer className="lp-footer">
        <span className="lp-brand lp-brand--small">
          <img src={APP_ICON_SRC} alt="" width="24" height="24" />
          <span>lioralang</span>
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
