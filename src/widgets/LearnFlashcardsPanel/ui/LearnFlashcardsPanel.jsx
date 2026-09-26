import { memo, useMemo } from "react";
import { FiChevronDown, FiChevronLeft, FiChevronRight, FiSliders } from "react-icons/fi";
import { Flashcard } from "@features/flashcard";
import { SrsRatingControls } from "@features/srs-rating-controls";
import { useLearnFlashcardsPanel, useLeavingCard } from "../model";
import { LearnEmptyDeckState } from "./LearnEmptyDeckState";
import { LearnSessionSettingsDialog } from "./LearnSessionSettingsDialog/LearnSessionSettingsDialog";
import "./LearnFlashcardsPanel.css";

const GRADE_LABELS = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

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

  const { leavingCard, lastDoneCard, clearLeavingCard } = useLeavingCard(
    panel.currentWord ? flashcard : null,
    panel.cardMove,
  );
  const cardKey = panel.currentWord
    ? String(panel.currentWord.wordId ?? panel.currentWord.id ?? "")
    : "";
  const flipKey = panel.shortcutKeyLabels.flip;
  const hasCard = panel.hasDecks && !panel.isWordsLoading && Boolean(panel.currentWord);
  const leftCount = Math.max(panel.sessionStats.dueTotal - (panel.currentWord ? 1 : 0), 0);

  return (
    <article className="learn-desk">
      <header className="learn-desk__strip">
        <div className="learn-desk__deck">
          <label className="learn-desk__deck-label" htmlFor="learn-deck-select">
            Deck
          </label>
          <span className="learn-desk__deck-select">
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
            <FiChevronDown aria-hidden="true" />
          </span>
          {panel.hasDecks && panel.currentDeck ? (
            <span className="learn-desk__direction">{panel.directionSummary}</span>
          ) : null}
        </div>

        {panel.hasDecks ? (
          <SessionReceipt
            receipt={panel.sessionReceipt}
            isBrowseMode={panel.isBrowseMode}
            browseProgressLabel={panel.browseProgressLabel}
          />
        ) : null}

        {panel.isExtendedSession && !panel.isBrowseMode ? (
          <span className="learn-desk__tag">Extra session</span>
        ) : null}

        <button
          type="button"
          className="learn-desk__session"
          onClick={sessionControl.onOpen}
          aria-label="Open session settings"
          title="Session settings"
          aria-haspopup="dialog"
          aria-expanded={sessionControl.isOpen}
        >
          <FiSliders aria-hidden="true" />
        </button>
      </header>

      {panel.decksError && (
        <div className="learn-desk__status learn-desk__status--error" role="alert">
          {panel.decksError}
        </div>
      )}
      {panel.wordsError && (
        <div className="learn-desk__status learn-desk__status--error" role="alert">
          {panel.wordsError}
        </div>
      )}

      <div className="learn-desk__stage">
        {!panel.hasDecks ? (
          <LearnEmptyDeckState
            onCreateDeck={panel.openDeckCreatePage}
            onOpenBrowse={panel.openBrowsePage}
          />
        ) : panel.isWordsLoading ? (
          <div className="learn-desk__note-card" aria-live="polite">
            <p>{panel.isBrowseMode ? "Laying out the cards..." : "Building today's queue..."}</p>
          </div>
        ) : !panel.currentWord ? (
          <div className="learn-desk__note-card learn-desk__note-card--done" aria-live="polite">
            <strong>{panel.completionMessage || "No cards available for this deck."}</strong>
            {panel.canStartNewSession && (
              <button
                type="button"
                className="learn-desk__key learn-desk__key--primary"
                onClick={panel.handleStartNewSession}
              >
                Start new session
              </button>
            )}
          </div>
        ) : null}

        {hasCard ? (
          <>
            {panel.isBrowseMode ? null : (
              <div className="learn-desk__side" aria-hidden="true">
                <span className="learn-desk__pile">
                  <i />
                  <i />
                  <i />
                </span>
                <span className="learn-desk__count">
                  {leftCount}
                  <small>left</small>
                </span>
              </div>
            )}

            <div className="learn-desk__center">
              <div className="learn-desk__table">
                <span className="learn-desk__stack" aria-hidden="true">
                  <i />
                  <i />
                </span>
                <div className="learn-desk__card" key={cardKey}>
                  <Flashcard card={flashcard} variant="index" />
                </div>
                {leavingCard ? (
                  <div
                    key={leavingCard.token}
                    className={`learn-desk__leaving learn-desk__leaving--${leavingCard.kind}`}
                    onAnimationEnd={clearLeavingCard}
                    aria-hidden="true"
                    inert
                  >
                    <Flashcard card={leavingCard.card} variant="index" />
                  </div>
                ) : null}
              </div>

              <div className="learn-desk__dock" aria-live="polite">
                {panel.isBrowseMode ? (
                  <div className="learn-desk__browse">
                    <button
                      type="button"
                      className="learn-desk__key learn-desk__key--icon"
                      onClick={browseNavigation.onBrowsePrev}
                      disabled={!browseNavigation.canBrowsePrev || panel.isRatingPending}
                      aria-label="Previous card"
                    >
                      <FiChevronLeft aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="learn-desk__key learn-desk__key--reveal"
                      onClick={panel.toggleBackVisibility}
                      disabled={panel.isRatingPending}
                    >
                      <span>{panel.isBackVisible ? "Hide answer" : "Show answer"}</span>
                      {flipKey ? <kbd>{flipKey}</kbd> : null}
                    </button>
                    <button
                      type="button"
                      className="learn-desk__key learn-desk__key--icon"
                      onClick={browseNavigation.onBrowseNext}
                      disabled={!browseNavigation.canBrowseNext || panel.isRatingPending}
                      aria-label="Next card"
                    >
                      <FiChevronRight aria-hidden="true" />
                    </button>
                  </div>
                ) : panel.isBackVisible ? (
                  <SrsRatingControls
                    variant="stickers"
                    ratingOptions={panel.ratingOptions}
                    onRate={panel.handleRateCard}
                    disabled={panel.isRatingPending}
                    keyLabels={panel.shortcutKeyLabels.ratings}
                  />
                ) : (
                  <button
                    type="button"
                    className="learn-desk__key learn-desk__key--reveal"
                    onClick={panel.toggleBackVisibility}
                    disabled={panel.isRatingPending}
                    aria-keyshortcuts={flipKey || undefined}
                  >
                    <span>Show answer</span>
                    {flipKey ? <kbd>{flipKey}</kbd> : null}
                  </button>
                )}
              </div>
            </div>

            {panel.isBrowseMode ? null : (
              <div className="learn-desk__side" aria-hidden="true">
                <span className="learn-desk__pile learn-desk__pile--done">
                  <i />
                  <i />
                  <i>
                    {lastDoneCard ? (
                      <>
                        <b>{lastDoneCard.text}</b>
                        <em className={`learn-desk__grade learn-desk__grade--${lastDoneCard.kind}`}>
                          {GRADE_LABELS[lastDoneCard.kind] || lastDoneCard.kind}
                        </em>
                      </>
                    ) : null}
                  </i>
                </span>
                <span className="learn-desk__count">
                  {panel.sessionReceipt.done}
                  <small>done</small>
                </span>
              </div>
            )}
          </>
        ) : null}
      </div>

      <LearnSessionSettingsDialog sessionControl={sessionControl} />
    </article>
  );
});

LearnFlashcardsPanel.displayName = "LearnFlashcardsPanel";

// One tick per card in today's queue, coloured by the grade it got; a plain
// bar when the queue is too long for ticks, and a position while browsing.
const SessionReceipt = memo(({ receipt, isBrowseMode, browseProgressLabel }) => {
  if (isBrowseMode) {
    return browseProgressLabel ? (
      <span className="learn-desk__receipt">
        <span className="learn-desk__receipt-count">{browseProgressLabel}</span>
      </span>
    ) : null;
  }

  if (receipt.total === 0) {
    return null;
  }

  const label = `${receipt.done} of ${receipt.total} cards done today`;

  return (
    <span className="learn-desk__receipt" role="img" aria-label={label} title={label}>
      {receipt.ticks ? (
        <span className="learn-desk__ticks">
          {receipt.ticks.map((tick, index) => (
            <i key={index} className={`learn-desk__tick learn-desk__tick--${tick}`} />
          ))}
        </span>
      ) : (
        <span className="learn-desk__bar">
          <i style={{ width: `${(receipt.done / receipt.total) * 100}%` }} />
        </span>
      )}
      <span className="learn-desk__receipt-count">
        {receipt.done}
        <small> / {receipt.total}</small>
      </span>
    </span>
  );
});

SessionReceipt.displayName = "SessionReceipt";
