import { memo } from "react";
import "./Flashcard.css";

export const Flashcard = memo(
  ({
    frontLabel = "Front",
    frontText,
    backLabel = "Back",
    backText,
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
        aria-label="Flashcard, click to flip"
      >
        <span className="flashcard__inner">
          <span className="flashcard__face flashcard__face--front">
            <span className="flashcard__label">{frontLabel}</span>
            <strong className="flashcard__text">{frontText || "-"}</strong>
            <span className="flashcard__hint">Tap to reveal answer</span>
          </span>

          <span className="flashcard__face flashcard__face--back">
            <span className="flashcard__label">{backLabel}</span>
            <strong className="flashcard__text">{backText || "-"}</strong>
            <span className="flashcard__hint">Tap to see front side</span>
          </span>
        </span>
      </button>
    );
  },
);

Flashcard.displayName = "Flashcard";
