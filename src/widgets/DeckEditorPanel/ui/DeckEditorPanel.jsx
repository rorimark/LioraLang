import { memo, useMemo } from "react";
import { FiArrowLeft, FiExternalLink, FiRefreshCw, FiSave } from "react-icons/fi";
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
            <FiRefreshCw aria-hidden />
            <span>Retry</span>
          </button>
          <button
            type="button"
            className="deck-editor-panel__button--secondary"
            onClick={goToDecks}
          >
            <FiArrowLeft aria-hidden />
            <span>Back to decks</span>
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
        </div>

        <div className="deck-editor-panel__toolbar">
          <button
            type="button"
            className="deck-editor-panel__button--secondary"
            onClick={goToDecks}
          >
            <FiArrowLeft aria-hidden />
            <span>Back to decks</span>
          </button>
          {isEditMode && (
            <button
              type="button"
              className="deck-editor-panel__button--secondary"
              onClick={goToDeckDetails}
            >
              <FiExternalLink aria-hidden />
              <span>Open details</span>
            </button>
          )}
          <button type="button" onClick={handleSaveDeck} disabled={isSaving}>
            <FiSave aria-hidden />
            <span>{isSaving ? "Saving..." : "Save deck"}</span>
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
