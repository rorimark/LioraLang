import { memo } from "react";
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
  const {
    deck,
    isLoading,
    error,
    refreshDeckWords,
    message,
    messageVariant,
    isExporting,
    exportDeck,
    openEditDeck,
    openDecksOverview,
    clearMessage,
    isNarrowFiltersViewport,
    isFiltersExpanded,
    toggleFilters,
    languageLabels,
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
    handleSearchChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
    handleToggleFilter,
    handleClearFilters,
  } = useDeckDetailsPanel();

  if (isLoading) {
    return <DeckLoadingState />;
  }

  if (error || !deck) {
    return (
      <article className="panel cards-panel">
        <div className="cards-panel__status cards-panel__status--error">
          {error || "Deck not found"}
        </div>
        <button
          type="button"
          className="cards-panel__retry"
          onClick={refreshDeckWords}
        >
          Retry
        </button>
      </article>
    );
  }

  return (
    <article className="panel cards-panel">
      <div className="cards-panel__header">
        <h2>{deck.name}</h2>
        <p>{deck.description || "Deck details and words catalog"}</p>
      </div>

      <div className="cards-panel__actions">
        <button
          type="button"
          className="cards-panel__button--secondary"
          onClick={openDecksOverview}
        >
          Back to decks
        </button>
        <button type="button" onClick={openEditDeck}>
          Edit deck
        </button>
        <button type="button" onClick={exportDeck} disabled={isExporting}>
          {isExporting ? "Exporting..." : "Export deck as JSON"}
        </button>
        <button type="button" onClick={refreshDeckWords}>
          Refresh words
        </button>
        {isNarrowFiltersViewport && (
          <button
            type="button"
            className="cards-panel__filters-button"
            onClick={toggleFilters}
            aria-expanded={isFiltersExpanded}
          >
            {isFiltersExpanded ? "Hide filters" : "Show filters"}
          </button>
        )}
      </div>

      <InlineAlert
        text={message}
        variant={messageVariant}
        onClose={clearMessage}
      />

      <div className="dictionary-workspace">
        <div className="dictionary-table-area">
          <div className="dictionary-table-scroll">
            <WordsTable words={paginatedWords} languageLabels={languageLabels} />
          </div>

          <CardCatalogPagination
            currentPage={resolvedPage}
            totalPages={totalPages}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            totalItems={totalItems}
            rangeStart={visibleRange.start}
            rangeEnd={visibleRange.end}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </div>

        <aside className="dictionary-filters-aside">
          {!isNarrowFiltersViewport && (
            <CardCatalogFilters
              search={search}
              sort={sort}
              filters={filters}
              resultsCount={totalItems}
              levelOptions={levelOptions}
              partOfSpeechOptions={partOfSpeechOptions}
              sortOptions={SORT_OPTIONS}
              onSearchChange={handleSearchChange}
              onSortChange={handleSortChange}
              onToggleFilter={handleToggleFilter}
              onClearFilters={handleClearFilters}
            />
          )}
        </aside>
      </div>

      {isNarrowFiltersViewport && (
        <ActionModal
          isOpen={isFiltersExpanded}
          title="Filters"
          description="Narrow your results and sort the deck."
          confirmLabel="Apply"
          cancelLabel="Close"
          onConfirm={toggleFilters}
          onClose={toggleFilters}
        >
          <div className="dictionary-filters-modal">
            <CardCatalogFilters
              search={search}
              sort={sort}
              filters={filters}
              resultsCount={totalItems}
              levelOptions={levelOptions}
              partOfSpeechOptions={partOfSpeechOptions}
              sortOptions={SORT_OPTIONS}
              onSearchChange={handleSearchChange}
              onSortChange={handleSortChange}
              onToggleFilter={handleToggleFilter}
              onClearFilters={handleClearFilters}
            />
          </div>
        </ActionModal>
      )}
    </article>
  );
});

DeckDetailsPanel.displayName = "DeckDetailsPanel";
