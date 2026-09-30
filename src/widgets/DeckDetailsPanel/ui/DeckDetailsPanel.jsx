import { memo, useCallback, useMemo, useState } from "react";
import {
  FiArrowLeft,
  FiDownload,
  FiEdit3,
  FiPlus,
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
import { QuickAddWordsDialog } from "@features/quick-add-words";
import { ActionModal, InlineAlert } from "@shared/ui";
import { useDeckDetailsPanel } from "../model";
import "./DeckDetailsPanel.css";
import { useI18n } from "@shared/lib/i18n";

const DeckLoadingState = memo(() => {
  const { t } = useI18n();
  return <article className="panel cards-panel">{t("deck.loading")}</article>;
});

DeckLoadingState.displayName = "DeckLoadingState";

export const DeckDetailsPanel = memo(() => {
  const panel = useDeckDetailsPanel();
  const { t } = useI18n();
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const { refreshDeckWords } = panel;
  const closeQuickAdd = useCallback(
    ({ addedTotal = 0 } = {}) => {
      setIsQuickAddOpen(false);

      if (addedTotal > 0) {
        void refreshDeckWords();
      }
    },
    [refreshDeckWords],
  );

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
      title: t("catalog.filters"),
      description: t("catalog.filtersDescription"),
      confirmLabel: t("catalog.apply"),
      cancelLabel: t("common.close"),
      onConfirm: panel.toggleFilters,
      onClose: panel.toggleFilters,
    }),
    [panel.isFiltersExpanded, panel.toggleFilters, t],
  );

  if (panel.isLoading) {
    return <DeckLoadingState />;
  }

  if (panel.error || !panel.deck) {
    return (
      <article className="panel cards-panel">
        <div className="cards-panel__status cards-panel__status--error">
          {panel.error || t("decks.errors.notFound")}
        </div>
        <button
          type="button"
          className="cards-panel__retry"
          onClick={panel.refreshDeckWords}
        >
          {t("common.retry")}
        </button>
      </article>
    );
  }

  return (
    <article className="panel cards-panel">
      <div className="cards-panel__header">
        <h2>{panel.deck.name}</h2>
        <p>{panel.deck.description || t("deck.noDescription")}</p>
      </div>

      <div className="cards-panel__actions">
        <button
          type="button"
          className="cards-panel__button--secondary"
          onClick={panel.openDecksOverview}
        >
          <FiArrowLeft aria-hidden />
          <span>{t("common.backToDecks")}</span>
        </button>
        <button
          type="button"
          className="cards-panel__button--primary"
          onClick={() => setIsQuickAddOpen(true)}
          aria-haspopup="dialog"
        >
          <FiPlus aria-hidden />
          <span>{t("quickAdd.open")}</span>
        </button>
        <button type="button" onClick={panel.openEditDeck}>
          <FiEdit3 aria-hidden />
          <span>{t("deck.edit")}</span>
        </button>
        <button type="button" onClick={panel.exportDeck} disabled={panel.isExporting}>
          <FiDownload aria-hidden />
          <span>{panel.isExporting ? t("decks.table.exporting") : t("deck.export")}</span>
        </button>
        <button type="button" onClick={panel.refreshDeckWords}>
          <FiRefreshCw aria-hidden />
          <span>{t("deck.refreshWords")}</span>
        </button>
        {panel.isNarrowFiltersViewport && (
          <button
            type="button"
            className="cards-panel__filters-button"
            onClick={panel.toggleFilters}
            aria-expanded={panel.isFiltersExpanded}
          >
            <FiSliders aria-hidden />
            <span>{panel.isFiltersExpanded ? t("catalog.hideFilters") : t("catalog.showFilters")}</span>
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

      {isQuickAddOpen ? (
        <QuickAddWordsDialog
          initialDeckId={panel.deck.id}
          onClose={closeQuickAdd}
        />
      ) : null}

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
