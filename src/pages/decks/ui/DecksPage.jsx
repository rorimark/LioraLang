import { DecksOverviewPanel } from "@widgets";
import { useDecksPage } from "../model";

export const DecksPage = () => {
  const {
    decks,
    isLoading,
    error,
    message,
    messageVariant,
    exportingDeckId,
    renamingDeckId,
    deletingDeckId,
    renameState,
    deleteState,
    refreshDecks,
    openDeck,
    exportDeck,
    openDeleteModal,
    closeDeleteModal,
    confirmDeleteDeck,
    openRenameModal,
    closeRenameModal,
    handleRenameValueChange,
    confirmRenameDeck,
    clearMessage,
  } = useDecksPage();

  return (
    <section className="page">
      <DecksOverviewPanel
        decks={decks}
        isLoading={isLoading}
        error={error}
        message={message}
        messageVariant={messageVariant}
        exportingDeckId={exportingDeckId}
        renamingDeckId={renamingDeckId}
        deletingDeckId={deletingDeckId}
        renameState={renameState}
        deleteState={deleteState}
        onOpenDeck={openDeck}
        onExportDeck={exportDeck}
        onOpenDeleteModal={openDeleteModal}
        onCloseDeleteModal={closeDeleteModal}
        onConfirmDeleteDeck={confirmDeleteDeck}
        onOpenRenameModal={openRenameModal}
        onCloseRenameModal={closeRenameModal}
        onRenameValueChange={handleRenameValueChange}
        onConfirmRenameDeck={confirmRenameDeck}
        onRefresh={refreshDecks}
        onCloseMessage={clearMessage}
      />
    </section>
  );
};

export default DecksPage;
