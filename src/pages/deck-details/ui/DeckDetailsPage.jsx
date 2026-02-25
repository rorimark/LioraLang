import { useParams } from "react-router";
import { DeckDetailsPanel } from "@widgets";
import { useDeckDetailsPage } from "../model";

export const DeckDetailsPage = () => {
  const { deckId } = useParams();
  const {
    deck,
    isLoading,
    error,
    refreshDeckWords,
    message,
    messageVariant,
    isExporting,
    exportDeck,
    clearMessage,
    isNarrowFiltersViewport,
    isFiltersExpanded,
    toggleFilters,
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
  } = useDeckDetailsPage(deckId);

  return (
    <section className="page">
      <DeckDetailsPanel
        deck={deck}
        isLoading={isLoading}
        error={error}
        onRetry={refreshDeckWords}
        message={message}
        messageVariant={messageVariant}
        isExporting={isExporting}
        onExport={exportDeck}
        onRefresh={refreshDeckWords}
        onCloseMessage={clearMessage}
        isNarrowFiltersViewport={isNarrowFiltersViewport}
        isFiltersExpanded={isFiltersExpanded}
        onToggleFilters={toggleFilters}
        search={search}
        sort={sort}
        filters={filters}
        levelOptions={levelOptions}
        partOfSpeechOptions={partOfSpeechOptions}
        paginatedWords={paginatedWords}
        totalItems={totalItems}
        totalPages={totalPages}
        resolvedPage={resolvedPage}
        pageSize={pageSize}
        visibleRange={visibleRange}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onToggleFilter={handleToggleFilter}
        onClearFilters={handleClearFilters}
      />
    </section>
  );
};

export default DeckDetailsPage;
