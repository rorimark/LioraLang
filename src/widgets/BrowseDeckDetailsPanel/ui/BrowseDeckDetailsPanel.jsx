import { memo, useMemo } from "react";
import {
  FiArrowLeft,
  FiCalendar,
  FiDownload,
  FiFilter,
  FiHardDrive,
  FiLink,
  FiPackage,
  FiRefreshCw,
  FiType,
} from "react-icons/fi";
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
  const panel = useBrowseDeckDetailsPanel(deckSlug);

  const derived = useMemo(() => {
    const tags = normalizeTags(panel.deck?.tags);
    const languages = Array.isArray(panel.deck?.languages) ? panel.deck.languages : [];

    return {
      tags,
      languages,
      createdAt: formatDate(panel.deck?.createdAt),
      fileSize: formatFileSize(panel.deck?.latestVersion?.fileSizeBytes),
      wordsCount: Number.isFinite(Number(panel.deck?.wordsCount))
        ? Number(panel.deck.wordsCount)
        : 0,
      downloadsCount: Number.isFinite(Number(panel.deck?.downloadsCount))
        ? Number(panel.deck.downloadsCount)
        : 0,
      hasDescription:
        typeof panel.deck?.description === "string"
        && panel.deck.description.trim().length > 0,
      updatedAt: formatDate(panel.deck?.latestVersion?.createdAt || panel.deck?.createdAt),
    };
  }, [panel.deck]);

  const showsWordLevels = panel.levelOptions.length > 0;
  const filterCatalog = useMemo(
    () => ({
      search: panel.search,
      sort: panel.sort,
      filters: panel.filters,
      resultsCount: panel.totalItems,
      levelOptions: showsWordLevels ? panel.levelOptions : [],
      partOfSpeechOptions: panel.partOfSpeechOptions,
      tagOptions: panel.tagOptions,
      sortOptions: SORT_OPTIONS,
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

  return (
    <Panel className="browse-deck-details">
      <div className="browse-deck-details__header">
        <Button
          variant="secondary"
          className="browse-deck-details__back-button"
          onClick={panel.openBrowseDecks}
        >
          <FiArrowLeft />
          Back to Browse
        </Button>
        <Button
          variant="secondary"
          onClick={panel.refreshDeck}
          disabled={!panel.isConfigured || panel.isLoading}
        >
          <FiRefreshCw aria-hidden />
          <span>Refresh</span>
        </Button>
      </div>

      <InlineAlert alert={statusAlert} />

      {!panel.isConfigured ? (
        <div className="browse-deck-details__warning">
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> to your <code>.env</code>.
        </div>
      ) : null}

      {panel.error ? <div className="browse-deck-details__error">{panel.error}</div> : null}

      {panel.isConfigured && panel.isLoading ? (
        <div className="browse-deck-details__loading">Loading community deck...</div>
      ) : null}

      {panel.isConfigured && !panel.isLoading && !panel.error && panel.deck ? (
        <article className="browse-decks-panel__card browse-deck-details__card">
          <header className="browse-decks-panel__card-head">
            <div className="browse-deck-details__title">
              <div className="browse-deck-details__title-row">
                <h2>{panel.deck.title || "Untitled deck"}</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="browse-deck-details__copy-link"
                  onClick={panel.copyDeckLink}
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
            {derived.hasDescription ? panel.deck.description : "\u00A0"}
          </p>

          <div className="browse-decks-panel__card-footer">
            <div className="browse-decks-panel__badges">
              {derived.languages.map((language) => (
                <MetaBadge
                  key={`${panel.deck.id}-lang-${language}`}
                  text={language}
                  accent={false}
                />
              ))}
              {derived.tags.map((tag) => (
                <MetaBadge
                  key={`${panel.deck.id}-tag-${tag}`}
                  text={tag}
                  accent={false}
                />
              ))}
            </div>

            <dl className="browse-decks-panel__stats">
              <div>
                <dt>
                  <FiType aria-hidden />
                  <span>Words</span>
                </dt>
                <dd>{derived.wordsCount}</dd>
              </div>
              <div>
                <dt>
                  <FiDownload aria-hidden />
                  <span>Downloads</span>
                </dt>
                <dd>{derived.downloadsCount}</dd>
              </div>
              <div>
                <dt>
                  <FiCalendar aria-hidden />
                  <span>Updated</span>
                </dt>
                <dd>{derived.updatedAt}</dd>
              </div>
              <div>
                <dt>
                  <FiPackage aria-hidden />
                  <span>Package</span>
                </dt>
                <dd>{derived.fileSize}</dd>
              </div>
            </dl>
          </div>

          <div className="browse-decks-panel__actions browse-decks-panel__actions--single">
            <Button
              onClick={panel.importDeckFromHub}
              disabled={panel.importing || !panel.deck.latestVersion?.filePath}
              variant="primary"
            >
              {panel.importing ? <FiHardDrive aria-hidden /> : <FiDownload aria-hidden />}
              <span>{panel.importing ? "Importing..." : "Import to Decks"}</span>
            </Button>
          </div>
        </article>
      ) : null}

      {panel.isConfigured && !panel.isLoading && !panel.error && panel.deck ? (
        <>
          <header className="browse-deck-details__preview-head">
            <h3>
              <FiType aria-hidden />
              <span>Words preview</span>
            </h3>
            <span>{panel.totalItems} words</span>
          </header>

          {panel.isPreviewLoading ? (
            <div className="browse-deck-details__loading">
              Loading deck words...
            </div>
          ) : panel.previewError ? (
            <div className="browse-deck-details__error">{panel.previewError}</div>
          ) : (
            <>
              {panel.isNarrowFiltersViewport && (
                <div className="browse-deck-details__preview-actions">
                  <Button
                    className="cards-panel__filters-button"
                    onClick={panel.toggleFilters}
                    aria-expanded={panel.isFiltersExpanded}
                  >
                    <FiFilter aria-hidden />
                    <span>{panel.isFiltersExpanded ? "Hide filters" : "Show filters"}</span>
                  </Button>
                </div>
              )}

              <div className="dictionary-workspace">
                <div className="dictionary-table-area">
                  <WordsTable
                    words={panel.paginatedWords}
                    languageLabels={panel.previewLanguages}
                    showLevelColumn={showsWordLevels}
                  />

                  <CardCatalogPagination pagination={pagination} />
                </div>

                <aside className="dictionary-filters-aside">
                  {!panel.isNarrowFiltersViewport && (
                    <CardCatalogFilters catalog={filterCatalog} />
                  )}
                </aside>
              </div>
            </>
          )}
        </>
      ) : null}

      {panel.isConfigured
        && !panel.isLoading
        && !panel.error
        && panel.deck
        && panel.isNarrowFiltersViewport ? (
        <ActionModal
          dialog={filtersDialog}
        >
          <div className="dictionary-filters-modal">
            <CardCatalogFilters catalog={filterCatalog} />
          </div>
        </ActionModal>
      ) : null}
    </Panel>
  );
});

BrowseDeckDetailsPanel.displayName = "BrowseDeckDetailsPanel";
