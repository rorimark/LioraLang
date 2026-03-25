import { memo, useMemo } from "react";
import { InlineAlert } from "@shared/ui";
import {
  DeckEditorPanelProvider,
  useDeckEditorPanelContext,
  useDeckEditorPanel,
} from "../model";
import { DeckEditorSettingsSection } from "./DeckEditorSettingsSection";
import { DeckEditorWordFormSection } from "./DeckEditorWordFormSection";
import { DeckEditorWordsTableSection } from "./DeckEditorWordsTableSection";
import "./DeckEditorPanel.css";

const DeckEditorPanelBody = memo(() => {
  const {
    isEditMode,
    isLoading,
    isSaving,
    loadError,
    statusMessage,
    statusVariant,
    clearStatus,
    handleSaveDeck,
    goToDecks,
    goToDeckDetails,
    reloadDeck,
  } = useDeckEditorPanelContext();
  const statusAlert = useMemo(
    () => ({
      text: statusMessage,
      variant: statusVariant,
      onClose: clearStatus,
    }),
    [clearStatus, statusMessage, statusVariant],
  );

  if (isLoading) {
    return <article className="panel deck-editor-panel">Loading deck editor...</article>;
  }

  if (loadError) {
    return (
      <article className="panel deck-editor-panel">
        <div className="deck-editor-panel__error">{loadError}</div>
        <div className="deck-editor-panel__toolbar">
          <button type="button" onClick={reloadDeck}>
            Retry
          </button>
          <button
            type="button"
            className="deck-editor-panel__button--secondary"
            onClick={goToDecks}
          >
            Back to decks
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className="panel deck-editor-panel">
      <header className="deck-editor-panel__header">
        <div>
          <h2>{isEditMode ? "Edit deck" : "Create deck"}</h2>
          <p>
            {isEditMode
              ? "Update deck settings and maintain words."
              : "Build a new deck and fill it with words."}
          </p>
        </div>

        <div className="deck-editor-panel__toolbar">
          <button
            type="button"
            className="deck-editor-panel__button--secondary"
            onClick={goToDecks}
          >
            Back to decks
          </button>
          {isEditMode && (
            <button
              type="button"
              className="deck-editor-panel__button--secondary"
              onClick={goToDeckDetails}
            >
              Open details
            </button>
          )}
          <button type="button" onClick={handleSaveDeck} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save deck"}
          </button>
        </div>
      </header>

      <InlineAlert alert={statusAlert} />

      <DeckEditorSettingsSection />
      <DeckEditorWordFormSection />
      <DeckEditorWordsTableSection />
    </article>
  );
});

DeckEditorPanelBody.displayName = "DeckEditorPanelBody";

export const DeckEditorPanel = memo(() => {
  const model = useDeckEditorPanel();

  return (
    <DeckEditorPanelProvider value={model}>
      <DeckEditorPanelBody />
    </DeckEditorPanelProvider>
  );
});

DeckEditorPanel.displayName = "DeckEditorPanel";
