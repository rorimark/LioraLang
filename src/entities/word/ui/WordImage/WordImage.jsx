import { memo } from "react";
import { FiImage } from "react-icons/fi";
import { useMediaImageUrl } from "@shared/lib/media";
import { useI18n } from "@shared/lib/i18n";
import "./WordImage.css";

// A word's picture from local storage. It never waits on the network: a
// picture still on its way from another device shows a quiet placeholder
// that says so, and the word itself is always there in text beside it.
export const WordImage = memo(({ image, alt = "", variant = "full", className = "", isEager = false }) => {
  const { t } = useI18n();
  const { url, status } = useMediaImageUrl(image?.assetId || "", variant);
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
