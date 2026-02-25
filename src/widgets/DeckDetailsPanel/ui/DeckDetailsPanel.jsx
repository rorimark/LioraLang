import { memo } from "react";
import { WordsTable } from "@entities/word";
import {
  CardCatalogFilters,
  CardCatalogPagination,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from "@features/card-catalog";
import { InlineAlert } from "@shared/ui";
import "./DeckDetailsPanel.css";

const DeckLoadingState = memo(() => {
  return <article className="panel cards-panel">Loading deck...</article>;
});

DeckLoadingState.displayName = "DeckLoadingState";

const DeckErrorState = memo(({ error, onRetry }) => {
  return (
    <article className="panel cards-panel">
      <div className="cards-panel__status cards-panel__status--error">
        {error || "Deck not found"}
      </div>
      <button type="button" className="cards-panel__retry" onClick={onRetry}>
        Retry
      </button>
    </article>
  );
});

DeckErrorState.displayName = "DeckErrorState";

const DeckCatalog = memo(
  ({
    deck,
    totalItems,
    message,
    messageVariant,
    isExporting,
    onExport,
    onRefresh,
    onCloseMessage,
    isNarrowFiltersViewport,
    isFiltersExpanded,
    onToggleFilters,
    search,
    sort,
    filters,
    levelOptions,
    partOfSpeechOptions,
    paginatedWords,
    totalPages,
    resolvedPage,
    pageSize,
    visibleRange,
    onSearchChange,
    onSortChange,
    onPageChange,
    onPageSizeChange,
    onToggleFilter,
    onClearFilters,
  }) => {
    return (
      <article className="panel cards-panel">
        <div className="cards-panel__header">
          <h2>{deck.name}</h2>
          <p>{deck.description || "Deck details and words catalog"}</p>
          <span className="cards-panel__count">{totalItems} results</span>
        </div>

        <div className="decks-page-panel__actions">
          <button type="button" onClick={onExport} disabled={isExporting}>
            {isExporting ? "Exporting..." : "Export deck as JSON"}
          </button>
          <button type="button" onClick={onRefresh}>
            Refresh words
          </button>
        </div>

        <InlineAlert
          text={message}
          variant={messageVariant}
          onClose={onCloseMessage}
        />

        <div className="dictionary-workspace">
          <div className="dictionary-table-area">
            <div className="dictionary-table-scroll">
              <WordsTable words={paginatedWords} />
            </div>

            <CardCatalogPagination
              currentPage={resolvedPage}
              totalPages={totalPages}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              totalItems={totalItems}
              rangeStart={visibleRange.start}
              rangeEnd={visibleRange.end}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>

          <aside className="dictionary-filters-aside">
            {isNarrowFiltersViewport && (
              <button
                type="button"
                className="dictionary-filters-toggle"
                onClick={onToggleFilters}
                aria-expanded={isFiltersExpanded}
              >
                {isFiltersExpanded ? "Hide filters" : "Show filters"}
              </button>
            )}

            {(!isNarrowFiltersViewport || isFiltersExpanded) && (
              <CardCatalogFilters
                search={search}
                sort={sort}
                filters={filters}
                levelOptions={levelOptions}
                partOfSpeechOptions={partOfSpeechOptions}
                sortOptions={SORT_OPTIONS}
                onSearchChange={onSearchChange}
                onSortChange={onSortChange}
                onToggleFilter={onToggleFilter}
                onClearFilters={onClearFilters}
              />
            )}
          </aside>
        </div>
      </article>
    );
  },
);

DeckCatalog.displayName = "DeckCatalog";

export const DeckDetailsPanel = memo(
  ({
    deck,
    isLoading,
    error,
    onRetry,
    message,
    messageVariant,
    isExporting,
    onExport,
    onRefresh,
    onCloseMessage,
    isNarrowFiltersViewport,
    isFiltersExpanded,
    onToggleFilters,
    search,
    sort,
    filters,
    levelOptions,
    partOfSpeechOptions,
    paginatedWords,
    totalItems,
    totalPages,
    resolvedPage,
    pageSize,
    visibleRange,
    onSearchChange,
    onSortChange,
    onPageChange,
    onPageSizeChange,
    onToggleFilter,
    onClearFilters,
  }) => {
    if (isLoading) {
      return <DeckLoadingState />;
    }

    if (error || !deck) {
      return <DeckErrorState error={error} onRetry={onRetry} />;
    }

    return (
      <DeckCatalog
        deck={deck}
        totalItems={totalItems}
        message={message}
        messageVariant={messageVariant}
        isExporting={isExporting}
        onExport={onExport}
        onRefresh={onRefresh}
        onCloseMessage={onCloseMessage}
        isNarrowFiltersViewport={isNarrowFiltersViewport}
        isFiltersExpanded={isFiltersExpanded}
        onToggleFilters={onToggleFilters}
        search={search}
        sort={sort}
        filters={filters}
        levelOptions={levelOptions}
        partOfSpeechOptions={partOfSpeechOptions}
        paginatedWords={paginatedWords}
        totalPages={totalPages}
        resolvedPage={resolvedPage}
        pageSize={pageSize}
        visibleRange={visibleRange}
        onSearchChange={onSearchChange}
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onToggleFilter={onToggleFilter}
        onClearFilters={onClearFilters}
      />
    );
  },
);

DeckDetailsPanel.displayName = "DeckDetailsPanel";
