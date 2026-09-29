import { memo } from "react";
import { useI18n } from "@shared/lib/i18n";

export const LearnEmptyDeckState = memo(({ onCreateDeck, onOpenBrowse }) => {
  const { t } = useI18n();

  return (
    <div className="learn-desk__note-card learn-desk__note-card--empty">
      <strong>{t("learn.empty.title")}</strong>
      <p>{t("learn.empty.text")}</p>
      <div className="learn-desk__note-actions">
        <button
          type="button"
          className="learn-desk__key learn-desk__key--primary"
          onClick={onCreateDeck}
        >
          {t("learn.empty.createDeck")}
        </button>
        <button type="button" className="learn-desk__key" onClick={onOpenBrowse}>
          {t("learn.empty.browse")}
        </button>
      </div>
    </div>
  );
});

LearnEmptyDeckState.displayName = "LearnEmptyDeckState";
