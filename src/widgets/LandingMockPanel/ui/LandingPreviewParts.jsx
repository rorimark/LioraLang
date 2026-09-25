import { memo } from "react";
import {
  IoBookOutline,
  IoGlobeOutline,
  IoLayersOutline,
  IoSettingsOutline,
  IoStatsChartOutline,
} from "react-icons/io5";

// The same icons the app's navigation uses, so the previews read as the app.
const NAV_ICONS = {
  learn: IoLayersOutline,
  decks: IoBookOutline,
  browse: IoGlobeOutline,
  progress: IoStatsChartOutline,
  settings: IoSettingsOutline,
};

export const PreviewNavItem = memo(({ item, isActive = false, isCompact = false }) => {
  const Icon = NAV_ICONS[item.icon];
  const className = [
    "landing-preview-nav__item",
    isActive ? "is-active" : "",
    isCompact ? "landing-preview-nav__item--compact" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className}>
      {Icon ? <Icon aria-hidden /> : null}
      <span>{item.title}</span>
    </span>
  );
});

PreviewNavItem.displayName = "PreviewNavItem";

export const PreviewFlashcard = memo(({ card }) => (
  <div className="landing-preview-card">
    <div className="landing-preview-card__head">
      <span className="landing-preview-card__label">{card.language}</span>
      <span className="landing-preview-card__label landing-preview-card__label--meta">
        {card.level}
      </span>
    </div>
    <div className="landing-preview-card__body">
      <strong className="landing-preview-card__word">{card.front}</strong>
      <span className="landing-preview-card__answer">{card.back}</span>
      <span className="landing-preview-card__example">{card.example}</span>
    </div>
  </div>
));

PreviewFlashcard.displayName = "PreviewFlashcard";

export const PreviewRatings = memo(({ ratings }) => (
  <div className="landing-preview-ratings">
    {ratings.map((rating) => (
      <span
        key={rating.label}
        className={`landing-preview-ratings__button landing-preview-ratings__button--${rating.tone}`}
      >
        <strong>{rating.label}</strong>
        <span>{rating.interval}</span>
      </span>
    ))}
  </div>
));

PreviewRatings.displayName = "PreviewRatings";
