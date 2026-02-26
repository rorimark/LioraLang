import { memo, useCallback } from "react";
import { MetaBadge } from "@shared/ui";
import "./DecksTable.css";

const MAX_VISIBLE_TAGS = 5;
const MAX_TOTAL_TAGS = 10;

const parseTagsJson = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
};

const buildDeckTags = (deck) => {
  const tags = [];
  const languages = [...new Set(
    [
      deck?.sourceLanguage?.trim(),
      deck?.targetLanguage?.trim(),
      deck?.tertiaryLanguage?.trim(),
    ].filter(Boolean),
  )];
  const customTags = [...new Set(parseTagsJson(deck?.tagsJson))];
  const customTagsLimit = Math.max(0, MAX_TOTAL_TAGS - languages.length);

  languages.forEach((language) => {
    tags.push({
      key: `lang-${language}`,
      text: language,
      accent: false,
    });
  });

  customTags.slice(0, customTagsLimit).forEach((tag) => {
    tags.push({
      key: `tag-${tag}`,
      text: tag,
      accent: false,
    });
  });

  if (tags.length === 0) {
    tags.push({
      key: "untagged",
      text: "No tags yet",
      accent: false,
    });
  }

  return tags;
};

const splitDeckTags = (tags, limit = MAX_VISIBLE_TAGS) => {
  if (!Array.isArray(tags) || tags.length <= limit) {
    return {
      visibleTags: tags,
      hiddenTags: [],
    };
  }

  return {
    visibleTags: tags.slice(0, limit),
    hiddenTags: tags.slice(limit),
  };
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

export const DecksTable = memo(
  ({
    decks,
    onOpenDeck,
    onEditDeck,
    onExportDeck,
    onDeleteDeck,
    exportingDeckId = null,
    deletingDeckId = null,
  }) => {
    const handleOpenDeck = useCallback(
      (event) => {
        onOpenDeck(event.currentTarget.dataset.deckId);
      },
      [onOpenDeck],
    );

    const handleExportDeck = useCallback(
      (event) => {
        onExportDeck(event.currentTarget.dataset.deckId);
      },
      [onExportDeck],
    );

    const handleEditDeck = useCallback(
      (event) => {
        onEditDeck(event.currentTarget.dataset.deckId);
      },
      [onEditDeck],
    );

    const handleDeleteDeck = useCallback(
      (event) => {
        onDeleteDeck(
          event.currentTarget.dataset.deckId,
          event.currentTarget.dataset.deckName,
        );
      },
      [onDeleteDeck],
    );

    return (
      <table className="decks-table" aria-label="Decks table">
        <thead>
          <tr>
            <th>Deck</th>
            <th>Tags</th>
            <th>Words</th>
            <th>Added on</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {decks.length === 0 ? (
            <tr>
              <td colSpan={5} className="decks-table__empty">
                No decks found. Create one or import a JSON deck.
              </td>
            </tr>
          ) : decks.map((deck) => {
            const deckTags = buildDeckTags(deck);
            const { visibleTags, hiddenTags } = splitDeckTags(deckTags);
            const allTagsTooltip = deckTags.map((tag) => tag.text).join(" • ");

            return (
              <tr key={deck.id}>
                <td data-label="Deck">{deck.name}</td>
                <td data-label="Tags" className="decks-table__tags-cell">
                  <div className="decks-table__tags-wrap">
                    <div className="decks-table__tags">
                      {visibleTags.map((tag) => (
                        <MetaBadge
                          key={`${deck.id}-${tag.key}`}
                          text={tag.text}
                          accent={tag.accent}
                        />
                      ))}

                      {hiddenTags.length > 0 && (
                        <span className="decks-table__tags-more-wrap">
                          <span
                            className="decks-table__tags-more"
                            tabIndex={0}
                            title={allTagsTooltip}
                            aria-describedby={`deck-tags-tooltip-${deck.id}`}
                            aria-label={`Show all tags for ${deck.name}`}
                          >
                            ...
                          </span>
                          <span
                            id={`deck-tags-tooltip-${deck.id}`}
                            role="tooltip"
                            className="decks-table__tags-tooltip"
                          >
                            {allTagsTooltip}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td data-label="Words">{deck.wordsCount ?? 0}</td>
                <td data-label="Added on">{formatDate(deck.createdAt)}</td>
                <td data-label="Actions" className="decks-table__actions-cell">
                  <div className="decks-table__actions">
                    <button
                      type="button"
                      data-deck-id={deck.id}
                      onClick={handleOpenDeck}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      data-deck-id={deck.id}
                      onClick={handleEditDeck}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      data-deck-id={deck.id}
                      onClick={handleExportDeck}
                      disabled={String(exportingDeckId) === String(deck.id)}
                    >
                      {String(exportingDeckId) === String(deck.id)
                        ? "Exporting..."
                        : "Export"}
                    </button>
                    <button
                      type="button"
                      className="decks-table__button--danger"
                      data-deck-name={deck.name}
                      data-deck-id={deck.id}
                      onClick={handleDeleteDeck}
                      disabled={String(deletingDeckId) === String(deck.id)}
                    >
                      {String(deletingDeckId) === String(deck.id)
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  },
);

DecksTable.displayName = "DecksTable";
