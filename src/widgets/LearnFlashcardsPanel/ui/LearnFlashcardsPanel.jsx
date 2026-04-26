import { memo, useMemo } from "react";
import { Flashcard } from "@features/flashcard";
import { SrsRatingControls } from "@features/srs-rating-controls";
import { useLearnFlashcardsPanel } from "../model";
import { LearnEmptyDeckState } from "./LearnEmptyDeckState";
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
  const modeSwitch = useMemo(
    () => ({
      learnViewMode: panel.learnViewMode,
      switchToSrsMode: panel.switchToSrsMode,
      switchToBrowseMode: panel.switchToBrowseMode,
    }),
    [
      panel.learnViewMode,
      panel.switchToBrowseMode,
      panel.switchToSrsMode,
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
      frontLabel: "Front",
      backLabel: "Back",
      frontText: panel.cardFrontText,
      backText: panel.cardBackText,
      backMetaBadges: panel.cardMetaBadges,
      isFlipped: panel.isBackVisible,
      onFlip: panel.toggleBackVisibility,
      disabled: panel.isRatingPending,
    }),
    [
      panel.cardBackText,
      panel.cardFrontText,
      panel.cardMetaBadges,
      panel.isBackVisible,
      panel.isRatingPending,
      panel.toggleBackVisibility,
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
          <div className="learn-page-panel__mode-switch" role="group" aria-label="Study mode">
            <button
              type="button"
              className={
                modeSwitch.learnViewMode === "browse"
                  ? "learn-page-panel__mode-button learn-page-panel__mode-button--active"
                  : "learn-page-panel__mode-button"
              }
              onClick={modeSwitch.switchToBrowseMode}
            >
              Review
            </button>
            <button
              type="button"
              className={
                modeSwitch.learnViewMode === "srs"
                  ? "learn-page-panel__mode-button learn-page-panel__mode-button--active"
                  : "learn-page-panel__mode-button"
              }
              onClick={modeSwitch.switchToSrsMode}
            >
              SRS
            </button>
          </div>
          {panel.hasDecks && panel.currentWord ? (
            <div className="learn-page-panel__meta-chips">
              <span className="learn-page-panel__meta-chip">
                Deck: {panel.deck?.name || "Deck"}
              </span>
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
            {!panel.isBrowseMode && (
              <div className="learn-page-panel__actions">
                <button
                  type="button"
                  className="learn-page-panel__flip-button"
                  onClick={panel.toggleBackVisibility}
                  disabled={panel.isRatingPending}
                >
                  {panel.isBackVisible ? "Hide answer" : "Show answer"}
                </button>
              </div>
            )}

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
                <div className="learn-page-panel__rating-placeholder">
                  Reveal the answer to see grading buttons.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </article>
  );
});

LearnFlashcardsPanel.displayName = "LearnFlashcardsPanel";
