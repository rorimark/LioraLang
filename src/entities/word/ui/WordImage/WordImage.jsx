import { memo } from "react";
import { FiImage } from "react-icons/fi";
import { useMediaImageUrl } from "@shared/lib/media";
import { useI18n } from "@shared/lib/i18n";
import "./WordImage.css";

// A word's picture from local storage. It never waits on the network: a
// picture still on its way from another device shows a quiet placeholder
// that says so, and the word itself is always there in text beside it.
// `src` shows a picture that is not stored here (a preview) instead.
export const WordImage = memo(({ image, alt = "", variant = "full", className = "", isEager = false, src = "" }) => {
  const { t } = useI18n();
  const stored = useMediaImageUrl(src ? "" : image?.assetId || "", variant);
  const url = src || stored.url;
  const status = src ? "ready" : stored.status;
  const classes = ["word-image", `word-image--${variant}`, className].filter(Boolean).join(" ");

  if (!image?.assetId) {
    return null;
  }

  if (status === "ready" && url) {
    return (
      <img
        className={classes}
        src={url}
        alt={alt}
        loading={isEager ? "eager" : "lazy"}
        decoding="async"
        draggable={false}
      />
    );
  }

  const isMissing = status === "missing";

  return (
    <span
      className={`${classes} word-image--placeholder`}
      role="img"
      aria-label={isMissing ? t("media.notOnDevice") : alt || t("media.loading")}
      aria-busy={!isMissing || undefined}
    >
      <FiImage aria-hidden="true" />
      {isMissing && variant === "full" ? <span className="word-image__note">{t("media.notOnDevice")}</span> : null}
    </span>
  );
});

WordImage.displayName = "WordImage";
