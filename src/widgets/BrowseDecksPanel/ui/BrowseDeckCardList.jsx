import { memo, useCallback } from "react";
import { Link } from "react-router";
import { Button, MetaBadge } from "@shared/ui";
import { buildBrowseDeckRoute } from "@shared/config/routes";

const MAX_VISIBLE_TAGS = 4;

const formatFileSize = (bytes) => {
  if (!Number.isFinite(Number(bytes)) || Number(bytes) <= 0) {
    return "Unknown size";
  }

  const normalizedBytes = Number(bytes);

  if (normalizedBytes < 1024) {
    return `${normalizedBytes} B`;
  }

  const kilobytes = normalizedBytes / 1024;

  if (kilobytes < 1024) {
    return `${kilobytes.toFixed(1)} KB`;
  }

  const megabytes = kilobytes / 1024;
  return `${megabytes.toFixed(2)} MB`;
};

const formatDate = (value) => {
  if (!value) {
    return "Unknown date";
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
};

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

export const BrowseDeckCardList = memo(
  ({
    decks,
    importingDeckId = "",
    deletingDeckId = "",
    canDeleteHubDecks = false,
    onImportDeck,
    onDeleteDeck,
  }) => {
    const handleImportDeck = useCallback(
      (event) => {
        const deckId = event.currentTarget.dataset.deckId;

        if (!deckId) {
          return;
        }

        const deck = decks.find((item) => String(item?.id) === String(deckId));

        if (!deck) {
          return;
        }

        onImportDeck(deck);
      },
      [decks, onImportDeck],
    );

    const handleDeleteDeck = useCallback(
      (event) => {
        const deckId = event.currentTarget.dataset.deckId;

        if (!deckId) {
          return;
        }

        const deck = decks.find((item) => String(item?.id) === String(deckId));

        if (!deck) {
          return;
        }

        if (typeof onDeleteDeck === "function") {
          onDeleteDeck(deck);
        }
      },
      [decks, onDeleteDeck],
    );

    if (!Array.isArray(decks) || decks.length === 0) {
      return (
        <div className="browse-decks-panel__empty">
          No community decks found for your search.
        </div>
      );
    }

    return (
      <div className="browse-decks-panel__grid" aria-live="polite">
        {decks.map((deck) => {
          const languages = Array.isArray(deck?.languages) ? deck.languages : [];
          const tags = normalizeTags(deck?.tags);
          const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
          const hiddenTagsCount = Math.max(0, tags.length - visibleTags.length);
          const hasDescription =
            typeof deck?.description === "string" && deck.description.trim().length > 0;
          const isImporting = String(importingDeckId) === String(deck?.id);
          const isDeleting = String(deletingDeckId) === String(deck?.id);
          const fileSize = formatFileSize(deck?.latestVersion?.fileSizeBytes);
          const createdAt = formatDate(deck?.createdAt);
          const updatedAt = formatDate(
            deck?.latestVersion?.createdAt || deck?.createdAt,
          );
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

          return (
            <article className="browse-decks-panel__card" key={deck.id}>
              <header className="browse-decks-panel__card-head">
                <h3>
                  {deckLink ? (
                    <Link className="browse-decks-panel__card-link" to={deckLink}>
                      {deck?.title || "Untitled deck"}
                    </Link>
                  ) : (
                    deck?.title || "Untitled deck"
                  )}
                </h3>
                <span className="browse-decks-panel__card-meta">
                  Added {createdAt}
                </span>
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
                <div className="browse-decks-panel__badges">
                  {languages.map((language) => (
                    <MetaBadge
                      key={`${deck.id}-lang-${language}`}
                      text={language}
                      accent={false}
                    />
                  ))}
                  {visibleTags.map((tag) => (
                    <MetaBadge
                      key={`${deck.id}-tag-${tag}`}
                      text={tag}
                      accent={false}
                    />
                  ))}
                  {hiddenTagsCount > 0 ? (
                    <MetaBadge
                      text={`+${hiddenTagsCount}`}
                      accent={false}
                    />
                  ) : null}
                </div>

                <dl className="browse-decks-panel__stats">
                  <div>
                    <dt>Words</dt>
                    <dd>{wordsCount}</dd>
                  </div>
                  <div>
                    <dt>Downloads</dt>
                    <dd>{downloadsCount}</dd>
                  </div>
                  <div>
                    <dt>Updated</dt>
                    <dd>{updatedAt}</dd>
                  </div>
                  <div>
                    <dt>Package</dt>
                    <dd>{fileSize}</dd>
                  </div>
                </dl>
              </div>

              <div
                className={
                  canDeleteHubDecks
                    ? "browse-decks-panel__actions"
                    : "browse-decks-panel__actions browse-decks-panel__actions--single"
                }
              >
                <Button
                  data-deck-id={deck.id}
                  onClick={handleImportDeck}
                  disabled={isImporting || isDeleting || !deck?.latestVersion?.filePath}
                  variant="primary"
                >
                  {isImporting ? "Importing..." : "Import to Decks"}
                </Button>
                {canDeleteHubDecks ? (
                  <Button
                    data-deck-id={deck.id}
                    onClick={handleDeleteDeck}
                    disabled={isImporting || isDeleting}
                    variant="danger"
                  >
                    {isDeleting ? "Deleting..." : "Delete from Hub"}
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  },
);

BrowseDeckCardList.displayName = "BrowseDeckCardList";
