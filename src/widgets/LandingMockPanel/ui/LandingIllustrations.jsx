import { memo } from "react";
import { Link } from "react-router";
import {
  IoArrowForward,
  IoDesktopOutline,
  IoGlobeOutline,
  IoPhonePortraitOutline,
} from "react-icons/io5";
import { useI18n } from "@shared/lib/i18n";
import { buildLandingDemoDeck } from "../model/landingDemoDeck";

// Illustrations drawn from the product's own pieces: cards, the four grades,
// decks. The headings and copy beside them carry the meaning; the hub and
// platform pictures are also links to where they point.

const STICKERS = [
  { key: "again", value: "10m", tone: "red", className: "lp-sticker--a" },
  { key: "hard", value: "15m", tone: "amber", className: "lp-sticker--b" },
  { key: "good", value: "24h", tone: "blue", className: "lp-sticker--c" },
  { key: "easy", value: "3d", tone: "green", className: "lp-sticker--d" },
];

// The first demo word, turned over into the visitor's language.
export const HeroIllustration = memo(() => {
  const { t, locale, languageName, formatInterval } = useI18n();
  const deck = buildLandingDemoDeck(locale);
  const [word] = deck.words;

  return (
    <div className="lp-hero-art" aria-hidden="true">
      <span className="lp-hero-art__disc" />
      <span className="lp-card lp-card--back">
        <span className="lp-card__label">{languageName(deck.targetLanguage)}</span>
        <span className="lp-card__word">{word.target}</span>
      </span>
      <span className="lp-card lp-card--front">
        <span className="lp-card__label">{languageName(deck.sourceLanguage)}</span>
        <span className="lp-card__word">{word.source}</span>
      </span>
      {STICKERS.map((sticker) => (
        <span
          key={sticker.key}
          className={`lp-sticker lp-tone-${sticker.tone} ${sticker.className}`}
        >
          {t(`grades.${sticker.key}.label`)}
          <small>{formatInterval(sticker.value)}</small>
        </span>
      ))}
    </div>
  );
});

HeroIllustration.displayName = "HeroIllustration";

export const DecksIllustration = memo(({ decks }) => {
  const { t } = useI18n();

  return (
    <div className="lp-art lp-decks-art" aria-hidden="true">
      {decks.map((deck, index) => (
        <span
          key={deck.key}
          className={`lp-deck lp-tone-${deck.tone}`}
          style={{ "--i": index }}
        >
          <span className="lp-deck__top" />
          <strong>{t(`landing.decks.examples.${deck.key}`)}</strong>
          <span className="lp-deck__meta">
            <span>{deck.pair}</span>
            <span>{t("landing.decks.words", { count: deck.words })}</span>
          </span>
        </span>
      ))}
    </div>
  );
});

DecksIllustration.displayName = "DecksIllustration";

// The whole illustration opens the hub, so its Import button is not a dead
// control.
export const HubIllustration = memo(({ to, deckName }) => {
  const { t, languageName } = useI18n();

  return (
    <Link to={to} className="lp-art lp-hub-art lp-art-link" aria-label={t("landing.hub.browse")}>
      <span className="lp-hub-card" aria-hidden="true">
        <span className="lp-hub-card__row">
          <strong>{deckName}</strong>
          <span className="lp-hub-card__pill">{t("landing.decks.words", { count: 250 })}</span>
        </span>
        <span className="lp-hub-card__langs">
          {["English", "Polish", "Russian"].map(languageName).join(" · ")}
        </span>
        <span className="lp-hub-card__button">{t("landing.hub.import")}</span>
      </span>
      <span className="lp-hub-arrow" aria-hidden="true" />
      <span className="lp-hub-done lp-tone-green" aria-hidden="true">
        {t("landing.hub.inLibrary")}
      </span>
    </Link>
  );
});

HubIllustration.displayName = "HubIllustration";

const PLATFORM_ICONS = {
  web: IoGlobeOutline,
  desktop: IoDesktopOutline,
  phone: IoPhonePortraitOutline,
};

export const PlatformsIllustration = memo(({ platforms }) => {
  const { t } = useI18n();

  return (
  <div className="lp-art lp-platforms-art">
    {platforms.map((platform, index) => {
      const Icon = PLATFORM_ICONS[platform.key];
      const className = `lp-platform lp-tone-${["blue", "green", "amber"][index % 3]}`;
      const content = (
        <>
          <span className="lp-platform__icon" aria-hidden>
            {Icon ? <Icon /> : null}
          </span>
          <span className="lp-platform__text">
            <strong>{t(`landing.anywhere.${platform.key}.title`)}</strong>
            <span>{t(`landing.anywhere.${platform.key}.text`)}</span>
          </span>
          <IoArrowForward className="lp-platform__go" aria-hidden />
        </>
      );

      return platform.href ? (
        <a
          key={platform.key}
          className={className}
          href={platform.href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      ) : (
        <Link key={platform.key} className={className} to={platform.to}>
          {content}
        </Link>
      );
    })}
  </div>
  );
});

PlatformsIllustration.displayName = "PlatformsIllustration";
