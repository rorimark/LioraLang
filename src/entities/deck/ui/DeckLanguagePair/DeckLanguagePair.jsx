import { memo } from "react";
import { FiArrowRight } from "react-icons/fi";
import { useI18n } from "@shared/lib/i18n";
import { getSubjectProfile, normalizeDeckSubjectFields } from "@shared/core/usecases/subjects";
import "./DeckLanguagePair.css";

const clean = (value) => (typeof value === "string" ? value.trim() : "");

// The sides a deck goes between, read as a direction: "Polish → English",
// with any further language after a plus. A picture side reads "Picture":
// it is a side of its own, not a language. A deck about something other
// than a language reads as its subject and its context: "Programming ·
// JavaScript".
export const DeckLanguagePair = memo(({
  source = "",
  targets = [],
  pictureSide = "",
  subject = "",
  subjectFields = null,
  className = "",
}) => {
  const { t, languageName } = useI18n();
  const profile = getSubjectProfile(subject);

  if (!profile.usesLanguages) {
    const context = Object.entries(normalizeDeckSubjectFields(subject, subjectFields)).map(([key, value]) => {
      const spec = profile.deckFields[key];
      return spec.languageValues ? languageName(value) : spec.valueKey ? t(`${spec.valueKey}.${value}`) : value;
    });

    return (
      <span className={["deck-language-pair", "deck-language-pair--subject", className].filter(Boolean).join(" ")}>
        {[t(profile.nameKey), ...context].join(" · ")}
      </span>
    );
  }

  const from = pictureSide === "source" ? "" : clean(source);
  const to = (Array.isArray(targets) ? targets : [targets]).map(clean).filter((item) => item && item !== from);

  if (!from && to.length === 0 && !pictureSide) {
    return null;
  }

  const picture = t("media.label");
  const fromLabel = pictureSide === "source" ? picture : from ? languageName(from) : "—";
  // With pictures as the answer, every language listed is an extra one.
  const [first, ...rest] = pictureSide === "target" ? ["", ...to] : to;
  const firstLabel = pictureSide === "target" ? picture : first ? languageName(first) : "—";

  return (
    <span className={["deck-language-pair", className].filter(Boolean).join(" ")}>
      {fromLabel}
      <FiArrowRight aria-hidden="true" />
      {firstLabel}
      {rest.length > 0 ? <span> + {rest.map((item) => languageName(item)).join(", ")}</span> : null}
    </span>
  );
});

DeckLanguagePair.displayName = "DeckLanguagePair";
