import { memo } from "react";
import { Flashcard } from "@features/flashcard";
import { SrsRatingControls } from "@features/srs-rating-controls";
import { useLearnFlashcardsPanel } from "../model";
import { LearnEmptyDeckState } from "./LearnEmptyDeckState";
import "./LearnFlashcardsPanel.css";

export const LearnFlashcardsPanel = memo(() => {
  const {
    deck,
    sessionMode,
    decks,
    decksError,
    wordsError,
    isDecksLoading,
    hasDecks,
    isWordsLoading,
    isRatingPending,
    selectedDeckId,
    learnViewMode,
    isBrowseMode,
    currentWord,
    cardFrontText,
    cardBackText,
    cardMetaBadges,
    isBackVisible,
    completionMessage,
    canStartNewSession,
    isExtendedSession,
    ratingOptions,
    browseProgressLabel,
    canBrowsePrev,
    canBrowseNext,
    handleDeckSelectChange,
    switchToSrsMode,
    switchToBrowseMode,
    handleRateCard,
    handleStartNewSession,
    handleBrowsePrev,
    handleBrowseNext,
    toggleBackVisibility,
    refreshSession,
    openDeckCreatePage,
    openBrowsePage,
  } = useLearnFlashcardsPanel();

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
              value={selectedDeckId}
              onChange={handleDeckSelectChange}
              disabled={isDecksLoading || !hasDecks}
            >
              {!hasDecks && (
                <option value="">
                  {isDecksLoading ? "Loading decks..." : "No decks yet"}
                </option>
              )}
              {decks.map((deckItem) => (
                <option key={deckItem.id} value={deckItem.id}>
                  {deckItem.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="learn-page-panel__refresh"
              onClick={refreshSession}
              disabled={isWordsLoading || !selectedDeckId}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="learn-page-panel__header-actions">
          <div className="learn-page-panel__mode-switch" role="group" aria-label="Study mode">
            <button
              type="button"
              className={
                learnViewMode === "srs"
                  ? "learn-page-panel__mode-button learn-page-panel__mode-button--active"
                  : "learn-page-panel__mode-button"
              }
              onClick={switchToSrsMode}
            >
              SRS
              <span className="learn-page-panel__mode-hint">1-4</span>
            </button>
            <button
              type="button"
              className={
                learnViewMode === "browse"
                  ? "learn-page-panel__mode-button learn-page-panel__mode-button--active"
                  : "learn-page-panel__mode-button"
              }
              onClick={switchToBrowseMode}
            >
              Review
              <span className="learn-page-panel__mode-hint">← →</span>
            </button>
          </div>
          {hasDecks && currentWord ? (
            <div className="learn-page-panel__meta-chips">
              <span className="learn-page-panel__meta-chip">
                Deck: {deck?.name || "Deck"}
              </span>
              {isBrowseMode ? (
                <span className="learn-page-panel__meta-chip">
                  Card: {browseProgressLabel || "-"}
                </span>
              ) : (
                <>
                  <span className="learn-page-panel__meta-chip">
                    State: {currentWord.state}
                  </span>
                  <span className="learn-page-panel__meta-chip">
                    Mode: {sessionMode === "extended" ? "extra" : "daily"}
                  </span>
                </>
              )}
            </div>
          ) : null}
          {isExtendedSession && !isBrowseMode ? (
            <span className="learn-page-panel__mode-badge">Extra session</span>
          ) : null}
        </div>
      </div>

      {decksError && (
        <div className="learn-page-panel__status learn-page-panel__status--error">
          {decksError}
        </div>
      )}
      {wordsError && (
        <div className="learn-page-panel__status learn-page-panel__status--error">
          {wordsError}
        </div>
      )}

      {!hasDecks ? (
        <LearnEmptyDeckState
          onCreateDeck={openDeckCreatePage}
          onOpenBrowse={openBrowsePage}
        />
      ) : isWordsLoading ? (
        <div className="learn-page-panel__status learn-page-panel__status--fill">
          {isBrowseMode ? "Loading cards..." : "Building SRS queue..."}
        </div>
      ) : !currentWord ? (
        <div className="learn-page-panel__status learn-page-panel__status--fill">
          <div className="learn-page-panel__done">
            <span>{completionMessage || "No cards available for this deck."}</span>
            {canStartNewSession && (
              <button
                type="button"
                className="learn-page-panel__start-session"
                onClick={handleStartNewSession}
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
                frontLabel="Front"
                backLabel="Back"
                frontText={cardFrontText}
                backText={cardBackText}
                backMetaBadges={cardMetaBadges}
                isFlipped={isBackVisible}
                onFlip={toggleBackVisibility}
                disabled={isRatingPending}
              />
            </div>
          </div>

          <div className="learn-page-panel__controls-dock">
            <div className="learn-page-panel__actions">
              {isBrowseMode && (
                <button
                  type="button"
                  className="learn-page-panel__nav-button"
                  onClick={handleBrowsePrev}
                  disabled={!canBrowsePrev || isRatingPending}
                >
                  Previous
                  <span className="learn-page-panel__button-hint">←</span>
                </button>
              )}
              <button
                type="button"
                className="learn-page-panel__flip-button"
                onClick={toggleBackVisibility}
                disabled={isRatingPending}
              >
                {isBackVisible ? "Hide answer" : "Show answer"}
                <span className="learn-page-panel__button-hint">Space</span>
              </button>
              {isBrowseMode && (
                <button
                  type="button"
                  className="learn-page-panel__nav-button"
                  onClick={handleBrowseNext}
                  disabled={!canBrowseNext || isRatingPending}
                >
                  Next
                  <span className="learn-page-panel__button-hint">→</span>
                </button>
              )}
            </div>

            <div className="learn-page-panel__ratings" aria-live="polite">
              {isBrowseMode ? (
                <div className="learn-page-panel__rating-placeholder">
                  Review mode doesn&apos;t grade cards.
                </div>
              ) : isBackVisible ? (
                <SrsRatingControls
                  ratingOptions={ratingOptions}
                  onRate={handleRateCard}
                  disabled={isRatingPending}
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
