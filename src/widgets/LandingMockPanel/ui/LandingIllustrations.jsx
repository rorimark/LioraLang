import { memo } from "react";
import { Link } from "react-router";
import {
  IoArrowForward,
  IoDesktopOutline,
  IoGlobeOutline,
  IoPhonePortraitOutline,
} from "react-icons/io5";

// Illustrations drawn from the product's own pieces: cards, the four grades,
// decks. The headings and copy beside them carry the meaning; the hub and
// platform pictures are also links to where they point.

const STICKERS = [
  { label: "Again", value: "10m", tone: "red", className: "lp-sticker--a" },
  { label: "Hard", value: "15m", tone: "amber", className: "lp-sticker--b" },
  { label: "Good", value: "24h", tone: "blue", className: "lp-sticker--c" },
  { label: "Easy", value: "3d", tone: "green", className: "lp-sticker--d" },
];

export const HeroIllustration = memo(() => (
  <div className="lp-hero-art" aria-hidden="true">
    <span className="lp-hero-art__disc" />
    <span className="lp-card lp-card--back">
      <span className="lp-card__label">Polish</span>
      <span className="lp-card__word">podróż</span>
    </span>
    <span className="lp-card lp-card--front">
      <span className="lp-card__label">English</span>
      <span className="lp-card__word">journey</span>
    </span>
    {STICKERS.map((sticker) => (
      <span
        key={sticker.label}
        className={`lp-sticker lp-tone-${sticker.tone} ${sticker.className}`}
      >
        {sticker.label}
        <small>{sticker.value}</small>
      </span>
    ))}
  </div>
));

HeroIllustration.displayName = "HeroIllustration";

export const DecksIllustration = memo(({ decks }) => (
  <div className="lp-art lp-decks-art" aria-hidden="true">
    {decks.map((deck, index) => (
      <span
        key={deck.name}
        className={`lp-deck lp-tone-${deck.tone}`}
        style={{ "--i": index }}
      >
        <span className="lp-deck__top" />
        <strong>{deck.name}</strong>
        <span className="lp-deck__meta">
          <span>{deck.pair}</span>
          <span>{deck.words} words</span>
        </span>
      </span>
    ))}
  </div>
));

DecksIllustration.displayName = "DecksIllustration";

// The whole illustration opens the hub, so its Import button is not a dead
// control.
export const HubIllustration = memo(({ to }) => (
  <Link to={to} className="lp-art lp-hub-art lp-art-link" aria-label="Browse the hub">
    <span className="lp-hub-card" aria-hidden="true">
      <span className="lp-hub-card__row">
        <strong>Game of Thrones B1–C2</strong>
        <span className="lp-hub-card__pill">250 words</span>
      </span>
      <span className="lp-hub-card__langs">English · Polish · Russian</span>
      <span className="lp-hub-card__button">Import</span>
    </span>
    <span className="lp-hub-arrow" aria-hidden="true" />
    <span className="lp-hub-done lp-tone-green" aria-hidden="true">
      In your library
    </span>
  </Link>
));

HubIllustration.displayName = "HubIllustration";

const PLATFORM_ICONS = {
  web: IoGlobeOutline,
  desktop: IoDesktopOutline,
  phone: IoPhonePortraitOutline,
};

export const PlatformsIllustration = memo(({ platforms }) => (
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
            <strong>{platform.title}</strong>
            <span>{platform.text}</span>
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
));

PlatformsIllustration.displayName = "PlatformsIllustration";
