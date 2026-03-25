import { memo, useMemo } from "react";
import { FiArrowLeft, FiLink } from "react-icons/fi";
import { WordsTable } from "@entities/word";
import {
  CardCatalogFilters,
  CardCatalogPagination,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from "@features/card-catalog";
import { ActionModal, Button, InlineAlert, MetaBadge, Panel } from "@shared/ui";
import { useBrowseDeckDetailsPanel } from "../model";
import "@widgets/BrowseDecksPanel/ui/BrowseDecksPanel.css";
import "@widgets/DeckDetailsPanel/ui/DeckDetailsPanel.css";
import "./BrowseDeckDetailsPanel.css";

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

export const BrowseDeckDetailsPanel = memo(({ deckSlug = "" }) => {
  const {
    deck,
    isLoading,
    error,
    isConfigured,
    message,
    messageVariant,
    importing,
    refreshDeck,
    importDeckFromHub,
    copyDeckLink,
    openBrowseDecks,
    clearMessage,
    previewWords,
    previewLanguages,
    isPreviewLoading,
    previewError,
    isNarrowFiltersViewport,
    isFiltersExpanded,
    toggleFilters,
    search,
    sort,
    filters,
    levelOptions,
    partOfSpeechOptions,
    tagOptions,
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
  } = useBrowseDeckDetailsPanel(deckSlug);

  const derived = useMemo(() => {
    const tags = normalizeTags(deck?.tags);
    const languages = Array.isArray(deck?.languages) ? deck.languages : [];

    return {
      tags,
      languages,
      createdAt: formatDate(deck?.createdAt),
      fileSize: formatFileSize(deck?.latestVersion?.fileSizeBytes),
      wordsCount: Number.isFinite(Number(deck?.wordsCount)) ? Number(deck.wordsCount) : 0,
      downloadsCount: Number.isFinite(Number(deck?.downloadsCount))
        ? Number(deck.downloadsCount)
        : 0,
      hasDescription:
        typeof deck?.description === "string" && deck.description.trim().length > 0,
      updatedAt: formatDate(deck?.latestVersion?.createdAt || deck?.createdAt),
    };
  }, [deck]);

  const showsWordLevels = levelOptions.length > 0;

  return (
    <Panel className="browse-deck-details">
      <div className="browse-deck-details__header">
        <Button
          variant="secondary"
          className="browse-deck-details__back-button"
          onClick={openBrowseDecks}
        >
          <FiArrowLeft />
          Back to Browse
        </Button>
        <Button
          variant="secondary"
          onClick={refreshDeck}
          disabled={!isConfigured || isLoading}
        >
          Refresh
        </Button>
      </div>

      <InlineAlert
        text={message}
        variant={messageVariant}
        onClose={clearMessage}
      />

      {!isConfigured ? (
        <div className="browse-deck-details__warning">
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> to your <code>.env</code>.
        </div>
      ) : null}

      {error ? <div className="browse-deck-details__error">{error}</div> : null}

      {isConfigured && isLoading ? (
        <div className="browse-deck-details__loading">Loading community deck...</div>
      ) : null}

      {isConfigured && !isLoading && !error && deck ? (
        <article className="browse-decks-panel__card browse-deck-details__card">
          <header className="browse-decks-panel__card-head">
            <div className="browse-deck-details__title">
              <div className="browse-deck-details__title-row">
                <h2>{deck?.title || "Untitled deck"}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="browse-deck-details__copy-link"
                  onClick={copyDeckLink}
                  aria-label="Copy public deck link"
                  title="Copy public deck link"
                >
                  <FiLink />
                </Button>
              </div>
              <span className="browse-decks-panel__card-meta">
                Added {derived.createdAt}
              </span>
            </div>
          </header>

          <p
            className={
              derived.hasDescription
                ? "browse-decks-panel__description"
                : "browse-decks-panel__description browse-decks-panel__description--empty"
            }
            aria-hidden={!derived.hasDescription}
          >
            {derived.hasDescription ? deck.description : "\u00A0"}
          </p>

          <div className="browse-decks-panel__card-footer">
            <div className="browse-decks-panel__badges">
              {derived.languages.map((language) => (
                <MetaBadge
                  key={`${deck.id}-lang-${language}`}
                  text={language}
                  accent={false}
                />
              ))}
              {derived.tags.map((tag) => (
                <MetaBadge
                  key={`${deck.id}-tag-${tag}`}
                  text={tag}
                  accent={false}
                />
              ))}
            </div>

            <dl className="browse-decks-panel__stats">
              <div>
                <dt>Words</dt>
                <dd>{derived.wordsCount}</dd>
              </div>
              <div>
                <dt>Downloads</dt>
                <dd>{derived.downloadsCount}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{derived.updatedAt}</dd>
              </div>
              <div>
                <dt>Package</dt>
                <dd>{derived.fileSize}</dd>
              </div>
            </dl>
          </div>

          <div className="browse-decks-panel__actions browse-decks-panel__actions--single">
            <Button
              onClick={importDeckFromHub}
              disabled={importing || !deck?.latestVersion?.filePath}
              variant="primary"
            >
              {importing ? "Importing..." : "Import to Decks"}
            </Button>
          </div>
        </article>
      ) : null}

      {isConfigured && !isLoading && !error && deck ? (
        <>
          <header className="browse-deck-details__preview-head">
            <h3>Words preview</h3>
            <span>{totalItems} words</span>
          </header>

          {isPreviewLoading ? (
            <div className="browse-deck-details__loading">
              Loading deck words...
            </div>
          ) : previewError ? (
            <div className="browse-deck-details__error">{previewError}</div>
          ) : (
            <>
              {isNarrowFiltersViewport && (
                <div className="browse-deck-details__preview-actions">
                  <Button
                    className="cards-panel__filters-button"
                    onClick={toggleFilters}
                    aria-expanded={isFiltersExpanded}
                  >
                    {isFiltersExpanded ? "Hide filters" : "Show filters"}
                  </Button>
                </div>
              )}

              <div className="dictionary-workspace">
                <div className="dictionary-table-area">
                  <WordsTable
                    words={paginatedWords}
                    languageLabels={previewLanguages}
                    showLevelColumn={showsWordLevels}
                  />

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
                      levelOptions={showsWordLevels ? levelOptions : []}
                      partOfSpeechOptions={partOfSpeechOptions}
                      tagOptions={tagOptions}
                      sortOptions={SORT_OPTIONS}
                      onSearchChange={handleSearchChange}
                      onSortChange={handleSortChange}
                      onToggleFilter={handleToggleFilter}
                      onClearFilters={handleClearFilters}
                    />
                  )}
                </aside>
              </div>
            </>
          )}
        </>
      ) : null}

      {isConfigured && !isLoading && !error && deck && isNarrowFiltersViewport ? (
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
              levelOptions={showsWordLevels ? levelOptions : []}
              partOfSpeechOptions={partOfSpeechOptions}
              tagOptions={tagOptions}
              sortOptions={SORT_OPTIONS}
              onSearchChange={handleSearchChange}
              onSortChange={handleSortChange}
              onToggleFilter={handleToggleFilter}
              onClearFilters={handleClearFilters}
            />
          </div>
        </ActionModal>
      ) : null}
    </Panel>
  );
});

BrowseDeckDetailsPanel.displayName = "BrowseDeckDetailsPanel";
