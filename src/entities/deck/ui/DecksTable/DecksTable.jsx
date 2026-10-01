import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  FiDownload,
  FiEdit3,
  FiFolder,
  FiMoreVertical,
  FiSend,
  FiTrash2,
} from "react-icons/fi";
import { Button } from "@shared/ui";
import { getSubjectProfile } from "@shared/core/usecases/subjects";
import { DeckTagBadges } from "../DeckTagBadges/DeckTagBadges";
import { DeckLanguagePair } from "../DeckLanguagePair/DeckLanguagePair";
import { useDeckTagsPopover } from "../../model/useDeckTagsPopover";
import "./DecksTable.css";
import { useI18n } from "@shared/lib/i18n";

// One line of tags: the first few, and the count of the rest.
const MAX_VISIBLE_TAGS = 2;
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

// The deck's own tags; its languages are shown as a pair, not as tags.
const buildDeckTags = (deck) => {
  const languageKeys = new Set(
    [deck?.sourceLanguage, deck?.targetLanguage, deck?.tertiaryLanguage].map(normalizeTagKey).filter(Boolean),
  );
  const seen = new Set();

  return parseTagsJson(deck?.tagsJson)
    .filter((tag) => {
      const key = normalizeTagKey(tag);

      if (!key || seen.has(key) || languageKeys.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((tag) => ({ key: `tag-${tag}`, text: tag, accent: false }));
};

const DeckMenu = ({ deck, isOpen, pendingState, onToggle, onAction, stop }) => {
  const { t } = useI18n();
  const id = String(deck.id);
  const isPublishing = String(pendingState.publishingDeckId) === id;
  const isExporting = String(pendingState.exportingDeckId) === id;
  const isDeleting = String(pendingState.deletingDeckId) === id;

  return (
    <div className={`decks-table__actions${isOpen ? " decks-table__actions--open" : ""}`} data-deck-menu-id={deck.id}>
      <button
        type="button"
        data-deck-id={deck.id}
        className="decks-table__menu-trigger"
        aria-label={t("decks.table.openActions", { name: deck.name })}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={onToggle}
        onKeyDown={stop}
      >
        <FiMoreVertical aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          className="decks-table__menu"
          role="menu"
          aria-label={t("decks.table.actionsFor", { name: deck.name })}
          onClick={stop}
          onKeyDown={stop}
        >
          <button type="button" role="menuitem" onClick={() => onAction("open", deck)}>
            <FiFolder aria-hidden />
            <span>{t("common.open")}</span>
          </button>
          <button type="button" role="menuitem" onClick={() => onAction("edit", deck)}>
            <FiEdit3 aria-hidden />
            <span>{t("common.edit")}</span>
          </button>
          <button type="button" role="menuitem" onClick={() => onAction("export", deck)} disabled={isExporting}>
            <FiDownload aria-hidden />
            <span>{isExporting ? t("decks.table.exporting") : t("decks.table.export")}</span>
          </button>
          {getSubjectProfile(deck.subject).canPublishToHub ? (
            <button
              type="button"
              role="menuitem"
              className="decks-table__button--publish"
              onClick={() => onAction("publish", deck)}
              disabled={isPublishing}
            >
              <FiSend aria-hidden />
              <span>{isPublishing ? t("decks.table.publishing") : t("decks.table.publish")}</span>
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="decks-table__button--danger"
            onClick={() => onAction("delete", deck)}
            disabled={isDeleting}
          >
            <FiTrash2 aria-hidden />
            <span>{isDeleting ? t("decks.table.deleting") : t("common.delete")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

// Where the deck stands with the learner: what is due, what is new, or
// that it is done for now.
const DeckReview = ({ progress, wordsCount }) => {
  const { t } = useI18n();

  if (!progress) {
    return null;
  }

  if (wordsCount === 0) {
    return <span className="deck-row__state">{t("decks.row.empty")}</span>;
  }

  if (progress.dueNow > 0) {
    return <span className="deck-row__state is-due">{t("decks.row.due", { count: progress.dueNow })}</span>;
  }

  if (progress.fresh > 0) {
    return <span className="deck-row__state">{t("decks.row.new", { count: progress.fresh })}</span>;
  }

  return <span className="deck-row__state is-done">{t("decks.row.done")}</span>;
};

export const DecksTable = memo(({ table = EMPTY_OBJECT }) => {
  const decks = Array.isArray(table.decks) ? table.decks : EMPTY_ARRAY;
  const actions = table.actions || EMPTY_OBJECT;
  const pendingState = table.pendingState || EMPTY_OBJECT;
  const progressByDeck = table.progress || EMPTY_OBJECT;
  const listRef = useRef(null);
  const [openMenuDeckId, setOpenMenuDeckId] = useState(null);
  const { t, formatNumber } = useI18n();

  useDeckTagsPopover(listRef);

  useEffect(() => {
    if (!openMenuDeckId) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      const menuContainer = event.target.closest("[data-deck-menu-id]");

      if (menuContainer?.dataset.deckMenuId !== String(openMenuDeckId)) {
        setOpenMenuDeckId(null);
      }
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

  const stop = useCallback((event) => {
    event.stopPropagation();
  }, []);

  const handleToggleMenu = useCallback((event) => {
    event.stopPropagation();
    const { deckId } = event.currentTarget.dataset;
    setOpenMenuDeckId((current) => (String(current) === String(deckId) ? null : deckId));
  }, []);

  const handleAction = useCallback(
    (action, deck) => {
      setOpenMenuDeckId(null);

      if (action === "open") actions.onOpenDeck?.(deck.id);
      if (action === "edit") actions.onEditDeck?.(deck.id);
      if (action === "export") actions.onExportDeck?.(deck.id);
      if (action === "publish") actions.onPublishDeck?.(deck.id);
      if (action === "delete") actions.onDeleteDeck?.(deck);
    },
    [actions],
  );

  const handleRowOpen = useCallback(
    (event) => {
      actions.onOpenDeck?.(event.currentTarget.dataset.deckId);
    },
    [actions],
  );

  const handleRowKeyDown = useCallback(
    (event) => {
      if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) {
        return;
      }

      event.preventDefault();
      actions.onOpenDeck?.(event.currentTarget.dataset.deckId);
    },
    [actions],
  );

  if (decks.length === 0) {
    return <p className="deck-list__empty">{t("decks.table.empty")}</p>;
  }

  return (
    <div className="deck-list" ref={listRef}>
      <div className="deck-list__head" aria-hidden="true">
        <span>{t("decks.table.deck")}</span>
        <span>{t("decks.table.tags")}</span>
        <span>{t("decks.row.learned")}</span>
        <span>{t("decks.row.review")}</span>
        <span />
      </div>

      <ul className="deck-list__rows" aria-label={t("decks.table.label")}>
        {decks.map((deck) => {
          const tags = buildDeckTags(deck);
          const visibleTags = tags.slice(0, MAX_VISIBLE_TAGS);
          const hiddenCount = tags.length - visibleTags.length;
          const progress = progressByDeck[String(deck.id)];
          const wordsCount = Number(deck.wordsCount ?? progress?.words ?? 0);
          const known = Math.min(progress?.known ?? 0, wordsCount);
          const share = wordsCount > 0 ? known / wordsCount : 0;
          const isDue = (progress?.dueNow ?? 0) > 0;

          return (
            <li
              key={deck.id}
              className="deck-row"
              data-deck-id={deck.id}
              onClick={handleRowOpen}
              onKeyDown={handleRowKeyDown}
              tabIndex={0}
              aria-label={deck.name}
            >
              <div className="deck-row__main">
                <strong className="deck-row__name">{deck.name}</strong>
                <DeckLanguagePair
                  source={deck.sourceLanguage}
                  targets={[deck.targetLanguage, deck.tertiaryLanguage]}
                  pictureSide={deck.pictureSide}
                  subject={deck.subject}
                  subjectFields={deck.subjectFields}
                />
              </div>

              <div className="deck-row__tags">
                {visibleTags.length > 0 ? (
                  <DeckTagBadges className="deck-row__tag-list" badges={visibleTags} inline />
                ) : null}
                {tags.length > 1 ? (
                  // Two counts: the rest after two tags, and after one when
                  // the row is narrow and shows a single tag.
                  <span
                    className={`decks-table__tags-more-wrap${hiddenCount > 0 ? "" : " is-narrow-only"}`}
                    tabIndex={0}
                    aria-describedby={`deck-tags-tooltip-${deck.id}`}
                    aria-label={t("decks.table.allTags", { name: deck.name })}
                    onClick={stop}
                    onKeyDown={stop}
                  >
                    <span className="decks-table__tags-more">
                      <span className="deck-row__more-wide">+{hiddenCount}</span>
                      <span className="deck-row__more-narrow">+{tags.length - 1}</span>
                    </span>
                    <span id={`deck-tags-tooltip-${deck.id}`} role="tooltip" className="decks-table__tags-tooltip">
                      <DeckTagBadges className="decks-table__tags-tooltip-content" badges={tags} />
                    </span>
                  </span>
                ) : null}
              </div>

              <div className="deck-row__progress">
                <span className="deck-row__count">
                  {progress ? (
                    <>
                      <b>{formatNumber(known)}</b> / {formatNumber(wordsCount)}
                    </>
                  ) : (
                    t("browse.wordsCount", { count: wordsCount })
                  )}
                </span>
                <span
                  className="deck-row__bar"
                  role="img"
                  aria-label={t("decks.row.learnedOf", { known, words: wordsCount })}
                >
                  <i style={{ inlineSize: `${Math.round(share * 100)}%` }} />
                </span>
              </div>

              <div className="deck-row__review">
                <DeckReview progress={progress} wordsCount={wordsCount} />
              </div>

              <div className="deck-row__actions" onClick={stop} onKeyDown={stop}>
                <Button
                  variant={isDue ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => actions.onLearnDeck?.(deck.id)}
                  disabled={wordsCount === 0}
                  aria-label={t("decks.row.learnNamed", { name: deck.name })}
                >
                  {t("decks.row.learn")}
                </Button>
                <DeckMenu
                  deck={deck}
                  isOpen={String(openMenuDeckId) === String(deck.id)}
                  pendingState={pendingState}
                  onToggle={handleToggleMenu}
                  onAction={handleAction}
                  stop={stop}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
});

DecksTable.displayName = "DecksTable";
