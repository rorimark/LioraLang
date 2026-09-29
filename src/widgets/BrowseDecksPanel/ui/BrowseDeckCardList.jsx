import { memo, useCallback } from "react";
import { Link } from "react-router";
import {
  FiCalendar,
  FiDownload,
  FiHardDrive,
  FiLink,
  FiPackage,
  FiType,
} from "react-icons/fi";
import { DeckTagBadges } from "@entities/deck";
import { Button } from "@shared/ui";
import { buildBrowseDeckRoute } from "@shared/config/routes";
import { useI18n } from "@shared/lib/i18n";

const MAX_VISIBLE_TAGS = 4;
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);

const normalizeTags = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueTags = [];
  const seen = new Set();

  value.forEach((tag) => {
    if (typeof tag !== "string") {
      return;
    }

    const normalizedTag = tag.trim();
    const key = normalizedTag.toLowerCase();

    if (!normalizedTag || seen.has(key)) {
      return;
    }

    seen.add(key);
    uniqueTags.push(normalizedTag);
  });

  return uniqueTags;
};

export const BrowseDeckCardList = memo(({ deckList = EMPTY_OBJECT }) => {
    const { t, formatBytes, formatDate, formatNumber, languageName } = useI18n();
    const resolvedDeckList = deckList;
    const resolvedDecks = Array.isArray(resolvedDeckList.decks)
      ? resolvedDeckList.decks
      : EMPTY_ARRAY;
    const pendingState = resolvedDeckList.pendingState || EMPTY_OBJECT;
    const actions = resolvedDeckList.actions || EMPTY_OBJECT;

    const handleImportDeck = useCallback(
      (event) => {
        const deckId = event.currentTarget.dataset.deckId;

        if (!deckId) {
          return;
        }

        const deck = resolvedDecks.find(
          (item) => String(item?.id) === String(deckId),
        );

        if (!deck) {
          return;
        }

        actions.onImportDeck?.(deck);
      },
      [actions, resolvedDecks],
    );

    const handleCopyLink = useCallback(
      (event) => {
        const deckId = event.currentTarget.dataset.deckId;

        if (!deckId) {
          return;
        }

        const deck = resolvedDecks.find(
          (item) => String(item?.id) === String(deckId),
        );

        if (!deck) {
          return;
        }

        actions.onCopyLink?.(deck);
      },
      [actions, resolvedDecks],
    );

    if (resolvedDecks.length === 0) {
      return (
        <div className="browse-decks-panel__empty">
          {t("browse.empty")}
        </div>
      );
    }

    return (
      <div className="browse-decks-panel__grid" aria-live="polite">
        {resolvedDecks.map((deck) => {
          const languages = Array.isArray(deck?.languages) ? deck.languages : [];
          const tags = normalizeTags(deck?.tags);
          const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
          const hiddenTagsCount = Math.max(0, tags.length - visibleTags.length);
          const badgeItems = [
            ...languages.map((language) => ({
              key: `${deck.id}-lang-${language}`,
              text: languageName(language),
              accent: false,
            })),
            ...visibleTags.map((tag) => ({
              key: `${deck.id}-tag-${tag}`,
              text: tag,
              accent: false,
            })),
            ...(hiddenTagsCount > 0
              ? [{
                key: `${deck.id}-tag-more`,
                text: `+${hiddenTagsCount}`,
                accent: false,
              }]
              : []),
          ];
          const hasDescription =
            typeof deck?.description === "string" && deck.description.trim().length > 0;
          const isImporting =
            String(pendingState.importingDeckId) === String(deck?.id);
          const fileSize =
            formatBytes(deck?.latestVersion?.fileSizeBytes) || t("browse.unknownSize");
          const createdAt = formatDate(deck?.createdAt) || t("browse.unknownDate");
          const updatedAt =
            formatDate(deck?.latestVersion?.createdAt || deck?.createdAt) ||
            t("browse.unknownDate");
          const wordsCount = Number.isFinite(Number(deck?.wordsCount))
            ? Number(deck.wordsCount)
            : 0;
          const downloadsCount = Number.isFinite(Number(deck?.downloadsCount))
            ? Number(deck.downloadsCount)
            : 0;
          const deckSlug =
            typeof deck?.slug === "string" && deck.slug.trim()
              ? deck.slug.trim()
              : "";
          const deckLink = deckSlug ? buildBrowseDeckRoute(deckSlug) : "";
          const canCopyLink = Boolean(deckLink);

          return (
            <article className="browse-decks-panel__card" key={deck.id}>
              <header className="browse-decks-panel__card-head">
                <div className="browse-decks-panel__card-title">
                  <div className="browse-decks-panel__card-title-row">
                    <h3>
                      {deckLink ? (
                        <Link className="browse-decks-panel__card-link" to={deckLink}>
                          {deck?.title || t("browse.untitled")}
                        </Link>
                      ) : (
                        deck?.title || t("browse.untitled")
                      )}
                    </h3>
                    <Button
                      data-deck-id={deck.id}
                      onClick={handleCopyLink}
                      disabled={!canCopyLink || isImporting}
                      variant="ghost"
                      size="sm"
                      className="browse-decks-panel__copy-link"
                      aria-label={t("browse.copyLink")}
                      title={t("browse.copyLink")}
                    >
                      <FiLink />
                    </Button>
                  </div>
                  <span className="browse-decks-panel__card-meta">
                    {t("browse.added", { date: createdAt })}
                  </span>
                </div>
                <span className="browse-decks-panel__date-pill">{createdAt}</span>
              </header>

              <p
                className={
                  hasDescription
                    ? "browse-decks-panel__description"
                    : "browse-decks-panel__description browse-decks-panel__description--empty"
                }
                aria-hidden={!hasDescription}
              >
                {hasDescription ? deck.description : "\u00A0"}
              </p>

              <div className="browse-decks-panel__card-footer">
                <DeckTagBadges
                  className="browse-decks-panel__badges"
                  badges={badgeItems}
                />

                <dl className="browse-decks-panel__stats">
                  <div className="browse-decks-panel__stat">
                    <dt>
                      <FiType aria-hidden />
                      <span>{t("decks.table.words")}</span>
                    </dt>
                    <dd>{formatNumber(wordsCount)}</dd>
                  </div>
                  <div className="browse-decks-panel__stat">
                    <dt>
                      <FiDownload aria-hidden />
                      <span>{t("browse.downloads")}</span>
                    </dt>
                    <dd>{formatNumber(downloadsCount)}</dd>
                  </div>
                  <div className="browse-decks-panel__stat">
                    <dt>
                      <FiCalendar aria-hidden />
                      <span>{t("browse.updated")}</span>
                    </dt>
                    <dd>{updatedAt}</dd>
                  </div>
                  <div className="browse-decks-panel__stat">
                    <dt>
                      <FiPackage aria-hidden />
                      <span>{t("browse.package")}</span>
                    </dt>
                    <dd>{fileSize}</dd>
                  </div>
                </dl>
              </div>

              <div className="browse-decks-panel__actions browse-decks-panel__actions--single">
                <Button
                  data-deck-id={deck.id}
                  onClick={handleImportDeck}
                  disabled={isImporting || !deck?.latestVersion?.filePath}
                  variant="primary"
                >
                  {isImporting ? <FiHardDrive aria-hidden /> : <FiDownload aria-hidden />}
                  <span>{isImporting ? t("browse.importing") : t("browse.import")}</span>
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    );
  });

BrowseDeckCardList.displayName = "BrowseDeckCardList";
