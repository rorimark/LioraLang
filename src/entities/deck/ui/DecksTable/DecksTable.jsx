import { memo, useCallback, useRef } from "react";
import { formatDeckCreatedAt } from "@shared/lib/date";
import { MetaBadge } from "@shared/ui";
import { useDeckTagsPopover } from "../../model/useDeckTagsPopover";
import "./DecksTable.css";

const MAX_VISIBLE_TAGS = 5;
const MAX_TOTAL_TAGS = 10;
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_ARRAY = Object.freeze([]);
const normalizeTagKey = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

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
  const languages = [];
  const seenLanguageKeys = new Set();
  const rawLanguages = [
    deck?.sourceLanguage?.trim(),
    deck?.targetLanguage?.trim(),
    deck?.tertiaryLanguage?.trim(),
  ].filter(Boolean);

  rawLanguages.forEach((language) => {
    const languageKey = normalizeTagKey(language);

    if (!languageKey || seenLanguageKeys.has(languageKey)) {
      return;
    }

    seenLanguageKeys.add(languageKey);
    languages.push(language);
  });

  const customTags = [];
  const seenCustomTagKeys = new Set();

  parseTagsJson(deck?.tagsJson).forEach((tag) => {
    const tagKey = normalizeTagKey(tag);

    if (!tagKey || seenCustomTagKeys.has(tagKey) || seenLanguageKeys.has(tagKey)) {
      return;
    }

    seenCustomTagKeys.add(tagKey);
    customTags.push(tag.trim());
  });

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

export const DecksTable = memo(({ table = EMPTY_OBJECT }) => {
    const resolvedTable = table;
    const resolvedDecks = Array.isArray(resolvedTable.decks)
      ? resolvedTable.decks
      : EMPTY_ARRAY;
    const actions = resolvedTable.actions || EMPTY_OBJECT;
    const pendingState = resolvedTable.pendingState || EMPTY_OBJECT;
    const tableRef = useRef(null);

    useDeckTagsPopover(tableRef);

    const handleOpenDeck = useCallback(
      (event) => {
        actions.onOpenDeck?.(event.currentTarget.dataset.deckId);
      },
      [actions],
    );

    const handleExportDeck = useCallback(
      (event) => {
        actions.onExportDeck?.(event.currentTarget.dataset.deckId);
      },
      [actions],
    );

    const handleEditDeck = useCallback(
      (event) => {
        actions.onEditDeck?.(event.currentTarget.dataset.deckId);
      },
      [actions],
    );

    const handlePublishDeck = useCallback(
      (event) => {
        actions.onPublishDeck?.(event.currentTarget.dataset.deckId);
      },
      [actions],
    );

    const handleDeleteDeck = useCallback(
      (event) => {
        actions.onDeleteDeck?.(
          event.currentTarget.dataset.deckId,
          event.currentTarget.dataset.deckName,
        );
      },
      [actions],
    );

    return (
      <table ref={tableRef} className="decks-table" aria-label="Decks table">
        <thead>
          <tr>
            <th>Deck</th>
            <th>Tags</th>
            <th>Words</th>
            <th>Date added</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {resolvedDecks.length === 0 ? (
            <tr>
              <td colSpan={5} className="decks-table__empty">
                No decks found. Create one or import a deck file.
              </td>
            </tr>
          ) : resolvedDecks.map((deck) => {
            const deckTags = buildDeckTags(deck);
            const { visibleTags, hiddenTags } = splitDeckTags(deckTags);

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
                        <span
                          className="decks-table__tags-more-wrap"
                          tabIndex={0}
                          aria-describedby={`deck-tags-tooltip-${deck.id}`}
                          aria-label={`Show all tags for ${deck.name}`}
                        >
                          <span className="decks-table__tags-more">...</span>
                          <span
                            id={`deck-tags-tooltip-${deck.id}`}
                            role="tooltip"
                            className="decks-table__tags-tooltip"
                          >
                            {deckTags.map((tag) => (
                              <MetaBadge
                                key={`${deck.id}-tooltip-${tag.key}`}
                                text={tag.text}
                                accent={tag.accent}
                              />
                            ))}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td data-label="Words">{deck.wordsCount ?? 0}</td>
                <td data-label="Date added">{formatDeckCreatedAt(deck.createdAt)}</td>
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
                      className="decks-table__button--publish"
                      data-deck-id={deck.id}
                      onClick={handlePublishDeck}
                      disabled={
                        String(pendingState.publishingDeckId) === String(deck.id)
                      }
                    >
                      {String(pendingState.publishingDeckId) === String(deck.id)
                        ? "Publishing..."
                        : "Publish"}
                    </button>
                    <button
                      type="button"
                      data-deck-id={deck.id}
                      onClick={handleExportDeck}
                      disabled={
                        String(pendingState.exportingDeckId) === String(deck.id)
                      }
                    >
                      {String(pendingState.exportingDeckId) === String(deck.id)
                        ? "Exporting..."
                        : "Export"}
                    </button>
                    <button
                      type="button"
                      className="decks-table__button--danger"
                      data-deck-name={deck.name}
                      data-deck-id={deck.id}
                      onClick={handleDeleteDeck}
                      disabled={
                        String(pendingState.deletingDeckId) === String(deck.id)
                      }
                    >
                      {String(pendingState.deletingDeckId) === String(deck.id)
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
  });

DecksTable.displayName = "DecksTable";
