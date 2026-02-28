import { memo } from "react";
import "./SrsRatingControls.css";

export const SrsRatingControls = memo(
  ({
    ratingOptions = [],
    onRate,
    disabled = false,
  }) => {
    return (
      <div className="srs-rating-controls" role="group" aria-label="Rate card">
        {ratingOptions.map((option) => {
          const toneClassName = option?.tone
            ? `srs-rating-controls__button srs-rating-controls__button--${option.tone}`
            : "srs-rating-controls__button";

          return (
            <button
              key={option.key}
              type="button"
              className={toneClassName}
              onClick={() => onRate(option.key)}
              disabled={disabled}
            >
              <span className="srs-rating-controls__label">{option.label}</span>
              <span className="srs-rating-controls__value">{option.value}</span>
            </button>
          );
        })}
      </div>
    );
  },
);

SrsRatingControls.displayName = "SrsRatingControls";
