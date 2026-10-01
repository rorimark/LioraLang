import { memo } from "react";
import { FiX } from "react-icons/fi";
import { useI18n } from "@shared/lib/i18n";
import "./WordSuggest.css";

// The assistant's mark: a four-pointed spark, drawn rather than borrowed
// from an icon set so it can breathe while an answer is on its way.
export const SparkIcon = memo(({ className = "" }) => (
  <svg className={["suggest-spark", className].filter(Boolean).join(" ")} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M8 0.8c.5 3.6 2.6 5.8 6.4 6.4v1.6c-3.8.6-5.9 2.8-6.4 6.4h-1.6C5.8 11.6 3.6 9.4 0 8.8V7.2c3.6-.6 5.8-2.8 6.4-6.4z" />
  </svg>
));

SparkIcon.displayName = "SparkIcon";

// A field that can hold a suggestion. While the field is empty the
// suggestion sits in it in pencil; typing writes over it, the spark at the
// end takes it. While the answer is on its way the field shimmers.
export const SuggestField = memo(({ field, suggest, multiline = false, children }) => {
  const { t } = useI18n();
  const ghost = suggest?.fills?.[field] || "";
  const isPending = Boolean(suggest?.pendingFields?.has(field));
  const isInked = Boolean(suggest?.inked?.has(field));
  const className = [
    "suggest-field",
    multiline ? "suggest-field--multiline" : "",
    ghost ? "has-ghost" : "",
    isPending ? "is-pending" : "",
    isInked ? "is-inked" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={className}>
      {children}
      {ghost ? (
        <>
          <span className="suggest-field__ghost" aria-hidden="true">
            {ghost}
          </span>
          <button
            type="button"
            className="suggest-field__take"
            onClick={() => suggest.acceptField(field)}
            aria-label={t("suggest.useField", { value: ghost.replace(/\n/g, " · ") })}
            title={t("suggest.useField", { value: ghost.replace(/\n/g, " · ") })}
          >
            <SparkIcon />
          </button>
        </>
      ) : null}
    </span>
  );
});

SuggestField.displayName = "SuggestField";

// A choice from a list (a level, a part of speech) offered next to its
// label, to take with one tap.
export const SuggestChip = memo(({ field, suggest, label }) => {
  const { t } = useI18n();
  const value = suggest?.fills?.[field];

  if (!value) {
    return null;
  }

  const text = label ? label(value) : value;

  return (
    <button
      type="button"
      className="suggest-chip"
      onClick={() => suggest.acceptField(field)}
      aria-label={t("suggest.useField", { value: text })}
    >
      <SparkIcon />
      <span>{text}</span>
    </button>
  );
});

SuggestChip.displayName = "SuggestChip";

// One quiet line under the fields: what the assistant has, and how to take
// it. With nothing to say it shows what it was given instead.
export const SuggestionBar = memo(({ suggest, summary = [], children = null }) => {
  const { t } = useI18n();

  if (!suggest?.isActive && !suggest?.needsSignIn) {
    return children;
  }

  if (suggest.correction) {
    return (
      <p className="suggest-bar suggest-bar--correction" role="status">
        <SparkIcon />
        <span>{t("suggest.didYouMean", { word: suggest.correction })}</span>
        <button type="button" className="suggest-bar__action" onClick={suggest.acceptCorrection}>
          {t("suggest.useCorrection")}
        </button>
        <button type="button" className="suggest-bar__dismiss" onClick={suggest.dismiss} aria-label={t("suggest.dismiss")}>
          <FiX aria-hidden />
        </button>
      </p>
    );
  }

  if (suggest.hasFills) {
    return (
      <p className="suggest-bar" role="status">
        <SparkIcon />
        <span className="suggest-bar__summary">{summary.length ? summary.join(" · ") : t("suggest.ready")}</span>
        <button type="button" className="suggest-bar__action" onClick={suggest.acceptAll}>
          <span>{t("suggest.fill")}</span>
          <kbd className="suggest-bar__key">{t("suggest.tabKey")}</kbd>
        </button>
        <button type="button" className="suggest-bar__dismiss" onClick={suggest.dismiss} aria-label={t("suggest.dismiss")}>
          <FiX aria-hidden />
        </button>
      </p>
    );
  }

  if (suggest.isLoading) {
    return (
      <p className="suggest-bar suggest-bar--thinking" role="status">
        <SparkIcon className="is-breathing" />
        <span>{t("suggest.thinking")}</span>
      </p>
    );
  }

  if (suggest.status === "quota") {
    return <p className="suggest-bar suggest-bar--quiet">{t("suggest.quota")}</p>;
  }

  if (suggest.needsSignIn) {
    return (
      <p className="suggest-bar suggest-bar--quiet">
        <SparkIcon />
        <span>{t("suggest.signIn")}</span>
      </p>
    );
  }

  return children;
});

SuggestionBar.displayName = "SuggestionBar";
