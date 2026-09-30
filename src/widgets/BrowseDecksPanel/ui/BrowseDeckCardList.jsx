import { memo, useCallback } from "react";
import { Link } from "react-router";
import { FiLink } from "react-icons/fi";
import { DeckLanguagePair, HubDeckAction, normalizeHubTags } from "@entities/deck";
import { Button } from "@shared/ui";
import { buildBrowseDeckRoute } from "@shared/config/routes";
import { useI18n } from "@shared/lib/i18n";

// One line of tags; the deck's page lists them all.
const MAX_VISIBLE_TAGS = 3;
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

export const BrowseDeckCardList = memo(({ deckList = EMPTY_OBJECT }) => {
  const { t, formatDate, formatNumber } = useI18n();
  const decks = Array.isArray(deckList.decks) ? deckList.decks : EMPTY_ARRAY;
  const pendingState = deckList.pendingState || EMPTY_OBJECT;
  const actions = deckList.actions || EMPTY_OBJECT;
  const library = deckList.library || new Map();

  const findDeck = useCallback(
    (event) => decks.find((item) => String(item?.id) === String(event.currentTarget.dataset.deckId)),
    [decks],
  );

  const handleCopyLink = useCallback(
    (event) => {
      const deck = findDeck(event);
      if (deck) actions.onCopyLink?.(deck);
    },
    [actions, findDeck],
  );

  if (decks.length === 0) {
    return <div className="browse-decks-panel__empty">{t("browse.empty")}</div>;
  }

  return (
    <div className="hub-grid" aria-live="polite">
      {decks.map((deck) => {
        const title = deck?.title || t("browse.untitled");
        const tags = normalizeHubTags(deck?.tags, deck?.languages);
        const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
        const slug = typeof deck?.slug === "string" ? deck.slug.trim() : "";
        const deckLink = slug ? buildBrowseDeckRoute(slug) : "";
        const description = typeof deck?.description === "string" ? deck.description.trim() : "";
        const updatedAt = formatDate(deck?.latestVersion?.createdAt || deck?.createdAt);
        const meta = [
          t("browse.wordsCount", { count: Number(deck?.wordsCount) || 0 }),
          t("account.hub.downloads", { count: Number(deck?.downloadsCount) || 0 }),
          updatedAt ? t("browse.updatedOn", { date: updatedAt }) : "",
        ].filter(Boolean);

        return (
          <article className="hub-card" key={deck.id}>
            <header className="hub-card__head">
              <h3 className="hub-card__title">
                {deckLink ? <Link to={deckLink}>{title}</Link> : title}
              </h3>
              <DeckLanguagePair source={deck?.sourceLanguage} targets={deck?.targetLanguages} />
            </header>

            {description ? <p className="hub-card__description">{description}</p> : null}

            {visibleTags.length > 0 ? (
              <ul className="hub-card__tags" aria-label={t("decks.table.tags")}>
                {visibleTags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
                {tags.length > visibleTags.length ? (
                  <li className="hub-card__tags-more">+{formatNumber(tags.length - visibleTags.length)}</li>
                ) : null}
              </ul>
            ) : null}

            <footer className="hub-card__foot">
              <span className="hub-card__meta">{meta.join(" · ")}</span>
              <div className="hub-card__actions">
                <Button
                  data-deck-id={deck.id}
                  onClick={handleCopyLink}
                  disabled={!deckLink}
                  variant="ghost"
                  size="sm"
                  className="hub-card__link"
                  aria-label={t("browse.copyLink")}
                  title={t("browse.copyLink")}
                >
                  <FiLink aria-hidden="true" />
                </Button>
                <HubDeckAction
                  deck={deck}
                  localDeckId={library.get(String(deck.id))}
                  isImporting={String(pendingState.importingDeckId) === String(deck.id)}
                  onImport={() => actions.onImportDeck?.(deck)}
                  size="sm"
                />
              </div>
            </footer>
          </article>
        );
      })}
    </div>
  );
});

BrowseDeckCardList.displayName = "BrowseDeckCardList";
