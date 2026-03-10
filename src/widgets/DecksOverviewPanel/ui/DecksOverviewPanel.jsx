import { memo } from "react";
import { DecksTable } from "@entities/deck";
import { CreateDeckFromJsonModal, ImportDeckModal } from "@features/deck-import";
import { DeleteDeckModal } from "@features/deck-delete";
import { InlineAlert } from "@shared/ui";
import { useDecksOverviewPanel } from "../model";
import "./DecksOverviewPanel.css";

export const DecksOverviewPanel = memo(() => {
  const {
    decks,
    isLoading,
    error,
    message,
    messageVariant,
    publishingDeckId,
    exportingDeckId,
    deletingDeckId,
    isImporting,
    selectedImportFileName,
    selectedImportWordsCount,
    importDeckNameDraft,
    importLanguages,
    languageOptions,
    isImportConfirmOpen,
    isLanguageReviewOpen,
    isJsonImportOpen,
    jsonDeckNameDraft,
    pasteTextDraft,
    pasteError,
    deleteState,
    openDeck,
    openCreateDeck,
    openEditDeck,
    publishDeck,
    exportDeck,
    openDeleteModal,
    closeDeleteModal,
    confirmDeleteDeck,
    openImportConfirm,
    openJsonImport,
    closeImportConfirm,
    closeJsonImport,
    openLanguageReview,
    closeLanguageReview,
    toggleLanguageReview,
    confirmImportDeck,
    handleImportDeckNameDraftChange,
    handleImportLanguageChange,
    handlePasteTextChange,
    handleJsonDeckNameChange,
    importFromPaste,
    refreshDecks,
    clearMessage,
  } = useDecksOverviewPanel();

  return (
    <article className="panel decks-page-panel">
      <div className="decks-page-panel__header">
        <h2>Your Decks</h2>
        <div className="decks-page-panel__controls">
          <button
            type="button"
            className="decks-page-panel__refresh"
            onClick={openCreateDeck}
          >
            Create deck
          </button>
          <button
            type="button"
            className="decks-page-panel__refresh"
            onClick={openImportConfirm}
            disabled={isImporting}
          >
            {isImporting ? "Importing..." : "Import deck file"}
          </button>
          <button
            type="button"
            className="decks-page-panel__refresh"
            onClick={openJsonImport}
            disabled={isImporting}
          >
            Create deck from JSON
          </button>
          <button
            type="button"
            className="decks-page-panel__refresh"
            onClick={refreshDecks}
          >
            Refresh decks
          </button>
        </div>
      </div>

      <InlineAlert
        text={message}
        variant={messageVariant}
        onClose={clearMessage}
      />

      {error && (
        <div className="decks-page-panel__message decks-page-panel__message--error">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="decks-page-panel__loading">Loading decks...</div>
      ) : (
        <DecksTable
          decks={decks}
          onOpenDeck={openDeck}
          onEditDeck={openEditDeck}
          onPublishDeck={publishDeck}
          onExportDeck={exportDeck}
          onDeleteDeck={openDeleteModal}
          publishingDeckId={publishingDeckId}
          exportingDeckId={exportingDeckId}
          deletingDeckId={deletingDeckId}
        />
      )}

      <DeleteDeckModal
        isOpen={deleteState?.isOpen}
        deckName={deleteState?.deckName || ""}
        isDeleting={Boolean(deletingDeckId)}
        onConfirm={confirmDeleteDeck}
        onClose={closeDeleteModal}
      />

      <ImportDeckModal
        isOpen={isImportConfirmOpen}
        isImporting={isImporting}
        selectedFileName={selectedImportFileName}
        selectedWordsCount={selectedImportWordsCount}
        deckNameDraft={importDeckNameDraft}
        importLanguages={importLanguages}
        languageOptions={languageOptions}
        isLanguageReviewOpen={isLanguageReviewOpen}
        onDeckNameChange={handleImportDeckNameDraftChange}
        onLanguageChange={handleImportLanguageChange}
        onOpenLanguageReview={openLanguageReview}
        onCloseLanguageReview={closeLanguageReview}
        onToggleLanguageReview={toggleLanguageReview}
        onConfirm={confirmImportDeck}
        onClose={closeImportConfirm}
      />

      <CreateDeckFromJsonModal
        isOpen={isJsonImportOpen}
        isImporting={isImporting}
        deckNameDraft={jsonDeckNameDraft}
        jsonText={pasteTextDraft}
        jsonError={pasteError}
        onDeckNameChange={handleJsonDeckNameChange}
        onJsonTextChange={handlePasteTextChange}
        onConfirm={importFromPaste}
        onClose={closeJsonImport}
      />
    </article>
  );
});

DecksOverviewPanel.displayName = "DecksOverviewPanel";
