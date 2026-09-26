import { memo } from "react";
import { IoDesktopOutline, IoGlobeOutline, IoPhonePortraitOutline } from "react-icons/io5";

// Illustrations drawn from the product's own pieces: cards, the four grades,
// decks. Decorative only; the headings and copy beside them carry the meaning.

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

export const HubIllustration = memo(() => (
  <div className="lp-art lp-hub-art" aria-hidden="true">
    <span className="lp-hub-card">
      <span className="lp-hub-card__row">
        <strong>Game of Thrones B1–C2</strong>
        <span className="lp-hub-card__pill">250 words</span>
      </span>
      <span className="lp-hub-card__langs">English · Polish · Russian</span>
      <span className="lp-hub-card__button">Import</span>
    </span>
    <span className="lp-hub-arrow" />
    <span className="lp-hub-done lp-tone-green">In your library</span>
  </div>
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
      return (
        <div
          key={platform.key}
          className={`lp-platform lp-tone-${["blue", "green", "amber"][index % 3]}`}
        >
          <span className="lp-platform__icon" aria-hidden>
            {Icon ? <Icon /> : null}
          </span>
          <span>
            <strong>{platform.title}</strong>
            <span>{platform.text}</span>
          </span>
        </div>
      );
    })}
  </div>
));

PlatformsIllustration.displayName = "PlatformsIllustration";
