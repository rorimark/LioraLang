import { memo } from "react";
import "./Flashcard.css";

const EMPTY_CARD = Object.freeze({});
const EMPTY_BADGES = Object.freeze([]);
const EMPTY_DETAILS = Object.freeze([]);

// A word is set as a headline; a sentence cannot be, so the longer the text
// the smaller and lighter it is set.
const resolveTextLengthClass = (text) => {
  const length = typeof text === "string" ? text.trim().length : 0;

  if (length > 120) {
    return " flashcard__text--xlong";
  }

  return length > 32 ? " flashcard__text--long" : "";
};

export const Flashcard = memo(({ card = EMPTY_CARD, variant = "" }) => {
    const {
      frontLabel = "Front",
      frontText,
      backLabel = "Back",
      backText,
      backMetaBadges = EMPTY_BADGES,
      backDetails = EMPTY_DETAILS,
      isFlipped = false,
      onFlip,
      disabled = false,
      frontNote = "",
    } = card;
    const className = [
      "flashcard",
      variant ? `flashcard--${variant}` : "",
      isFlipped ? "flashcard--flipped" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        type="button"
        className={className}
        onClick={onFlip}
        disabled={disabled}
        aria-label={
          isFlipped
            ? "Flashcard back side. Press to show front side."
            : "Flashcard front side. Press to reveal answer."
        }
        aria-pressed={isFlipped}
      >
        <span className="flashcard__inner">
          <span
            className="flashcard__face flashcard__face--front"
            aria-hidden={isFlipped}
          >
            <span className="flashcard__label">{frontLabel}</span>
            <span className="flashcard__content">
              <strong className={`flashcard__text${resolveTextLengthClass(frontText)}`}>
                {frontText || "-"}
              </strong>
            </span>
            <span className="flashcard__foot">
              <span className="flashcard__note">{frontNote}</span>
              <span className="flashcard__hint">Tap to reveal answer</span>
            </span>
          </span>

          <span
            className="flashcard__face flashcard__face--back"
            aria-hidden={!isFlipped}
          >
            <span className="flashcard__head">
              <span className="flashcard__label">{backLabel}</span>
              {backMetaBadges.length > 0 && (
                <span className="flashcard__meta-badges">
                  {backMetaBadges.map((badge) => (
                    <span
                      key={badge.key}
                      className={
                        badge.accent
                          ? "flashcard__label flashcard__meta-badge flashcard__meta-badge--accent"
                          : "flashcard__label flashcard__meta-badge"
                      }
                    >
                      {badge.text}
                    </span>
                  ))}
                </span>
              )}
            </span>
            <span className="flashcard__content">
              <strong className={`flashcard__text${resolveTextLengthClass(backText)}`}>
                {backText || "-"}
              </strong>
              {backDetails.length > 0 && (
                <span className="flashcard__details" aria-label="Examples">
                  {backDetails.map((detail, index) => (
                    <span key={`${detail}-${index}`} className="flashcard__detail-line">
                      {detail}
                    </span>
                  ))}
                </span>
              )}
            </span>
            <span className="flashcard__foot">
              <span className="flashcard__note" />
              <span className="flashcard__hint">Tap to see front side</span>
            </span>
          </span>
        </span>
      </button>
    );
  });

Flashcard.displayName = "Flashcard";
