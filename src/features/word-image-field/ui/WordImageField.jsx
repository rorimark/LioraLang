import { memo, useCallback, useId, useRef } from "react";
import { FiImage, FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { WordImage } from "@entities/word";
import { IMAGE_ACCEPT_ATTRIBUTE } from "@shared/lib/media";
import { useI18n } from "@shared/lib/i18n";
import { useWordImageField } from "../model/useWordImageField";
import "./WordImageField.css";

// A word's picture in a form: optional, added from a file, a drop or a
// paste, then shown with Replace and Remove and a description for people
// using a screen reader. `word` names the picture's fallback description.
export const WordImageField = memo(({ value, onChange, word = "", isCompact = false, isDisabled = false }) => {
  const { t } = useI18n();
  const field = useWordImageField({ value, onChange });
  const fileInputRef = useRef(null);
  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  const labelId = useId();
  const altId = useId();
  const hintId = useId();
  const statusId = useId();
  const className = [
    "word-image-field",
    isCompact ? "word-image-field--compact" : "",
    field.isDragOver ? "is-drag-over" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={className}
      role="group"
      aria-labelledby={labelId}
      onDragOver={field.handleDragOver}
      onDragLeave={field.handleDragLeave}
      onDrop={field.handleDrop}
      onPaste={field.handlePaste}
    >
      <span className="word-image-field__label" id={labelId}>
        {t("media.label")}
        <span className="word-image-field__optional">{t("quickAdd.optional")}</span>
      </span>

      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_ACCEPT_ATTRIBUTE}
        className="word-image-field__file"
        onChange={field.handleFileInputChange}
        tabIndex={-1}
        aria-hidden="true"
      />

      {field.image ? (
        <div className="word-image-field__filled">
          <div className="word-image-field__preview">
            <WordImage image={field.image} alt={field.image.alt || word} variant="thumb" isEager />
          </div>
          <div className="word-image-field__side">
            <div className="word-image-field__actions">
              <button type="button" onClick={openFilePicker} disabled={isDisabled || field.isProcessing}>
                <FiRefreshCw aria-hidden="true" />
                <span>{t("media.replace")}</span>
              </button>
              <button
                type="button"
                className="word-image-field__remove"
                onClick={field.removeImage}
                disabled={isDisabled}
              >
                <FiTrash2 aria-hidden="true" />
                <span>{t("media.remove")}</span>
              </button>
            </div>
            <label className="word-image-field__alt" htmlFor={altId}>
              <span>{t("media.altLabel")}</span>
              <input
                id={altId}
                value={field.image.alt}
                onChange={field.handleAltChange}
                placeholder={t("media.altPlaceholder")}
                maxLength={200}
                autoComplete="off"
                aria-describedby={hintId}
                disabled={isDisabled}
              />
            </label>
            <p className="word-image-field__hint" id={hintId}>
              {t("media.altHint")}
            </p>
          </div>
        </div>
      ) : (
        <div className="word-image-field__empty">
          <button
            type="button"
            className="word-image-field__add"
            onClick={openFilePicker}
            disabled={isDisabled || field.isProcessing}
            aria-describedby={statusId}
          >
            <FiImage aria-hidden="true" />
            <span>{t("media.add")}</span>
          </button>
          <span className="word-image-field__drop-hint">{t("media.dropHint")}</span>
        </div>
      )}

      <p className="word-image-field__status" id={statusId} aria-live="polite">
        {field.isProcessing ? t("media.processing") : ""}
        {field.errorMessage ? <span className="word-image-field__error">{field.errorMessage}</span> : null}
      </p>
    </div>
  );
});

WordImageField.displayName = "WordImageField";
