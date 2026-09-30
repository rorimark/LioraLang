import { memo } from "react";
import { FiArrowRight } from "react-icons/fi";
import { useI18n } from "@shared/lib/i18n";
import "./DeckLanguagePair.css";

const clean = (value) => (typeof value === "string" ? value.trim() : "");

// The languages a deck goes between, read as a direction: "Polish →
// English", with any further language after a plus.
export const DeckLanguagePair = memo(({ source = "", targets = [], className = "" }) => {
  const { languageName } = useI18n();
  const from = clean(source);
  const to = (Array.isArray(targets) ? targets : [targets]).map(clean).filter((item) => item && item !== from);

  if (!from && to.length === 0) {
    return null;
  }

  const [first, ...rest] = to;

  return (
    <span className={["deck-language-pair", className].filter(Boolean).join(" ")}>
      {from ? languageName(from) : "—"}
      <FiArrowRight aria-hidden="true" />
      {first ? languageName(first) : "—"}
      {rest.length > 0 ? <span> + {rest.map((item) => languageName(item)).join(", ")}</span> : null}
    </span>
  );
});

DeckLanguagePair.displayName = "DeckLanguagePair";
