import { memo, useMemo } from "react";
import {
  FiArrowLeft,
  FiDownload,
  FiEdit3,
  FiRefreshCw,
  FiSliders,
} from "react-icons/fi";
import { WordsTable } from "@entities/word";
import {
  CardCatalogFilters,
  CardCatalogPagination,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from "@features/card-catalog";
import { ActionModal, InlineAlert } from "@shared/ui";
import { useDeckDetailsPanel } from "../model";
import "./DeckDetailsPanel.css";

const DeckLoadingState = memo(() => {
  return <article className="panel cards-panel">Loading deck...</article>;
});

DeckLoadingState.displayName = "DeckLoadingState";

export const DeckDetailsPanel = memo(() => {
  const panel = useDeckDetailsPanel();

  const showsWordLevels =
    panel.deck?.usesWordLevels !== false && panel.levelOptions.length > 0;
  const resolvedSortOptions = useMemo(() => {
    if (showsWordLevels) {
      return SORT_OPTIONS;
    }

    return SORT_OPTIONS.filter((option) => !String(option?.value || "").startsWith("level-"));
  }, [showsWordLevels]);
  const filterCatalog = useMemo(
    () => ({
      search: panel.search,
      sort: panel.sort,
      filters: panel.filters,
      resultsCount: panel.totalItems,
      levelOptions: showsWordLevels ? panel.levelOptions : [],
      partOfSpeechOptions: panel.partOfSpeechOptions,
      tagOptions: panel.tagOptions,
      sortOptions: resolvedSortOptions,
      onSearchChange: panel.handleSearchChange,
      onSortChange: panel.handleSortChange,
      onToggleFilter: panel.handleToggleFilter,
      onClearFilters: panel.handleClearFilters,
    }),
    [
      panel.filters,
      panel.handleClearFilters,
      panel.handleSearchChange,
      panel.handleSortChange,
      panel.handleToggleFilter,
      panel.levelOptions,
      panel.partOfSpeechOptions,
      panel.search,
      panel.sort,
      panel.tagOptions,
      panel.totalItems,
      resolvedSortOptions,
      showsWordLevels,
    ],
  );
  const pagination = useMemo(
    () => ({
      currentPage: panel.resolvedPage,
      totalPages: panel.totalPages,
      pageSize: panel.pageSize,
      pageSizeOptions: PAGE_SIZE_OPTIONS,
      totalItems: panel.totalItems,
      rangeStart: panel.visibleRange.start,
      rangeEnd: panel.visibleRange.end,
      onPageChange: panel.handlePageChange,
      onPageSizeChange: panel.handlePageSizeChange,
    }),
    [
      panel.handlePageChange,
      panel.handlePageSizeChange,
      panel.pageSize,
      panel.resolvedPage,
      panel.totalItems,
      panel.totalPages,
      panel.visibleRange.end,
      panel.visibleRange.start,
    ],
  );
  const statusAlert = useMemo(
    () => ({
      text: panel.message,
      variant: panel.messageVariant,
      onClose: panel.clearMessage,
    }),
    [panel.clearMessage, panel.message, panel.messageVariant],
  );
  const filtersDialog = useMemo(
    () => ({
      isOpen: panel.isFiltersExpanded,
      title: "Filters",
      description: "Narrow your results and sort the deck.",
      confirmLabel: "Apply",
      cancelLabel: "Close",
      onConfirm: panel.toggleFilters,
      onClose: panel.toggleFilters,
    }),
    [panel.isFiltersExpanded, panel.toggleFilters],
  );

  if (panel.isLoading) {
    return <DeckLoadingState />;
  }

  if (panel.error || !panel.deck) {
    return (
      <article className="panel cards-panel">
        <div className="cards-panel__status cards-panel__status--error">
          {panel.error || "Deck not found"}
        </div>
        <button
          type="button"
          className="cards-panel__retry"
          onClick={panel.refreshDeckWords}
        >
          Retry
        </button>
      </article>
    );
  }

  return (
    <article className="panel cards-panel">
      <div className="cards-panel__header">
        <h2>{panel.deck.name}</h2>
        <p>{panel.deck.description || "Deck details and words catalog"}</p>
      </div>

      <div className="cards-panel__actions">
        <button
          type="button"
          className="cards-panel__button--secondary"
          onClick={panel.openDecksOverview}
        >
          <FiArrowLeft aria-hidden />
          <span>Back to decks</span>
        </button>
        <button type="button" onClick={panel.openEditDeck}>
          <FiEdit3 aria-hidden />
          <span>Edit deck</span>
        </button>
        <button type="button" onClick={panel.exportDeck} disabled={panel.isExporting}>
          <FiDownload aria-hidden />
          <span>{panel.isExporting ? "Exporting..." : "Export deck as JSON"}</span>
        </button>
        <button type="button" onClick={panel.refreshDeckWords}>
          <FiRefreshCw aria-hidden />
          <span>Refresh words</span>
        </button>
        {panel.isNarrowFiltersViewport && (
          <button
            type="button"
            className="cards-panel__filters-button"
            onClick={panel.toggleFilters}
            aria-expanded={panel.isFiltersExpanded}
          >
            <FiSliders aria-hidden />
            <span>{panel.isFiltersExpanded ? "Hide filters" : "Show filters"}</span>
          </button>
        )}
      </div>

      <InlineAlert alert={statusAlert} />

      <div className="dictionary-workspace">
        <div className="dictionary-table-area">
          <div className="dictionary-table-scroll">
            <WordsTable
              words={panel.paginatedWords}
              languageLabels={panel.languageLabels}
              showLevelColumn={showsWordLevels}
            />
          </div>

          <CardCatalogPagination pagination={pagination} />
        </div>

        <aside className="dictionary-filters-aside">
          {!panel.isNarrowFiltersViewport && (
            <CardCatalogFilters catalog={filterCatalog} />
          )}
        </aside>
      </div>

      {panel.isNarrowFiltersViewport && (
        <ActionModal dialog={filtersDialog}>
          <div className="dictionary-filters-modal">
            <CardCatalogFilters catalog={filterCatalog} />
          </div>
        </ActionModal>
      )}
    </article>
  );
});

DeckDetailsPanel.displayName = "DeckDetailsPanel";
