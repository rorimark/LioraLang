import { memo, useMemo } from "react";
import { FiArrowLeft, FiFilter, FiLink } from "react-icons/fi";
import { DeckLanguagePair, HubDeckAction, normalizeHubTags, useHubLibraryIndex } from "@entities/deck";
import { WordsTable } from "@entities/word";
import {
  CardCatalogFilters,
  CardCatalogPagination,
  PAGE_SIZE_OPTIONS,
  SORT_OPTIONS,
} from "@features/card-catalog";
import { PostImportChoiceModal } from "@features/deck-import";
import { usePageMeta } from "@shared/lib/seo";
import { ActionModal, Button, InlineAlert, Panel } from "@shared/ui";
import { useBrowseDeckDetailsPanel } from "../model";
import "@widgets/BrowseDecksPanel/ui/BrowseDecksPanel.css";
import "@widgets/DeckDetailsPanel/ui/DeckDetailsPanel.css";
import "./BrowseDeckDetailsPanel.css";
import { useI18n } from "@shared/lib/i18n";

export const BrowseDeckDetailsPanel = memo(({ deckSlug = "" }) => {
  const panel = useBrowseDeckDetailsPanel(deckSlug);
  const { t, formatBytes, formatDate } = useI18n();

  usePageMeta({
    title: `${panel.deck?.title || t("browse.communityDeck")} - LioraLang`,
    description:
      typeof panel.deck?.description === "string" && panel.deck.description.trim().length > 0
        ? panel.deck.description.trim()
        : t("browse.metaDescription"),
  });

  const derived = useMemo(() => ({
    tags: normalizeHubTags(panel.deck?.tags, panel.deck?.languages),
    fileSize: formatBytes(panel.deck?.latestVersion?.fileSizeBytes) || t("browse.unknownSize"),
    wordsCount: Number(panel.deck?.wordsCount) || 0,
    downloadsCount: Number(panel.deck?.downloadsCount) || 0,
    hasDescription: typeof panel.deck?.description === "string" && panel.deck.description.trim().length > 0,
    updatedAt:
      formatDate(panel.deck?.latestVersion?.createdAt || panel.deck?.createdAt) || t("browse.unknownDate"),
  }), [formatBytes, formatDate, panel.deck, t]);
  const library = useHubLibraryIndex();

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
      title: t("catalog.filters"),
      description: t("catalog.filtersDescription"),
      confirmLabel: t("catalog.apply"),
      cancelLabel: t("common.close"),
      onConfirm: panel.toggleFilters,
      onClose: panel.toggleFilters,
    }),
    [panel.isFiltersExpanded, panel.toggleFilters, t],
  );
  const postImportModal = useMemo(
    () => ({
      isOpen: panel.postImportModal.isOpen,
      deckName: panel.postImportModal.deckName,
      onClose: panel.closePostImportModal,
      onContinueBrowsing: panel.closePostImportModal,
      onGoToLearn: panel.goToLearnAfterImport,
    }),
    [
      panel.closePostImportModal,
      panel.goToLearnAfterImport,
      panel.postImportModal.deckName,
      panel.postImportModal.isOpen,
    ],
  );

  return (
    <Panel className="browse-deck-details">
      <div className="browse-deck-details__header">
        <Button variant="ghost" className="browse-deck-details__back-button" onClick={panel.openBrowseDecks}>
          <FiArrowLeft aria-hidden="true" />
          <span>{t("browse.back")}</span>
        </Button>
      </div>

      <InlineAlert alert={statusAlert} />

      {!panel.isConfigured ? (
        <div className="browse-deck-details__warning">
          {t("hub.notConfigured")}
        </div>
      ) : null}

      {panel.error ? <div className="browse-deck-details__error">{panel.error}</div> : null}

      {panel.isConfigured && panel.isLoading ? (
        <div className="browse-deck-details__loading">{t("browse.loadingDeck")}</div>
      ) : null}

      {panel.isConfigured && !panel.isLoading && !panel.error && panel.deck ? (
        <article className="hub-hero">
          <header className="hub-hero__head">
            <div className="hub-hero__titles">
              <h2>{panel.deck.title || t("browse.untitled")}</h2>
              <DeckLanguagePair source={panel.deck.sourceLanguage} targets={panel.deck.targetLanguages} />
            </div>
            <div className="hub-hero__actions">
              <Button
                variant="ghost"
                className="hub-card__link"
                onClick={panel.copyDeckLink}
                aria-label={t("browse.copyLink")}
                title={t("browse.copyLink")}
              >
                <FiLink aria-hidden="true" />
              </Button>
              <HubDeckAction
                deck={panel.deck}
                localDeckId={library.get(String(panel.deck.id))}
                isImporting={panel.importing}
                onImport={panel.importDeckFromHub}
              />
            </div>
          </header>

          {derived.hasDescription ? <p className="hub-hero__description">{panel.deck.description}</p> : null}

          {derived.tags.length > 0 ? (
            <ul className="hub-card__tags hub-hero__tags" aria-label={t("decks.table.tags")}>
              {derived.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}

          <p className="hub-hero__meta">
            {[
              t("browse.wordsCount", { count: derived.wordsCount }),
              t("account.hub.downloads", { count: derived.downloadsCount }),
              t("browse.updatedOn", { date: derived.updatedAt }),
              derived.fileSize,
            ].join(" · ")}
          </p>
        </article>
      ) : null}

      {panel.isConfigured && !panel.isLoading && !panel.error && panel.deck ? (
        <>
          <header className="browse-deck-details__preview-head">
            <h3>{t("browse.preview")}</h3>
            <span>{t("browse.wordsCount", { count: panel.totalItems })}</span>
          </header>

          {panel.isPreviewLoading ? (
            <div className="browse-deck-details__loading">
              {t("browse.loadingWords")}
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
                    <span>{panel.isFiltersExpanded ? t("catalog.hideFilters") : t("catalog.showFilters")}</span>
                  </Button>
                </div>
              )}

              <div className="dictionary-workspace">
                <div className="dictionary-table-area">
                  <WordsTable
                    words={panel.paginatedWords}
                    imageSources={panel.previewImageSources}
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

      <PostImportChoiceModal modal={postImportModal} />
    </Panel>
  );
});

BrowseDeckDetailsPanel.displayName = "BrowseDeckDetailsPanel";
