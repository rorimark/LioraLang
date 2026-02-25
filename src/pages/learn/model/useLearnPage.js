import { useCallback, useMemo, useState } from "react";
import { useDecks, useDeckWords } from "@entities/deck";

const buildCardFront = (word) => word.eng || "-";
const buildCardBack = (word) => {
  const parts = [word.ru, word.pl, word.part_of_speech, word.level]
    .filter(Boolean)
    .join(" • ");

  return parts || "No translation";
};

export const useLearnPage = () => {
  const { decks, isLoading: isDecksLoading, error: decksError } = useDecks();
  const [selectedDeckIdState, setSelectedDeckIdState] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBackVisible, setIsBackVisible] = useState(false);

  const selectedDeckId = useMemo(() => {
    if (!selectedDeckIdState) {
      return decks[0] ? String(decks[0].id) : "";
    }

    const hasSelectedDeck = decks.some(
      (deckItem) => String(deckItem.id) === selectedDeckIdState,
    );

    if (hasSelectedDeck) {
      return selectedDeckIdState;
    }

    return decks[0] ? String(decks[0].id) : "";
  }, [decks, selectedDeckIdState]);

  const {
    deck,
    words,
    isLoading: isWordsLoading,
    error: wordsError,
  } = useDeckWords(selectedDeckId);

  const safeWords = useMemo(() => (Array.isArray(words) ? words : []), [words]);
  const hasCards = safeWords.length > 0;
  const resolvedIndex = hasCards
    ? Math.min(currentIndex, safeWords.length - 1)
    : 0;
  const currentWord = hasCards ? safeWords[resolvedIndex] : null;

  const handleDeckChange = useCallback((deckId) => {
    setSelectedDeckIdState(deckId);
    setCurrentIndex(0);
    setIsBackVisible(false);
  }, []);

  const handleDeckSelectChange = useCallback(
    (event) => {
      handleDeckChange(event.target.value);
    },
    [handleDeckChange],
  );

  const toggleBackVisibility = useCallback(() => {
    setIsBackVisible((value) => !value);
  }, []);

  const handleNextCard = useCallback(() => {
    if (!hasCards) {
      return;
    }

    setCurrentIndex((prevIndex) => (prevIndex + 1) % safeWords.length);
    setIsBackVisible(false);
  }, [hasCards, safeWords.length]);

  const handlePrevCard = useCallback(() => {
    if (!hasCards) {
      return;
    }

    setCurrentIndex(
      (prevIndex) => (prevIndex - 1 + safeWords.length) % safeWords.length,
    );
    setIsBackVisible(false);
  }, [hasCards, safeWords.length]);

  return {
    decks,
    deck,
    decksError,
    wordsError,
    isDecksLoading,
    isWordsLoading,
    selectedDeckId,
    currentWord,
    currentCardIndex: Math.min(resolvedIndex + 1, safeWords.length),
    cardsCount: safeWords.length,
    isBackVisible,
    buildCardFront,
    buildCardBack,
    handleDeckSelectChange,
    handlePrevCard,
    handleNextCard,
    toggleBackVisibility,
  };
};
