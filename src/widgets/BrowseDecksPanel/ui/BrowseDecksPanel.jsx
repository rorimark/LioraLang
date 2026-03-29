import { memo, useMemo } from "react";
import { CardCatalogPagination } from "@features/card-catalog";
import { Button, InlineAlert, Panel, TextInput } from "@shared/ui";
import { useBrowseDecksPanel } from "../model";
import { BrowseDeckCardList } from "./BrowseDeckCardList";
import "./BrowseDecksPanel.css";

export const BrowseDecksPanel = memo(() => {
  const panel = useBrowseDecksPanel();
  const deckList = useMemo(
    () => ({
      decks: panel.decks,
      pendingState: {
        importingDeckId: panel.importingDeckId,
        deletingDeckId: panel.deletingDeckId,
      },
      permissions: {
        canDeleteHubDecks: panel.canDeleteHubDecks,
      },
      actions: {
        onImportDeck: panel.importDeckFromHub,
        onCopyLink: panel.copyDeckLink,
        onDeleteDeck: panel.deleteDeckFromHub,
      },
    }),
    [
      panel.canDeleteHubDecks,
      panel.copyDeckLink,
      panel.decks,
      panel.deleteDeckFromHub,
      panel.deletingDeckId,
      panel.importDeckFromHub,
      panel.importingDeckId,
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

  const isSearchActive = Boolean(panel.searchInput.trim());

  return (
    <Panel className="browse-decks-panel">
      {/* <header className="browse-decks-panel__header">
        <div className="browse-decks-panel__titles">
          <h2>Browse Community Decks</h2>
          <p>
            Discover ready-made decks from LioraLangHub and import them in one click.
          </p>
        </div>
        <button
          type="button"
          className="browse-decks-panel__refresh"
          onClick={refreshDecks}
          disabled={!isConfigured || isLoading}
        >
          Refresh
        </button>
      </header> */}

      <InlineAlert alert={statusAlert} />

      {!panel.isConfigured ? (
        <div className="browse-decks-panel__warning">
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> to your{" "}
          <code>.env</code>.
        </div>
      ) : null}

      {panel.isConfigured ? (
        <div className="browse-decks-panel__toolbar">
          <label className="browse-decks-panel__search" htmlFor="browse-search">
            <span className="sr-only">Search decks</span>
            <TextInput
              id="browse-search"
              type="search"
              placeholder="Search decks by title..."
              value={panel.searchInput}
              onChange={panel.handleSearchInputChange}
            />
          </label>
          <Button
            className="browse-decks-panel__clear"
            onClick={panel.clearSearch}
            disabled={!isSearchActive}
            size="sm"
          >
            Clear
          </Button>
        </div>
      ) : null}

      {panel.error ? <div className="browse-decks-panel__error">{panel.error}</div> : null}

      {panel.isConfigured && panel.isLoading ? (
        <div className="browse-decks-panel__loading">
          Loading community decks...
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
    </Panel>
  );
});

BrowseDecksPanel.displayName = "BrowseDecksPanel";
