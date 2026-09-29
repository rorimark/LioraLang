import { memo } from "react";
import "./SrsRatingControls.css";
import { useI18n } from "@shared/lib/i18n";

const EMPTY_KEY_LABELS = Object.freeze({});

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
