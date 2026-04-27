import { memo, useMemo } from "react";
import { FiEye, FiSliders } from "react-icons/fi";
import { Flashcard } from "@features/flashcard";
import { SrsRatingControls } from "@features/srs-rating-controls";
import { useLearnFlashcardsPanel } from "../model";
import { LearnEmptyDeckState } from "./LearnEmptyDeckState";
import { LearnSessionSettingsDialog } from "./LearnSessionSettingsDialog/LearnSessionSettingsDialog";
import "./LearnFlashcardsPanel.css";

export const LearnFlashcardsPanel = memo(() => {
  const panel = useLearnFlashcardsPanel();
  const deckSelector = useMemo(
    () => ({
      selectedDeckId: panel.selectedDeckId,
      isDisabled: panel.isDecksLoading || !panel.hasDecks,
      options: panel.decks,
      onChange: panel.handleDeckSelectChange,
    }),
    [
      panel.decks,
      panel.handleDeckSelectChange,
      panel.hasDecks,
      panel.isDecksLoading,
      panel.selectedDeckId,
    ],
  );
  const browseNavigation = useMemo(
    () => ({
      canBrowsePrev: panel.canBrowsePrev,
      canBrowseNext: panel.canBrowseNext,
      onBrowsePrev: panel.handleBrowsePrev,
      onBrowseNext: panel.handleBrowseNext,
    }),
    [
      panel.canBrowseNext,
      panel.canBrowsePrev,
      panel.handleBrowseNext,
      panel.handleBrowsePrev,
    ],
  );
  const flashcard = useMemo(
    () => ({
      frontLabel: panel.cardFrontLabel,
      backLabel: panel.cardBackLabel,
      frontText: panel.cardFrontText,
      backText: panel.cardBackText,
      backMetaBadges: panel.cardMetaBadges,
      backDetails: panel.cardBackDetails,
      isFlipped: panel.isBackVisible,
      onFlip: panel.toggleBackVisibility,
      disabled: panel.isRatingPending,
    }),
    [
      panel.cardBackDetails,
      panel.cardBackLabel,
      panel.cardBackText,
      panel.cardFrontLabel,
      panel.cardFrontText,
      panel.cardMetaBadges,
      panel.isBackVisible,
      panel.isRatingPending,
      panel.toggleBackVisibility,
    ],
  );
  const sessionControl = useMemo(
    () => ({
      isOpen: panel.isSessionSettingsOpen,
      onOpen: panel.openSessionSettings,
      onClose: panel.closeSessionSettings,
      sessionSummary: panel.sessionSummary,
      learnViewMode: panel.learnViewMode,
      exerciseMode: panel.exerciseMode,
      currentDeck: panel.currentDeck,
      sessionSettings: panel.sessionSettings,
      onSwitchToBrowseMode: panel.switchToBrowseMode,
      onSwitchToSrsMode: panel.switchToSrsMode,
      onDirectionModeChange: panel.handleDirectionModeChange,
      onExerciseModeChange: panel.handleExerciseModeChange,
      onDailyGoalChange: panel.handleSessionDailyGoalChange,
      onAutoFlipDelayChange: panel.handleSessionAutoFlipDelayChange,
      onShuffleModeChange: panel.handleSessionShuffleModeChange,
      onRepeatWrongCardsChange: panel.handleSessionRepeatWrongCardsChange,
      onShowExamplesChange: panel.handleShowExamplesChange,
      onShowLevelChange: panel.handleShowLevelChange,
      onShowPartOfSpeechChange: panel.handleShowPartOfSpeechChange,
    }),
    [
      panel.closeSessionSettings,
      panel.currentDeck,
      panel.exerciseMode,
      panel.handleDirectionModeChange,
      panel.handleExerciseModeChange,
      panel.handleSessionAutoFlipDelayChange,
      panel.handleSessionDailyGoalChange,
      panel.handleSessionRepeatWrongCardsChange,
      panel.handleSessionShuffleModeChange,
      panel.handleShowExamplesChange,
      panel.handleShowLevelChange,
      panel.handleShowPartOfSpeechChange,
      panel.isSessionSettingsOpen,
      panel.learnViewMode,
      panel.openSessionSettings,
      panel.sessionSettings,
      panel.sessionSummary,
      panel.switchToBrowseMode,
      panel.switchToSrsMode,
    ],
  );

  return (
    <article className="panel learn-page-panel">
      <div className="learn-page-panel__header">
        <div className="learn-page-panel__deck-control">
          <label
            className="learn-page-panel__deck-label"
            htmlFor="learn-deck-select"
          >
            Choose deck
          </label>
          <div className="learn-page-panel__deck-row">
            <select
              id="learn-deck-select"
              value={deckSelector.selectedDeckId}
              onChange={deckSelector.onChange}
              disabled={deckSelector.isDisabled}
            >
              {!panel.hasDecks && (
                <option value="">
                  {panel.isDecksLoading ? "Loading decks..." : "No decks yet"}
                </option>
              )}
              {deckSelector.options.map((deckItem) => (
                <option key={deckItem.id} value={deckItem.id}>
                  {deckItem.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="learn-page-panel__header-actions">
          <div className="learn-page-panel__session-trigger-wrap">
            <button
              type="button"
              className="learn-page-panel__session-trigger"
              onClick={sessionControl.onOpen}
              aria-label="Open session settings"
              aria-haspopup="dialog"
              aria-expanded={sessionControl.isOpen}
            >
              <FiSliders aria-hidden="true" />
              <span className="learn-page-panel__session-trigger-label">Session</span>
            </button>
          </div>
          {panel.hasDecks && panel.currentWord ? (
            <div className="learn-page-panel__meta-chips">
              {panel.isBrowseMode ? (
                <span className="learn-page-panel__meta-chip">
                  Card: {panel.browseProgressLabel || "-"}
                </span>
              ) : (
                <>
                  <span className="learn-page-panel__meta-chip">
                    State: {panel.currentWord.state}
                  </span>
                  <span className="learn-page-panel__meta-chip">
                    Mode: {panel.sessionMode === "extended" ? "extra" : "daily"}
                  </span>
                </>
              )}
            </div>
          ) : null}
          {panel.isExtendedSession && !panel.isBrowseMode ? (
            <span className="learn-page-panel__mode-badge">Extra session</span>
          ) : null}
        </div>
      </div>

      {panel.decksError && (
        <div className="learn-page-panel__status learn-page-panel__status--error">
          {panel.decksError}
        </div>
      )}
      {panel.wordsError && (
        <div className="learn-page-panel__status learn-page-panel__status--error">
          {panel.wordsError}
        </div>
      )}

      {!panel.hasDecks ? (
        <LearnEmptyDeckState
          onCreateDeck={panel.openDeckCreatePage}
          onOpenBrowse={panel.openBrowsePage}
        />
      ) : panel.isWordsLoading ? (
        <div className="learn-page-panel__status learn-page-panel__status--fill">
          {panel.isBrowseMode ? "Loading cards..." : "Building SRS queue..."}
        </div>
      ) : !panel.currentWord ? (
        <div className="learn-page-panel__status learn-page-panel__status--fill">
          <div className="learn-page-panel__done">
            <span>{panel.completionMessage || "No cards available for this deck."}</span>
            {panel.canStartNewSession && (
              <button
                type="button"
                className="learn-page-panel__start-session"
                onClick={panel.handleStartNewSession}
              >
                Start new session
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="learn-page-panel__card-stage">
            <div className="learn-page-panel__card-viewport">
              <Flashcard
                card={flashcard}
              />
            </div>
          </div>

          <div
            className={`learn-page-panel__controls-dock${
              panel.isBrowseMode ? " learn-page-panel__controls-dock--browse" : ""
            }`}
          >
            <div className="learn-page-panel__ratings" aria-live="polite">
              {panel.isBrowseMode ? (
                <div className="learn-page-panel__rating-placeholder learn-page-panel__rating-placeholder--actions">
                  <button
                    type="button"
                    className="learn-page-panel__nav-button"
                    onClick={browseNavigation.onBrowsePrev}
                    disabled={!browseNavigation.canBrowsePrev || panel.isRatingPending}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="learn-page-panel__flip-button"
                    onClick={panel.toggleBackVisibility}
                    disabled={panel.isRatingPending}
                  >
                    {panel.isBackVisible ? "Hide answer" : "Show answer"}
                  </button>
                  <button
                    type="button"
                    className="learn-page-panel__nav-button"
                    onClick={browseNavigation.onBrowseNext}
                    disabled={!browseNavigation.canBrowseNext || panel.isRatingPending}
                  >
                    Next
                  </button>
                </div>
              ) : panel.isBackVisible ? (
                <SrsRatingControls
                  ratingOptions={panel.ratingOptions}
                  onRate={panel.handleRateCard}
                  disabled={panel.isRatingPending}
                />
              ) : (
                <div className="learn-page-panel__rating-placeholder learn-page-panel__rating-placeholder--reveal">
                  <button
                    type="button"
                    className="learn-page-panel__flip-button"
                    onClick={panel.toggleBackVisibility}
                    disabled={panel.isRatingPending}
                  >
                    <FiEye aria-hidden="true" />
                    <span>Show answer</span>
                  </button>
                  <span className="learn-page-panel__reveal-hint">
                    Reveal the answer to grade this card.
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <LearnSessionSettingsDialog sessionControl={sessionControl} />
    </article>
  );
});

LearnFlashcardsPanel.displayName = "LearnFlashcardsPanel";
