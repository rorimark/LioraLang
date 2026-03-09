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
    currentWord,
    cardFrontText,
    cardBackText,
    cardMetaBadges,
    isBackVisible,
    sessionStats,
    completionMessage,
    canStartNewSession,
    isExtendedSession,
    ratingOptions,
    handleDeckSelectChange,
    handleRateCard,
    handleStartNewSession,
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
          <span className="learn-page-panel__mode-badge learn-page-panel__mode-badge--neutral">
            Due {sessionStats.dueTotal}
          </span>
          {isExtendedSession ? (
            <span className="learn-page-panel__mode-badge">Extra session</span>
          ) : null}
        </div>
      </div>

      <div className="learn-page-panel__stats-row" aria-live="polite">
        <span className="learn-page-panel__stat-pill">Learning {sessionStats.dueLearning}</span>
        <span className="learn-page-panel__stat-pill">Review {sessionStats.dueReview}</span>
        <span className="learn-page-panel__stat-pill">New {sessionStats.dueNew}</span>
        <span className="learn-page-panel__stat-pill">Today {sessionStats.totalStudiedToday}</span>
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
          Building SRS queue...
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

          <div className="learn-page-panel__meta-chips">
            <span className="learn-page-panel__meta-chip">
              Deck: {deck?.name || "Deck"}
            </span>
            <span className="learn-page-panel__meta-chip">
              State: {currentWord.state}
            </span>
            <span className="learn-page-panel__meta-chip">
              Mode: {sessionMode === "extended" ? "extra" : "daily"}
            </span>
          </div>

          <div className="learn-page-panel__controls-dock">
            <div className="learn-page-panel__actions">
              <button
                type="button"
                className="learn-page-panel__flip-button"
                onClick={toggleBackVisibility}
                disabled={isRatingPending}
              >
                {isBackVisible ? "Hide answer" : "Show answer"}
              </button>
            </div>

            <div className="learn-page-panel__ratings" aria-live="polite">
              {isBackVisible ? (
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
