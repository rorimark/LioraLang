import { memo } from "react";
import { FiX } from "react-icons/fi";
import { useI18n } from "@shared/lib/i18n";
import { DECK_DESCRIPTION_STATUS, useDeckDescription } from "../model/useDeckDescription";
import { SparkIcon } from "./WordSuggest";
import "./WordSuggest.css";

// Under a deck's description: one quiet action that drafts the description
// and tags from the deck's name and words, then the draft to take or leave.
export const DeckDescriptionSuggestion = memo(({ deck, words, onApply }) => {
  const { t } = useI18n();
  const suggestion = useDeckDescription({ deck, words, onApply });

  if (!suggestion.isAvailable || suggestion.needsSignIn) {
    return null;
  }

  if (suggestion.status === DECK_DESCRIPTION_STATUS.loading) {
    return (
      <p className="suggest-bar suggest-bar--thinking" role="status">
        <SparkIcon className="is-breathing" />
        <span>{t("deckSuggest.thinking")}</span>
      </p>
    );
  }

  if (suggestion.status === DECK_DESCRIPTION_STATUS.ready && suggestion.draft) {
    const { description, tags } = suggestion.draft;

    return (
      <div className="deck-suggestion" role="status">
        <SparkIcon />
        <div className="deck-suggestion__body">
          {description ? <p className="deck-suggestion__description">{description}</p> : null}
          {tags.length ? (
            <ul className="deck-suggestion__tags" aria-label={t("editor.tags")}>
              {tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
          <div className="deck-suggestion__actions">
            <button type="button" className="suggest-bar__action" onClick={suggestion.take}>
              {t("deckSuggest.take")}
            </button>
            <button type="button" className="deck-suggestion__again" onClick={suggestion.ask}>
              {t("deckSuggest.again")}
            </button>
          </div>
        </div>
        <button type="button" className="suggest-bar__dismiss" onClick={suggestion.dismiss} aria-label={t("suggest.dismiss")}>
          <FiX aria-hidden />
        </button>
      </div>
    );
  }

  const noteKey = {
    [DECK_DESCRIPTION_STATUS.empty]: "deckSuggest.empty",
    [DECK_DESCRIPTION_STATUS.quota]: "suggest.quota",
    [DECK_DESCRIPTION_STATUS.busy]: "aiList.busy",
    [DECK_DESCRIPTION_STATUS.error]: "deckSuggest.error",
  }[suggestion.status];

  if (!suggestion.canAsk && !noteKey) {
    return null;
  }

  return (
    <p className="deck-suggestion__line">
      <button type="button" className="deck-suggestion__ask" onClick={suggestion.ask} disabled={!suggestion.canAsk}>
        <SparkIcon />
        <span>{t("deckSuggest.ask")}</span>
      </button>
      {noteKey ? <span className="deck-suggestion__note">{t(noteKey)}</span> : null}
    </p>
  );
});

DeckDescriptionSuggestion.displayName = "DeckDescriptionSuggestion";
