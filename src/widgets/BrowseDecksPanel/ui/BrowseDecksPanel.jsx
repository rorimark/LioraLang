import { memo, useMemo } from "react";
import { PostImportChoiceModal } from "@features/deck-import";
import { CardCatalogPagination } from "@features/card-catalog";
import { InlineAlert, Panel, SearchField } from "@shared/ui";
import { useHubLibraryIndex } from "@entities/deck";
import { useBrowseDecksPanel } from "../model";
import { BrowseDeckCardList } from "./BrowseDeckCardList";
import "./BrowseDecksPanel.css";
import { useI18n } from "@shared/lib/i18n";

export const BrowseDecksPanel = memo(() => {
  const panel = useBrowseDecksPanel();
  const { t } = useI18n();
  const library = useHubLibraryIndex();
  const deckList = useMemo(
    () => ({
      decks: panel.decks,
      library,
      pendingState: {
        importingDeckId: panel.importingDeckId,
      },
      actions: {
        onImportDeck: panel.importDeckFromHub,
        onCopyLink: panel.copyDeckLink,
      },
    }),
    [
      panel.copyDeckLink,
      panel.decks,
      panel.importDeckFromHub,
      panel.importingDeckId,
      library,
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
  const pagination = useMemo(
    () => ({
      currentPage: panel.currentPage,
      totalPages: panel.totalPages,
      pageSize: panel.decks.length,
      pageSizeOptions: [],
      totalItems: panel.totalDecks,
      rangeStart: panel.visibleRange.start,
      rangeEnd: panel.visibleRange.end,
      onPageChange: panel.handlePageChange,
    }),
    [
      panel.currentPage,
      panel.decks.length,
      panel.handlePageChange,
      panel.totalDecks,
      panel.totalPages,
      panel.visibleRange.end,
      panel.visibleRange.start,
    ],
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
    <Panel className="browse-decks-panel">

      <InlineAlert alert={statusAlert} />

      {!panel.isConfigured ? (
        <div className="browse-decks-panel__warning">
          {t("hub.notConfigured")}
        </div>
      ) : null}

      {panel.isConfigured ? (
        <div className="browse-decks-panel__toolbar">
          <SearchField
            id="browse-search"
            className="browse-decks-panel__search"
            value={panel.searchInput}
            onChange={panel.handleSearchInputChange}
            onClear={panel.clearSearch}
            placeholder={t("browse.searchPlaceholder")}
            ariaLabel={t("decks.search")}
          />
        </div>
      ) : null}

      {panel.error ? <div className="browse-decks-panel__error">{panel.error}</div> : null}

      {panel.isConfigured && panel.isLoading ? (
        <div className="browse-decks-panel__loading">
          {t("browse.loading")}
        </div>
      ) : null}

      {panel.isConfigured && !panel.isLoading && !panel.error ? (
        <BrowseDeckCardList deckList={deckList} />
      ) : null}

      {panel.isConfigured ? (
        <footer className="browse-decks-panel__pagination">
          <CardCatalogPagination pagination={pagination} />
        </footer>
      ) : null}

      <PostImportChoiceModal modal={postImportModal} />
    </Panel>
  );
});

BrowseDecksPanel.displayName = "BrowseDecksPanel";
