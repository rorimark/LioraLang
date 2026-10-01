import { memo } from "react";
import { FiX } from "react-icons/fi";
import { useI18n } from "@shared/lib/i18n";
import { useMissedWordHint } from "../model/useMissedWordHint";
import { SparkIcon } from "./WordSuggest";
import "./WordSuggest.css";

// Under the card after "Again": the word just missed and one line on how
// to remember it. It goes with the next grade.
export const MissedWordHint = memo(({ word, deck, onDismiss }) => {
  const { t } = useI18n();
  const { request, hint, isLoading } = useMissedWordHint({ word, deck });

  if (!request || (!isLoading && !hint)) {
    return null;
  }

  return (
    <aside className={`missed-hint${isLoading ? " is-loading" : ""}`} aria-live="polite">
      <SparkIcon className={isLoading ? "is-breathing" : ""} />
      <p className="missed-hint__text">
        <span className="missed-hint__word">
          {request.word} — {request.translation}
        </span>
        {isLoading ? (
          <span className="missed-hint__body">{t("learnHint.thinking")}</span>
        ) : (
          <span className="missed-hint__body">
            <span className="missed-hint__label">{t("learnHint.label")}: </span>
            {hint}
          </span>
        )}
      </p>
      <button type="button" className="missed-hint__dismiss" onClick={onDismiss} aria-label={t("learnHint.dismiss")}>
        <FiX aria-hidden="true" />
      </button>
    </aside>
  );
});

MissedWordHint.displayName = "MissedWordHint";
