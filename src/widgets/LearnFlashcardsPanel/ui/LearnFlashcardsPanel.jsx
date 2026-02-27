import { memo } from "react";
import { Flashcard } from "@features/flashcard";
import { useLearnFlashcardsPanel } from "../model";
import "./LearnFlashcardsPanel.css";

export const LearnFlashcardsPanel = memo(() => {
  const {
    deck,
    decks,
    decksError,
    wordsError,
    isDecksLoading,
    isWordsLoading,
    selectedDeckId,
    currentWord,
    cardFrontText,
    cardBackText,
    cardMetaBadges,
    currentCardIndex,
    cardsCount,
    isBackVisible,
    flipShortcutHint,
    navigationShortcutHint,
    handleDeckSelectChange,
    handlePrevCard,
    handleNextCard,
    toggleBackVisibility,
  } = useLearnFlashcardsPanel();

  return (
    <article className="panel learn-page-panel">
      <div className="learn-page-panel__controls">
        <label htmlFor="learn-deck-select">Choose deck</label>
        <select
          id="learn-deck-select"
          value={selectedDeckId}
          onChange={handleDeckSelectChange}
          disabled={isDecksLoading || decks.length === 0}
        >
          {decks.map((deckItem) => (
            <option key={deckItem.id} value={deckItem.id}>
              {deckItem.name}
            </option>
          ))}
        </select>
      </div>

      {decksError && (
        <div className="learn-page-panel__status learn-page-panel__status--error">
          {decksError}
        </div>
      )}

      {isWordsLoading ? (
        <div className="learn-page-panel__status learn-page-panel__status--fill">
          Loading flashcards...
        </div>
      ) : wordsError ? (
        <div className="learn-page-panel__status learn-page-panel__status--error learn-page-panel__status--fill">
          {wordsError}
        </div>
      ) : !currentWord ? (
        <div className="learn-page-panel__status learn-page-panel__status--fill">
          This deck has no cards yet.
        </div>
      ) : (
        <>
          <div className="learn-page-panel__card-stage">
            <Flashcard
              frontLabel="Front"
              backLabel="Back"
              frontText={cardFrontText}
              backText={cardBackText}
              backMetaBadges={cardMetaBadges}
              isFlipped={isBackVisible}
              onFlip={toggleBackVisibility}
            />
          </div>

          <div className="learn-page-panel__meta">
            <span>
              Card {currentCardIndex} of {cardsCount}
            </span>
            <span>{deck?.name || "Deck"}</span>
            <span>
              {flipShortcutHint}: Flip • {navigationShortcutHint}: Navigate
            </span>
          </div>

          <div className="learn-page-panel__actions">
            <button type="button" onClick={handlePrevCard}>
              Prev
            </button>
            <button type="button" onClick={toggleBackVisibility}>
              Flip
            </button>
            <button type="button" onClick={handleNextCard}>
              Next
            </button>
          </div>
        </>
      )}
    </article>
  );
});

LearnFlashcardsPanel.displayName = "LearnFlashcardsPanel";
