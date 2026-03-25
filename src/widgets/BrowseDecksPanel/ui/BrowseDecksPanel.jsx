import { memo } from "react";
import { Button, InlineAlert, Panel, TextInput } from "@shared/ui";
import { useBrowseDecksPanel } from "../model";
import { BrowseDeckCardList } from "./BrowseDeckCardList";
import "./BrowseDecksPanel.css";

export const BrowseDecksPanel = memo(() => {
  const {
    decks,
    isLoading,
    error,
    isConfigured,
    searchInput,
    currentPage,
    totalPages,
    totalDecks,
    importingDeckId,
    deletingDeckId,
    canDeleteHubDecks,
    message,
    messageVariant,
    handleSearchInputChange,
    clearSearch,
    goToPreviousPage,
    goToNextPage,
    importDeckFromHub,
    copyDeckLink,
    deleteDeckFromHub,
    clearMessage,
  } = useBrowseDecksPanel();

  const isSearchActive = Boolean(searchInput.trim());

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

      <InlineAlert
        text={message}
        variant={messageVariant}
        onClose={clearMessage}
      />

      {!isConfigured ? (
        <div className="browse-decks-panel__warning">
          Supabase is not configured. Add <code>VITE_SUPABASE_URL</code> and{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY</code> to your{" "}
          <code>.env</code>.
        </div>
      ) : null}

      {isConfigured ? (
        <div className="browse-decks-panel__toolbar">
          <label className="browse-decks-panel__search" htmlFor="browse-search">
            <span className="sr-only">Search decks</span>
            <TextInput
              id="browse-search"
              type="search"
              placeholder="Search decks by title..."
              value={searchInput}
              onChange={handleSearchInputChange}
            />
          </label>
          <Button
            className="browse-decks-panel__clear"
            onClick={clearSearch}
            disabled={!isSearchActive}
            size="sm"
          >
            Clear
          </Button>
        </div>
      ) : null}

      {error ? <div className="browse-decks-panel__error">{error}</div> : null}

      {isConfigured && isLoading ? (
        <div className="browse-decks-panel__loading">
          Loading community decks...
        </div>
      ) : null}

      {isConfigured && !isLoading && !error ? (
        <BrowseDeckCardList
          decks={decks}
          importingDeckId={importingDeckId}
          deletingDeckId={deletingDeckId}
          canDeleteHubDecks={canDeleteHubDecks}
          onImportDeck={importDeckFromHub}
          onCopyLink={copyDeckLink}
          onDeleteDeck={deleteDeckFromHub}
        />
      ) : null}

      {isConfigured ? (
        <footer className="browse-decks-panel__pagination">
          <span>
            {totalDecks > 0
              ? `Page ${currentPage} of ${totalPages} • ${totalDecks} decks`
              : "No decks available"}
          </span>
          <div className="browse-decks-panel__pagination-actions">
            <Button
              onClick={goToPreviousPage}
              disabled={currentPage <= 1 || isLoading}
              size="sm"
            >
              Previous
            </Button>
            <Button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages || isLoading}
              size="sm"
            >
              Next
            </Button>
          </div>
        </footer>
      ) : null}
    </Panel>
  );
});

BrowseDecksPanel.displayName = "BrowseDecksPanel";
