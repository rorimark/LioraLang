import { memo, useCallback, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { CardCatalogPagination } from "@features/card-catalog";
import { ROUTE_PATHS, buildDeckDetailsRoute } from "@shared/config/routes";
import { paginate } from "@shared/lib/pagination";
import { SettingSegmented } from "@shared/ui";
import { DECK_SORTS, STAGES, formatInteger, plural, sortDeckRows } from "../model";
import { StageBar } from "./progressCharts";

// A few decks at a glance, the rest a tap away: folded, the card shows the
// first six in the chosen order; unfolded, every deck, twelve to a page.
const FOLDED_COUNT = 6;
const PAGE_SIZE = 12;
const SORT_STORAGE_KEY = "lioralang.progress.deckSort";

const readSort = () => {
  try {
    const stored = window.localStorage.getItem(SORT_STORAGE_KEY);
    return DECK_SORTS.some((sort) => sort.value === stored) ? stored : DECK_SORTS[0].value;
  } catch {
    return DECK_SORTS[0].value;
  }
};

const writeSort = (value) => {
  try {
    window.localStorage.setItem(SORT_STORAGE_KEY, value);
  } catch {
    // Remembering the order is a convenience; the list works without it.
  }
};

const DeckRow = memo(({ deck }) => (
  <li className="progress-deck">
    <div className="progress-deck__head">
      <Link className="progress-deck__name" to={buildDeckDetailsRoute(deck.id)}>
        {deck.name}
      </Link>
      <span className="progress-deck__known">
        <strong>{formatInteger(deck.known)}</strong> / {formatInteger(deck.words)} known
      </span>
    </div>
    <StageBar
      stages={deck}
      total={deck.words}
      size="sm"
      label={`${deck.name}: ${STAGES.map((stage) => `${stage.label} ${deck[stage.key]}`).join(", ")}`}
    />
    <div className="progress-deck__foot">
      <span>
        {deck.dueNow > 0 ? <em>{formatInteger(deck.dueNow)} due now</em> : "Nothing due"}
        {" · "}
        {deck.reviews7d > 0 ? `${plural(deck.reviews7d, "review")} this week` : "No reviews this week"}
      </span>
      {deck.dueNow > 0 ? (
        <Link
          className="ui-button ui-button--secondary ui-button--sm"
          to={ROUTE_PATHS.learn}
          state={{ importedDeckId: String(deck.id) }}
          aria-label={`Review ${deck.name}`}
        >
          Review
        </Link>
      ) : null}
    </div>
  </li>
));

DeckRow.displayName = "DeckRow";

export const ProgressDecksCard = memo(({ decks }) => {
  const cardRef = useRef(null);
  const [sort, setSort] = useState(readSort);
  const [isUnfolded, setIsUnfolded] = useState(false);
  const [page, setPage] = useState(1);
  const sortedDecks = useMemo(() => sortDeckRows(decks, sort), [decks, sort]);
  const canUnfold = sortedDecks.length > FOLDED_COUNT;
  const deckPage = useMemo(() => paginate(sortedDecks, page, PAGE_SIZE), [page, sortedDecks]);
  const shownDecks = isUnfolded ? deckPage.items : sortedDecks.slice(0, FOLDED_COUNT);

  const handleSortChange = useCallback((event) => {
    setSort(event.target.value);
    setPage(1);
    writeSort(event.target.value);
  }, []);

  // A new page, or folding back up, starts at the card's top, so the page
  // does not stay scrolled into what was the long list.
  const bringCardIntoView = useCallback(() => {
    requestAnimationFrame(() => {
      const card = cardRef.current;

      if (card && card.getBoundingClientRect().top < 0) {
        card.scrollIntoView({ block: "start" });
      }
    });
  }, []);

  const toggleUnfolded = useCallback(() => {
    if (isUnfolded) {
      bringCardIntoView();
    }

    setIsUnfolded(!isUnfolded);
    setPage(1);
  }, [bringCardIntoView, isUnfolded]);

  const pagination = useMemo(
    () => ({
      ...deckPage,
      onPageChange: (nextPage) => {
        setPage(nextPage);
        bringCardIntoView();
      },
    }),
    [bringCardIntoView, deckPage],
  );

  return (
    <section className="progress-card progress-decks-card" ref={cardRef}>
      <header className="progress-card__head">
        <h2>
          Decks <span className="progress-card__count">{formatInteger(decks.length)}</span>
        </h2>
        {decks.length > 2 ? (
          <SettingSegmented
            name="progress-deck-sort"
            value={sort}
            options={DECK_SORTS}
            onChange={handleSortChange}
            ariaLabel="Order decks by"
          />
        ) : null}
      </header>

      {decks.length === 0 ? (
        <p className="progress-empty">Your decks and how far along you are in each will be listed here.</p>
      ) : (
        <ul className="progress-decks">
          {shownDecks.map((deck) => (
            <DeckRow key={deck.id} deck={deck} />
          ))}
        </ul>
      )}

      {isUnfolded && deckPage.totalPages > 1 ? (
        <CardCatalogPagination pagination={pagination} label="Deck pages" />
      ) : null}

      {canUnfold ? (
        <button
          type="button"
          className="progress-decks__toggle"
          aria-expanded={isUnfolded}
          onClick={toggleUnfolded}
        >
          {isUnfolded ? "Show fewer" : `Show all ${formatInteger(decks.length)} decks`}
        </button>
      ) : null}
    </section>
  );
});

ProgressDecksCard.displayName = "ProgressDecksCard";
