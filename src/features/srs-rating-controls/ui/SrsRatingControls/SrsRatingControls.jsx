import { memo } from "react";
import "./SrsRatingControls.css";
import { useI18n } from "@shared/lib/i18n";

const EMPTY_KEY_LABELS = Object.freeze({});

// How wide a label reads, in Latin letters: a CJK character is about as
// wide as two. The CSS sizes the label to fit its key from this.
const measureLabel = (label) =>
  Math.max(5, [...String(label || "")].reduce((width, char) => width + (char.codePointAt(0) > 0x2e80 ? 1.7 : 1), 0));

export const SrsRatingControls = memo(
  ({
    ratingOptions = [],
    onRate,
    disabled = false,
    variant = "",
    keyLabels = EMPTY_KEY_LABELS,
  }) => {
    const { t } = useI18n();
    const className = variant
      ? `srs-rating-controls srs-rating-controls--${variant}`
      : "srs-rating-controls";

    return (
      <div className={className} role="group" aria-label={t("learn.rateCard")}>
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
              aria-label={t("learn.rateOption", {
                label: option.label,
                description: option.description || option.label,
                interval: option.value,
              })}
              aria-keyshortcuts={keyLabel || undefined}
            >
              <span className="srs-rating-controls__label" style={{ "--label-chars": measureLabel(option.label) }}>
                {option.label}
              </span>
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
