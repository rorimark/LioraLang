import { LearnFlashcardsPanel } from "@widgets";
import { useLearnPage } from "../model";

export const LearnPage = () => {
  const {
    deck,
    decks,
    decksError,
    wordsError,
    isDecksLoading,
    isWordsLoading,
    selectedDeckId,
    currentWord,
    currentCardIndex,
    cardsCount,
    isBackVisible,
    buildCardFront,
    buildCardBack,
    handleDeckSelectChange,
    handlePrevCard,
    handleNextCard,
    toggleBackVisibility,
  } = useLearnPage();

  return (
    <section className="page">
      <LearnFlashcardsPanel
        deck={deck}
        decks={decks}
        decksError={decksError}
        wordsError={wordsError}
        isDecksLoading={isDecksLoading}
        isWordsLoading={isWordsLoading}
        selectedDeckId={selectedDeckId}
        currentWord={currentWord}
        currentCardIndex={currentCardIndex}
        cardsCount={cardsCount}
        isBackVisible={isBackVisible}
        buildCardFront={buildCardFront}
        buildCardBack={buildCardBack}
        onDeckSelectChange={handleDeckSelectChange}
        onPrevCard={handlePrevCard}
        onNextCard={handleNextCard}
        onToggleBackVisibility={toggleBackVisibility}
      />
    </section>
  );
};

export default LearnPage;
