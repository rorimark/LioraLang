import { memo, useRef } from "react";
import { IoCheckmark } from "react-icons/io5";
import { Link } from "react-router";
import { AppIcon } from "@shared/ui";
import { Flashcard } from "@features/flashcard";
import { SrsRatingControls } from "@features/srs-rating-controls";
import { useLandingMockPanel } from "../model/useLandingMockPanel";
import { useLandingDemoSession } from "../model/useLandingDemoSession";
import { useReviewTimeline } from "../model/useReviewTimeline";
import { useRevealOnScroll } from "../model/useRevealOnScroll";
import {
  DecksIllustration,
  HeroIllustration,
  HubIllustration,
  PlatformsIllustration,
} from "./LandingIllustrations";
import "@fontsource-variable/nunito";
import "./LandingMockPanel.css";

const EXTERNAL_LINK_REL = "noopener noreferrer";

const DemoSession = memo(() => {
  const demoRef = useRef(null);
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
    handleReveal,
    handleRestart,
  } = useLandingDemoSession(demoRef);

  return (
    <div className="lp-demo" ref={demoRef}>
      <div className="lp-demo__head">
        <span>{deckName}</span>
        <span className="lp-demo__progress" aria-hidden>
          <span style={{ width: `${((isDone ? total : position - 1) / total) * 100}%` }} />
        </span>
        <span className="lp-demo__count">{isDone ? total : position - 1}/{total}</span>
      </div>

      {isDone ? (
        <div className="lp-demo__done">
          <div className="lp-demo__done-head">
            <span className="lp-demo__badge" aria-hidden>
              <IoCheckmark />
            </span>
            <strong>Nice work.</strong>
          </div>
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
          {/* One clear step at a time: recall, then show the answer, then
              grade. The grades only appear once there is something to grade. */}
          <div className="lp-demo__ratings">
            {canRate ? (
              <SrsRatingControls ratingOptions={ratingOptions} onRate={handleRate} />
            ) : (
              <button
                type="button"
                className="lp-btn lp-btn--primary lp-demo__reveal"
                onClick={handleReveal}
              >
                Show answer
              </button>
            )}
          </div>
          <p className="lp-demo__hint" aria-live="polite">
            {canRate
              ? "How well did you know it? The time is when it comes back."
              : "Think of the translation, then check yourself."}
            <span className="lp-demo__keys">
              {canRate ? (
                <>
                  <kbd>1</kbd>–<kbd>4</kbd> grade
                </>
              ) : (
                <>
                  <kbd>Space</kbd> shows the answer
                </>
              )}
            </span>
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
    <div className="lp-feature__art" data-reveal>
      {art}
    </div>
    <div className="lp-feature__copy" data-reveal>
      <h2 id={id}>{title}</h2>
      {children}
    </div>
  </section>
));

FeatureRow.displayName = "FeatureRow";

export const LandingMockPanel = memo(() => {
  const {
    deckLanguages,
    exampleDecks,
    authorUrl,
    platforms,
    footerLinks,
    openWebTo,
    browseTo,
    desktopReleaseUrl,
    handlePrefetchApp,
  } = useLandingMockPanel();
  const { reviews, months } = useReviewTimeline();
  const rootRef = useRef(null);
  useRevealOnScroll(rootRef);

  const prefetchProps = {
    onMouseEnter: handlePrefetchApp,
    onFocus: handlePrefetchApp,
    onTouchStart: handlePrefetchApp,
  };

  return (
    <article className="lp" ref={rootRef}>
      <header className="lp-topbar">
        <div className="lp-topbar__inner">
          <Link to="/" className="lp-brand">
            <AppIcon size={36} />
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
          <h1 id="lp-title">
            The flashcard app that knows when you’ll <em>forget.</em>
          </h1>
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
          <span className="lp-langs__label">
            {deckLanguages.length} languages, any pair
          </span>
          <ul>
            {deckLanguages.map((language) => (
              <li key={language.name} className={`lp-tone-${language.tone}`}>
                {language.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="lp-try" aria-labelledby="lp-try-title">
        <h2 id="lp-try-title">Try it right now.</h2>
        <p>Six words, a real review session, no sign-up.</p>
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
        art={<DecksIllustration decks={exampleDecks} />}
        isReversed
      >
        <p>
          Make a deck for any language pair, add levels, tags and example
          sentences, and study only what you actually need. Import and export
          as JSON whenever you like.
        </p>
      </FeatureRow>

      <FeatureRow id="lp-hub" title="Somebody already made that deck." art={<HubIllustration to={browseTo} />}>
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
        <span className="lp-sticker lp-tone-green lp-cta__sticker lp-cta__sticker--l" aria-hidden>
          Easy
          <small>3d</small>
        </span>
        <span className="lp-sticker lp-tone-amber lp-cta__sticker lp-cta__sticker--r" aria-hidden>
          Good
          <small>24h</small>
        </span>
        <h2 id="lp-cta-title">Your first review takes a minute.</h2>
        <Link to={openWebTo} className="lp-btn lp-btn--inverse" {...prefetchProps}>
          Start learning
        </Link>
      </section>

      <footer className="lp-footer">
        <span className="lp-brand lp-brand--small">
          <AppIcon size={24} />
          <span>lioralang</span>
        </span>
        <p className="lp-footer__credit">
          Made by{" "}
          <a href={authorUrl} target="_blank" rel={EXTERNAL_LINK_REL}>
            Mark Storchovyi
          </a>
        </p>
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
