import { memo } from "react";
import { WordImage } from "@entities/word";
import { useI18n } from "@shared/lib/i18n";
import { FlashcardBlockFace } from "./FlashcardBlocks";
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
    const { t } = useI18n();
    const {
      frontLabel = t("flashcard.front"),
      frontText,
      frontImage = null,
      backLabel = t("flashcard.back"),
      backText,
      backImage = null,
      backMetaBadges = EMPTY_BADGES,
      backDetails = EMPTY_DETAILS,
      isFlipped = false,
      onFlip,
      disabled = false,
      frontNote = "",
      presentation = null,
    } = card;
    const className = [
      "flashcard",
      variant ? `flashcard--${variant}` : "",
      presentation ? `flashcard--layout-${presentation.layout}` : "",
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
            ? t("flashcard.backAria")
            : t("flashcard.frontAria")
        }
        aria-pressed={isFlipped}
      >
        {presentation ? (
          <span className="flashcard__inner">
            <FlashcardBlockFace
              side="front"
              label={presentation.labels?.front ? t(presentation.labels.front) : frontLabel}
              blocks={presentation.front}
              hint={t("flashcard.reveal")}
              isHidden={isFlipped}
            />
            <FlashcardBlockFace
              side="back"
              label={presentation.labels?.back ? t(presentation.labels.back) : backLabel}
              blocks={presentation.back}
              hint={t("flashcard.showFront")}
              isHidden={!isFlipped}
            />
          </span>
        ) : (
        <span className="flashcard__inner">
          <span
            className="flashcard__face flashcard__face--front"
            aria-hidden={isFlipped}
          >
            <span className="flashcard__label">{frontLabel}</span>
            <span className={`flashcard__content${frontImage ? " flashcard__content--picture" : ""}`}>
              {frontImage ? (
                <span className="flashcard__picture">
                  <WordImage image={frontImage} alt={frontImage.alt} isEager />
                </span>
              ) : (
                <strong className={`flashcard__text${resolveTextLengthClass(frontText)}`}>
                  {frontText || "-"}
                </strong>
              )}
            </span>
            <span className="flashcard__foot">
              <span className="flashcard__note">{frontNote}</span>
              <span className="flashcard__hint">{t("flashcard.reveal")}</span>
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
            <span className={`flashcard__content${backImage ? " flashcard__content--picture" : ""}`}>
              {backImage ? (
                <span className="flashcard__picture">
                  <WordImage image={backImage} alt={backImage.alt} isEager={isFlipped} />
                </span>
              ) : (
                <strong className={`flashcard__text${resolveTextLengthClass(backText)}`}>
                  {backText || "-"}
                </strong>
              )}
              {backDetails.length > 0 && (
                <span className="flashcard__details" aria-label={t("flashcard.examples")}>
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
              <span className="flashcard__hint">{t("flashcard.showFront")}</span>
            </span>
          </span>
        </span>
        )}
      </button>
    );
  });

Flashcard.displayName = "Flashcard";
