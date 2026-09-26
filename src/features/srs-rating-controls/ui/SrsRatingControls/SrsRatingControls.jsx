import { memo } from "react";
import "./SrsRatingControls.css";

const EMPTY_KEY_LABELS = Object.freeze({});

export const SrsRatingControls = memo(
  ({
    ratingOptions = [],
    onRate,
    disabled = false,
    variant = "",
    keyLabels = EMPTY_KEY_LABELS,
  }) => {
    const className = variant
      ? `srs-rating-controls srs-rating-controls--${variant}`
      : "srs-rating-controls";

    return (
      <div className={className} role="group" aria-label="Rate card">
        {ratingOptions.map((option) => {
          const toneClassName = option?.tone
            ? `srs-rating-controls__button srs-rating-controls__button--${option.tone}`
            : "srs-rating-controls__button";
          const keyLabel = keyLabels[option.key];

          return (
            <button
              key={option.key}
              type="button"
              className={toneClassName}
              onClick={() => onRate(option.key)}
              disabled={disabled}
              aria-keyshortcuts={keyLabel || undefined}
            >
              <span className="srs-rating-controls__label">{option.label}</span>
              <span className="srs-rating-controls__value">{option.value}</span>
              {keyLabel ? (
                <kbd className="srs-rating-controls__key" aria-hidden="true">
                  {keyLabel}
                </kbd>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  },
);

SrsRatingControls.displayName = "SrsRatingControls";
