import { MathFormula, MathText } from "@shared/ui";
import { memo } from "react";
import { FiX } from "react-icons/fi";
import { getSubjectProfile } from "@shared/core/usecases/subjects";
import { useI18n } from "@shared/lib/i18n";
import { useConceptSuggestion } from "../model/useConceptSuggestion";
import { SparkIcon } from "./WordSuggest";
import "./WordSuggest.css";

export const ConceptSuggestion = memo(({ deck, draft, onApply }) => {
  const suggestion = useConceptSuggestion({ deck, draft, onApply });
  const { t, languageName } = useI18n();
  if (!suggestion.enabled || !suggestion.isAvailable) return null;
  const profile = getSubjectProfile(deck.subject, deck.subjectFields);
  const thinking = suggestion.status === "thinking";
  return (
    <section className="concept-suggestion" aria-label={t("conceptSuggest.title")} aria-busy={thinking}>
      <div className="concept-suggestion__toolbar">
        <button type="button" className="deck-suggestion__ask" onClick={suggestion.ask} disabled={!suggestion.canAsk || thinking}>
          <SparkIcon className={thinking ? "is-breathing" : ""} />
          {t(thinking ? "conceptSuggest.thinking" : suggestion.cards.length ? "conceptSuggest.again" : "conceptSuggest.ask")}
        </button>
        {!["idle", "signin", "offline", "languageRequired"].includes(suggestion.status) ? <button type="button" className="suggest-bar__dismiss" onClick={suggestion.dismiss} aria-label={t("suggest.dismiss")}><FiX aria-hidden /></button> : null}
      </div>
      {suggestion.language ? <p className="concept-suggestion__field">{t("subjects.fields.contentLanguage")}: {languageName(suggestion.language)}</p> : null}
      <p className="concept-suggestion__status" role="status">{t(`conceptSuggest.${suggestion.status === "idle" ? "hint" : suggestion.status}`)}</p>
      {suggestion.cards.length ? <>
        <p className="concept-suggestion__review">{t("conceptSuggest.review")}</p>
        <ol className="concept-suggestion__cards">
          {suggestion.cards.map((card, index) => <li key={index}>
            <strong><MathText>{card.source}</MathText></strong>
            <p className="concept-suggestion__answer"><MathText>{card.target}</MathText></p>
            {Object.entries(card.subjectFields).map(([key, value]) => {
              const spec = profile.entryFields[key];
              if (spec.type === "formula") return <MathFormula key={key} value={value} label={t(spec.labelKey)} />;
              if (spec.type === "multiline") return <p className="concept-suggestion__answer" key={key}><MathText>{value}</MathText></p>;
              if (spec.type === "code") return <pre key={key}><code>{value}</code></pre>;
              return <p className="concept-suggestion__field" key={key}><span>{t(spec.labelKey)}: </span>{spec.valueKey ? t(`${spec.valueKey}.${value}`) : value}</p>;
            })}
            {card.examples.length ? <ul>{card.examples.map((note, i) => <li key={i}><MathText>{note}</MathText></li>)}</ul> : null}
            {card.tags.length ? <p className="concept-suggestion__field">{card.tags.join(" · ")}</p> : null}
            <button type="button" className="suggest-bar__action" onClick={() => suggestion.take(index)}>{t("conceptSuggest.take")}</button>
          </li>)}
        </ol>
      </> : null}
    </section>
  );
});
ConceptSuggestion.displayName = "ConceptSuggestion";
