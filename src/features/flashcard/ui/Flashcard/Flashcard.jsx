import { memo } from "react";
import "./Flashcard.css";

export const Flashcard = memo(
  ({
    frontLabel = "Front",
    frontText,
    backLabel = "Back",
    backText,
    backMetaBadges = [],
    isFlipped = false,
    onFlip,
    disabled = false,
  }) => {
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
            <strong className="flashcard__text">{frontText || "-"}</strong>
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
            <strong className="flashcard__text">{backText || "-"}</strong>
            <span className="flashcard__hint">Tap to see front side</span>
          </span>
        </span>
      </button>
    );
  },
);

Flashcard.displayName = "Flashcard";
