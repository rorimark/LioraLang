import { memo } from "react";
import "./Flashcard.css";

const EMPTY_CARD = Object.freeze({});
const EMPTY_BADGES = Object.freeze([]);
const EMPTY_DETAILS = Object.freeze([]);

export const Flashcard = memo(({ card = EMPTY_CARD }) => {
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
    } = card;
    return (
      <button
        type="button"
        className={isFlipped ? "flashcard flashcard--flipped" : "flashcard"}
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
              <strong className="flashcard__text">{frontText || "-"}</strong>
            </span>
            <span className="flashcard__hint">Tap to reveal answer</span>
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
              <strong className="flashcard__text">{backText || "-"}</strong>
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
            <span className="flashcard__hint">Tap to see front side</span>
          </span>
        </span>
      </button>
    );
  });

Flashcard.displayName = "Flashcard";
