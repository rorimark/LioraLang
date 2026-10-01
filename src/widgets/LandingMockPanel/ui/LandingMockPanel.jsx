import { Fragment, memo, useRef } from "react";
import { IoCheckmark, IoChevronDown, IoGlobeOutline, IoLogoAndroid, IoLogoApple } from "react-icons/io5";
import { Link } from "react-router";
import { AppIcon, Select } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import { Flashcard } from "@features/flashcard";
import { SrsRatingControls } from "@features/srs-rating-controls";
import { useLandingMockPanel } from "../model/useLandingMockPanel";
import { useLandingDemoSession } from "../model/useLandingDemoSession";
import { useReviewTimeline } from "../model/useReviewTimeline";
import { useRevealOnScroll } from "../model/useRevealOnScroll";
import { buildFaqItems } from "../model/landingFaq";
import {
  AiIllustration,
  DecksIllustration,
  HeroIllustration,
  HubIllustration,
  PhoneIllustration,
  PlatformsIllustration,
} from "./LandingIllustrations";
import "./LandingMockPanel.css";

const EXTERNAL_LINK_REL = "noopener noreferrer";

const PHONE_SYSTEM_ICONS = { ios: IoLogoApple, android: IoLogoAndroid };

// A message with elements inside it ("{keys} grade", "Made by {name}"):
// each {slot} is replaced by the element given for it, wherever the
// translation puts it.
const SLOT_MARK = "\u0001";
const withSlots = (t, key, slots) => {
  const markers = Object.fromEntries(Object.keys(slots).map((name) => [name, `${SLOT_MARK}${name}${SLOT_MARK}`]));

  return t(key, markers)
    .split(new RegExp(`${SLOT_MARK}(\\w+)${SLOT_MARK}`))
    .map((part, index) =>
      index % 2 === 1 ? <Fragment key={index}>{slots[part]}</Fragment> : part,
    );
};

// The headline's accent: the word between ** is set in italics.
const withAccent = (message) =>
  String(message)
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") ? <em key={index}>{part.slice(2, -2)}</em> : part,
    );

const DemoSession = memo(() => {
  const demoRef = useRef(null);
  const { t, formatInterval } = useI18n();
  const {
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
        <span>{t("landing.demo.deckName")}</span>
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
            <strong>{t("landing.demo.doneTitle")}</strong>
          </div>
          <p>{t("landing.demo.doneText")}</p>
          <ol className="lp-demo__log" aria-label={t("landing.demo.answers")}>
            {log.map((entry) => (
              <li key={entry.word}>
                <span>{entry.word}</span>
                <span className={`lp-demo__grade lp-grade-${entry.rating}`}>
                  {t(`grades.${entry.rating}.label`)}
                </span>
                <span>{t("landing.demo.backIn", { interval: formatInterval(entry.interval) })}</span>
              </li>
            ))}
          </ol>
          <button type="button" className="lp-btn lp-btn--secondary" onClick={handleRestart}>
            {t("landing.demo.again")}
          </button>
        </div>
      ) : (
        <>
          {/* Keyed by position, so each new word slides in. */}
          <div className="lp-demo__card" key={position}>
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
                {t("landing.demo.reveal")}
              </button>
            )}
          </div>
          <p className="lp-demo__hint" aria-live="polite">
            {canRate ? t("landing.demo.hintGrade") : t("landing.demo.hintThink")}
            <span className="lp-demo__keys">
              {canRate
                ? withSlots(t, "landing.demo.keysGrade", {
                    keys: (
                      <>
                        <kbd>1</kbd>–<kbd>4</kbd>
                      </>
                    ),
                  })
                : withSlots(t, "landing.demo.keysReveal", {
                    key: <kbd>{t("landing.demo.spaceKey")}</kbd>,
                  })}
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
  const { t, formatNumber } = useI18n();

  // Above the bars, the number of days alone: the axis below already says
  // "day", and a unit on every bar would not fit on a phone.
  return (
    <ol className="lp-art lp-chart" aria-label={t("landing.memory.chartLabel")}>
      {points.map((point, index) => (
        <li key={point.review} style={{ "--height": point.height, "--bar": index }}>
          <span className="lp-chart__gap">+{formatNumber(Math.round(point.gapDays))}</span>
          <span className="lp-chart__bar" aria-hidden />
          <span className="lp-chart__day">{t("landing.memory.day", { day: point.day })}</span>
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

// Short answers to what people ask before they try it, as rows that open.
const LandingFaq = memo(() => {
  const { t, languageName } = useI18n();
  const items = buildFaqItems({ t, languageName });

  return (
    <section className="lp-faq" aria-labelledby="lp-faq-title">
      <h2 id="lp-faq-title">{t("landing.faq.title")}</h2>
      <div className="lp-faq__list">
        {items.map((item) => (
          <details key={item.key} className="lp-faq__item">
            <summary>
              <span>{item.question}</span>
              <IoChevronDown className="lp-faq__chevron" aria-hidden />
            </summary>
            <p>{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
});

LandingFaq.displayName = "LandingFaq";

export const LandingMockPanel = memo(() => {
  const { t, languageName, formatInterval } = useI18n();
  const {
    locale,
    locales,
    handleLanguageChange,
    deckLanguages,
    exampleDecks,
    authorUrl,
    authorName,
    hubExampleDeck,
    platforms,
    footerLinks,
    languageLinks,
    openWebTo,
    browseTo,
    desktopReleaseUrl,
    phoneSystems,
    handlePrefetchApp,
  } = useLandingMockPanel();
  const { reviews, firstGaps, span } = useReviewTimeline();
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
          <div className="lp-topbar__actions">
            {/* The app's own picker: a list on a computer, a sheet on a
                phone. Closed, it shows only the code of the language, so a
                long name never pushes the button off a small screen. */}
            <Select
              className="lp-lang"
              value={locale}
              onChange={handleLanguageChange}
              label={t("landing.topbar.language")}
              searchable={false}
              renderValue={(option) => (
                <>
                  <IoGlobeOutline aria-hidden />
                  {option.value.toUpperCase()}
                </>
              )}
            >
              {locales.map((item) => (
                <option key={item.code} value={item.code} lang={item.code}>
                  {item.nativeName}
                </option>
              ))}
            </Select>
            <Link to={openWebTo} className="lp-btn lp-btn--primary lp-btn--sm" {...prefetchProps}>
              {t("landing.topbar.open")}
            </Link>
          </div>
        </div>
      </header>

      <section className="lp-hero" aria-labelledby="lp-title">
        <HeroIllustration />
        <div className="lp-hero__copy">
          <h1 id="lp-title">{withAccent(t("landing.hero.title"))}</h1>
          <p>{t("landing.hero.text")}</p>
          <div className="lp-hero__actions">
            <Link to={openWebTo} className="lp-btn lp-btn--primary" {...prefetchProps}>
              {t("landing.hero.start")}
            </Link>
            <a
              href={desktopReleaseUrl}
              className="lp-btn lp-btn--secondary"
              target="_blank"
              rel={EXTERNAL_LINK_REL}
            >
              {t("landing.hero.download")}
            </a>
          </div>
        </div>
      </section>

      <div className="lp-langs">
        <div className="lp-langs__inner">
          <span className="lp-langs__label">
            {t("landing.langs.label", { count: deckLanguages.length })}
          </span>
          <ul>
            {deckLanguages.map((language) => (
              <li key={language.name} className={`lp-tone-${language.tone}`}>
                {languageName(language.name)}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="lp-try" aria-labelledby="lp-try-title">
        <h2 id="lp-try-title">{t("landing.try.title")}</h2>
        <p>{t("landing.try.text")}</p>
        <DemoSession />
      </section>


      <FeatureRow id="lp-ai" title={t("landing.ai.title")} art={<AiIllustration />}>
        <p>{t("landing.ai.text")}</p>
        <Link to={openWebTo} className="lp-link" {...prefetchProps}>
          {t("landing.ai.try")}
        </Link>
      </FeatureRow>

      <FeatureRow
        id="lp-memory"
        title={t("landing.memory.title")}
        art={<TimelineChart />}
        isReversed
      >
        <p>
          {t("landing.memory.text", {
            first: t("landing.memory.days", { count: firstGaps[0] }),
            second: t("landing.memory.days", { count: firstGaps[1] }),
            third: t("landing.memory.days", { count: firstGaps[2] }),
            reviews: t("landing.memory.reviews", { count: reviews }),
            span: t(`landing.memory.${span.unit}`, { count: span.count }),
          })}
        </p>
      </FeatureRow>

      <FeatureRow
        id="lp-decks"
        title={t("landing.decks.title")}
        art={<DecksIllustration decks={exampleDecks} />}
      >
        <p>{t("landing.decks.text")}</p>
      </FeatureRow>

      <FeatureRow
        id="lp-hub"
        title={t("landing.hub.title")}
        art={<HubIllustration to={browseTo} deckName={hubExampleDeck} />}
        isReversed
      >
        <p>{t("landing.hub.text")}</p>
        <Link to={browseTo} className="lp-link" {...prefetchProps}>
          {t("landing.hub.browse")}
        </Link>
      </FeatureRow>

      <FeatureRow
        id="lp-anywhere"
        title={t("landing.anywhere.title")}
        art={<PlatformsIllustration platforms={platforms} />}
      >
        <p>{t("landing.anywhere.text")}</p>
      </FeatureRow>

      <FeatureRow
        id="lp-phone"
        title={t("landing.phone.title")}
        art={<PhoneIllustration />}
        isReversed
      >
        <p>{t("landing.phone.text")}</p>
        <ul className="lp-steps">
          {phoneSystems.map((system) => {
            const Icon = PHONE_SYSTEM_ICONS[system.key];

            return (
              <li key={system.key} className={`lp-tone-${system.tone}`}>
                <span className="lp-steps__icon" aria-hidden>
                  <Icon />
                </span>
                <strong>{t(`landing.phone.${system.key}.title`)}</strong>
                <span>{t(`landing.phone.${system.key}.text`)}</span>
              </li>
            );
          })}
        </ul>
        <Link to={openWebTo} className="lp-link" {...prefetchProps}>
          {t("landing.phone.open")}
        </Link>
      </FeatureRow>

      <LandingFaq />

      <section className="lp-cta" aria-labelledby="lp-cta-title">
        <span className="lp-sticker lp-tone-green lp-cta__sticker lp-cta__sticker--l" aria-hidden>
          {t("grades.easy.label")}
          <small>{formatInterval("3d")}</small>
        </span>
        <span className="lp-sticker lp-tone-amber lp-cta__sticker lp-cta__sticker--r" aria-hidden>
          {t("grades.good.label")}
          <small>{formatInterval("24h")}</small>
        </span>
        <h2 id="lp-cta-title">{t("landing.cta.title")}</h2>
        <Link to={openWebTo} className="lp-btn lp-btn--inverse" {...prefetchProps}>
          {t("landing.hero.start")}
        </Link>
      </section>

      <footer className="lp-footer">
        <span className="lp-brand lp-brand--small">
          <AppIcon size={24} />
          <span>lioralang</span>
        </span>
        <p className="lp-footer__credit">
          {withSlots(t, "landing.footer.madeBy", {
            name: (
              <a href={authorUrl} target="_blank" rel={EXTERNAL_LINK_REL}>
                {authorName}
              </a>
            ),
          })}
        </p>
        <ul>
          {footerLinks.map((link) => (
            <li key={link.key}>
              <a
                href={link.href}
                target={link.isExternal ? "_blank" : undefined}
                rel={link.isExternal ? EXTERNAL_LINK_REL : undefined}
              >
                {t(`landing.footer.${link.key}`)}
              </a>
            </li>
          ))}
        </ul>
        {/* The landing in every language, as plain links: one click for a
            visitor, and the way search engines find each version. */}
        <nav className="lp-footer__langs" aria-label={t("landing.topbar.language")}>
          {languageLinks.map((item) => (
            <Link
              key={item.code}
              to={item.to}
              lang={item.code}
              hrefLang={item.code}
              aria-current={item.code === locale ? "page" : undefined}
            >
              {item.nativeName}
            </Link>
          ))}
        </nav>
      </footer>
    </article>
  );
});

LandingMockPanel.displayName = "LandingMockPanel";
