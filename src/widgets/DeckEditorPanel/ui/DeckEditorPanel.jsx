import { memo, useMemo } from "react";
import { FiAlertCircle, FiArrowLeft, FiCheck, FiExternalLink, FiLoader, FiPlay, FiRefreshCw } from "react-icons/fi";
import { useI18n } from "@shared/lib/i18n";
import {
  DeckEditorPanelProvider,
  useDeckEditorPanel,
  useDeckEditorPanelContext,
} from "../model";
import { DeckEditorDeckSection } from "./DeckEditorDeckSection";
import { DeckEditorWordsSection } from "./DeckEditorWordsSection";
import "./DeckEditorPanel.css";

// Where the deck's changes are: written, on their way, or stuck.
const SaveStatus = memo(() => {
  const { saveState, saveError, retrySave } = useDeckEditorPanelContext();
  const { t } = useI18n();

  if (saveState === "error") {
    return (
      <span className="deck-editor__status deck-editor__status--error" role="alert">
        <FiAlertCircle aria-hidden />
        <span>{saveError || t("editor.errors.save")}</span>
        <button type="button" onClick={retrySave}>
          {t("common.retry")}
        </button>
      </span>
    );
  }

  const isBusy = saveState === "pending" || saveState === "saving";

  return (
    <span className={`deck-editor__status${isBusy ? " is-busy" : ""}`} role="status" aria-live="polite">
      {isBusy ? <FiLoader aria-hidden /> : <FiCheck aria-hidden />}
      <span>{t(isBusy ? "editor.saving" : "editor.saved")}</span>
    </span>
  );
});

SaveStatus.displayName = "SaveStatus";

const DeckEditorPanelBody = memo(() => {
  const {
    isEditMode,
    isLoading,
    loadError,
    reloadDeck,
    deckForm,
    pictureSide,
    totalWords,
    createDeck,
    isCreating,
    createError,
    goToDecks,
    goToDeckDetails,
    goToLearn,
  } = useDeckEditorPanelContext();
  const { t, languageName } = useI18n();

  // What each side is called in the word forms and the list.
  const labels = useMemo(
    () => ({
      front: pictureSide === "source" ? t("media.label") : languageName(deckForm.sourceLanguage),
      back: pictureSide === "target" ? t("media.label") : languageName(deckForm.targetLanguage),
      tertiary: deckForm.tertiaryLanguage ? languageName(deckForm.tertiaryLanguage) : "",
    }),
    [deckForm.sourceLanguage, deckForm.targetLanguage, deckForm.tertiaryLanguage, languageName, pictureSide, t],
  );

  if (isLoading) {
    return (
      <article className="deck-editor deck-editor--message" aria-busy="true">
        <p>{t("editor.loading")}</p>
      </article>
    );
  }

  if (loadError) {
    return (
      <article className="deck-editor deck-editor--message">
        <p role="alert">{loadError}</p>
        <div className="deck-editor__actions">
          <button type="button" className="deck-editor__button deck-editor__button--primary" onClick={reloadDeck}>
            <FiRefreshCw aria-hidden />
            <span>{t("common.retry")}</span>
          </button>
          <button type="button" className="deck-editor__button" onClick={goToDecks}>
            <FiArrowLeft aria-hidden />
            <span>{t("common.backToDecks")}</span>
          </button>
        </div>
      </article>
    );
  }

  return (
    <article className={isEditMode ? "deck-editor deck-editor--editing" : "deck-editor"}>
      <header className="deck-editor__bar">
        <button type="button" className="deck-editor__back" onClick={goToDecks}>
          <FiArrowLeft aria-hidden />
          <span>{t("common.backToDecks")}</span>
        </button>
        <h2 className="sr-only">{isEditMode ? t("deck.edit") : t("decks.create")}</h2>

        <div className="deck-editor__actions">
          {isEditMode ? (
            <>
              <SaveStatus />
              <button type="button" className="deck-editor__button deck-editor__button--quiet" onClick={goToDeckDetails}>
                <FiExternalLink aria-hidden />
                <span>{t("editor.openDetails")}</span>
              </button>
              <button
                type="button"
                className="deck-editor__button deck-editor__button--primary"
                onClick={goToLearn}
                disabled={totalWords === 0}
              >
                <FiPlay aria-hidden />
                <span>{t("editor.study")}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="deck-editor__button deck-editor__button--primary"
              onClick={createDeck}
              disabled={isCreating}
            >
              <FiCheck aria-hidden />
              <span>{t(isCreating ? "editor.creating" : "editor.create")}</span>
            </button>
          )}
        </div>
      </header>

      {createError ? (
        <p className="deck-editor__alert" role="alert">
          <FiAlertCircle aria-hidden />
          <span>{createError}</span>
        </p>
      ) : null}

      <div className="deck-editor__layout">
        <DeckEditorDeckSection />
        <DeckEditorWordsSection labels={labels} />
      </div>

      {isEditMode ? null : (
        <footer className="deck-editor__create">
          <p>{t("editor.createHint", { count: totalWords })}</p>
          <button
            type="button"
            className="deck-editor__button deck-editor__button--primary"
            onClick={createDeck}
            disabled={isCreating}
          >
            <FiCheck aria-hidden />
            <span>{t(isCreating ? "editor.creating" : "editor.create")}</span>
          </button>
        </footer>
      )}
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
