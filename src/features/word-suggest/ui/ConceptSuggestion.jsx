import { memo } from "react";
import { FiX } from "react-icons/fi";
import { getSubjectProfile } from "@shared/core/usecases/subjects";
import { useI18n } from "@shared/lib/i18n";
import { useConceptSuggestion } from "../model/useConceptSuggestion";
import { SparkIcon } from "./WordSuggest";
import "./WordSuggest.css";

export const ConceptSuggestion = memo(({ deck, draft, onApply }) => {
  const suggestion = useConceptSuggestion({ deck, draft, onApply });
  const { t } = useI18n();
  if (!suggestion.enabled || !suggestion.isAvailable) return null;
  const profile = getSubjectProfile(deck.subject);
  const thinking = suggestion.status === "thinking";
  return (
    <section className="concept-suggestion" aria-label={t("conceptSuggest.title")} aria-busy={thinking}>
      <div className="concept-suggestion__toolbar">
        <button type="button" className="deck-suggestion__ask" onClick={suggestion.ask} disabled={!suggestion.canAsk || thinking}>
          <SparkIcon className={thinking ? "is-breathing" : ""} />
          {t(thinking ? "conceptSuggest.thinking" : suggestion.cards.length ? "conceptSuggest.again" : "conceptSuggest.ask")}
        </button>
        {suggestion.status !== "idle" ? <button type="button" className="suggest-bar__dismiss" onClick={suggestion.dismiss} aria-label={t("suggest.dismiss")}><FiX aria-hidden /></button> : null}
      </div>
      <p className="concept-suggestion__status" role="status">{t(`conceptSuggest.${suggestion.status === "idle" ? "hint" : suggestion.status}`)}</p>
      {suggestion.cards.length ? <>
        <p className="concept-suggestion__review">{t("conceptSuggest.review")}</p>
        <ol className="concept-suggestion__cards">
          {suggestion.cards.map((card, index) => <li key={index}>
            <strong>{card.source}</strong>
            <p className="concept-suggestion__answer">{card.target}</p>
            {Object.entries(card.subjectFields).map(([key, value]) => {
              const spec = profile.entryFields[key];
              if (spec.type === "code") return <pre key={key}><code>{value}</code></pre>;
              return <p className="concept-suggestion__field" key={key}><span>{t(spec.labelKey)}: </span>{spec.valueKey ? t(`${spec.valueKey}.${value}`) : value}</p>;
            })}
            {card.examples.length ? <ul>{card.examples.map((note, i) => <li key={i}>{note}</li>)}</ul> : null}
            {card.tags.length ? <p className="concept-suggestion__field">{card.tags.join(" · ")}</p> : null}
            <button type="button" className="suggest-bar__action" onClick={() => suggestion.take(index)}>{t("conceptSuggest.take")}</button>
          </li>)}
        </ol>
      </> : null}
    </section>
  );
});
ConceptSuggestion.displayName = "ConceptSuggestion";
