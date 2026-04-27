import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  FiDownload,
  FiEdit3,
  FiFolder,
  FiMoreVertical,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { formatDeckCreatedAt } from "@shared/lib/date";
import { DeckTagBadges } from "../DeckTagBadges/DeckTagBadges";
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

    if (
      !tagKey ||
      seenCustomTagKeys.has(tagKey) ||
      seenLanguageKeys.has(tagKey)
    ) {
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
  const [openMenuDeckId, setOpenMenuDeckId] = useState(null);

  useDeckTagsPopover(tableRef);

  useEffect(() => {
    if (!openMenuDeckId) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const menuContainer = event.target.closest("[data-deck-menu-id]");

      if (menuContainer?.dataset.deckMenuId === String(openMenuDeckId)) {
        return;
      }

      setOpenMenuDeckId(null);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpenMenuDeckId(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuDeckId]);

  const handleToggleMenu = useCallback((event) => {
    event.stopPropagation();
    const { deckId } = event.currentTarget.dataset;

    setOpenMenuDeckId((currentDeckId) =>
      String(currentDeckId) === String(deckId) ? null : deckId,
    );
  }, []);

  const handleRowOpen = useCallback(
    (event) => {
      actions.onOpenDeck?.(event.currentTarget.dataset.deckId);
    },
    [actions],
  );

  const handleRowKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      actions.onOpenDeck?.(event.currentTarget.dataset.deckId);
    },
    [actions],
  );

  const stopEventPropagation = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleOpenDeck = useCallback(
    (deckId) => {
      actions.onOpenDeck?.(deckId);
      setOpenMenuDeckId(null);
    },
    [actions],
  );

  const handleExportDeck = useCallback(
    (deckId) => {
      actions.onExportDeck?.(deckId);
      setOpenMenuDeckId(null);
    },
    [actions],
  );

  const handleEditDeck = useCallback(
    (deckId) => {
      actions.onEditDeck?.(deckId);
      setOpenMenuDeckId(null);
    },
    [actions],
  );

  const handlePublishDeck = useCallback(
    (deckId) => {
      actions.onPublishDeck?.(deckId);
      setOpenMenuDeckId(null);
    },
    [actions],
  );

  const handleDeleteDeck = useCallback(
    (deck) => {
      actions.onDeleteDeck?.(deck);
      setOpenMenuDeckId(null);
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
        ) : (
          resolvedDecks.map((deck) => {
            const deckTags = buildDeckTags(deck);
            const { visibleTags, hiddenTags } = splitDeckTags(deckTags);
            const isMenuOpen = String(openMenuDeckId) === String(deck.id);
            const isPublishing =
              String(pendingState.publishingDeckId) === String(deck.id);
            const isExporting =
              String(pendingState.exportingDeckId) === String(deck.id);
            const isDeleting =
              String(pendingState.deletingDeckId) === String(deck.id);

            return (
              <tr
                key={deck.id}
                className="decks-table__row"
                data-deck-id={deck.id}
                onClick={handleRowOpen}
                onKeyDown={handleRowKeyDown}
                tabIndex={0}
              >
                <td data-label="Deck">{deck.name}</td>
                <td data-label="Tags" className="decks-table__tags-cell">
                  <div className="decks-table__tags-wrap">
                    <div className="decks-table__tags-row">
                      <DeckTagBadges
                        className="decks-table__tags"
                        badges={visibleTags}
                        inline
                      />

                      {hiddenTags.length > 0 && (
                        <span
                          className="decks-table__tags-more-wrap"
                          tabIndex={0}
                          aria-describedby={`deck-tags-tooltip-${deck.id}`}
                          aria-label={`Show all tags for ${deck.name}`}
                          onClick={stopEventPropagation}
                          onKeyDown={stopEventPropagation}
                        >
                          <span className="decks-table__tags-more">...</span>
                          <span
                            id={`deck-tags-tooltip-${deck.id}`}
                            role="tooltip"
                            className="decks-table__tags-tooltip"
                          >
                            <DeckTagBadges
                              className="decks-table__tags-tooltip-content"
                              badges={deckTags}
                            />
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td data-label="Words">{deck.wordsCount ?? 0}</td>
                <td data-label="Date added">
                  {formatDeckCreatedAt(deck.createdAt)}
                </td>
                <td data-label="Actions" className="decks-table__actions-cell">
                  <div
                    className={`decks-table__actions ${isMenuOpen ? "decks-table__actions--open" : ""}`}
                    data-deck-menu-id={deck.id}
                  >
                    <div className="decks-table__actions-desktop">
                      <button
                        type="button"
                        data-deck-id={deck.id}
                        className="decks-table__menu-trigger"
                        aria-label={`Open actions for ${deck.name}`}
                        aria-expanded={isMenuOpen}
                        aria-haspopup="menu"
                        onClick={handleToggleMenu}
                        onKeyDown={stopEventPropagation}
                      >
                        <FiMoreVertical aria-hidden="true" />
                      </button>

                      {isMenuOpen && (
                        <div
                          className="decks-table__menu"
                          role="menu"
                          aria-label={`Actions for ${deck.name}`}
                          onClick={stopEventPropagation}
                          onKeyDown={stopEventPropagation}
                        >
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleOpenDeck(deck.id)}
                          >
                            <FiFolder aria-hidden />
                            <span>Open</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleEditDeck(deck.id)}
                          >
                            <FiEdit3 aria-hidden />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => handleExportDeck(deck.id)}
                            disabled={isExporting}
                          >
                            <FiDownload aria-hidden />
                            <span>{isExporting ? "Exporting..." : "Export"}</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="decks-table__button--publish"
                            onClick={() => handlePublishDeck(deck.id)}
                            disabled={isPublishing}
                          >
                            <FiSend aria-hidden />
                            <span>{isPublishing ? "Publishing..." : "Publish"}</span>
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            className="decks-table__button--danger"
                            onClick={() =>
                              handleDeleteDeck(deck)
                            }
                            disabled={isDeleting}
                          >
                            <FiTrash2 aria-hidden />
                            <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="decks-table__actions-mobile">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleOpenDeck(deck.id);
                        }}
                      >
                        <FiFolder aria-hidden />
                        <span>Open</span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleEditDeck(deck.id);
                        }}
                      >
                        <FiEdit3 aria-hidden />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleExportDeck(deck.id);
                        }}
                        disabled={isExporting}
                      >
                        <FiDownload aria-hidden />
                        <span>{isExporting ? "Exporting..." : "Export"}</span>
                      </button>
                      <button
                        type="button"
                        className="decks-table__button--publish"
                        onClick={(event) => {
                          event.stopPropagation();
                          handlePublishDeck(deck.id);
                        }}
                        disabled={isPublishing}
                      >
                        <FiSend aria-hidden />
                        <span>{isPublishing ? "Publishing..." : "Publish"}</span>
                      </button>

                      <button
                        type="button"
                        className="decks-table__button--danger"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteDeck(deck);
                        }}
                        disabled={isDeleting}
                      >
                        <FiTrash2 aria-hidden />
                        <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
});

DecksTable.displayName = "DecksTable";
