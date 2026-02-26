import { useCallback, useMemo, useState } from "react";
import { useDecks, useDeckWords } from "@entities/deck";

const buildCardFrontText = (word) => word?.eng || "-";

const buildCardBackText = (word) => {
  const parts = [word?.ru, word?.pl].filter(Boolean).join(" • ");

  return parts || "No translation";
};

const buildCardMetaBadges = (word) => {
  if (!word) {
    return [];
  }

  const badges = [];

  if (word.level) {
    badges.push({ key: "level", text: `Level ${word.level}`, accent: false });
  }

  if (word.part_of_speech) {
    badges.push({
      key: "partOfSpeech",
      text: word.part_of_speech,
      accent: false,
    });
  }

  return badges;
};

export const useLearnFlashcardsPanel = () => {
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
  const cardFrontText = useMemo(
    () => buildCardFrontText(currentWord),
    [currentWord],
  );
  const cardBackText = useMemo(
    () => buildCardBackText(currentWord),
    [currentWord],
  );
  const cardMetaBadges = useMemo(
    () => buildCardMetaBadges(currentWord),
    [currentWord],
  );

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
    currentCardIndex: Math.min(resolvedIndex + 1, safeWords.length),
    cardsCount: safeWords.length,
    isBackVisible,
    handleDeckSelectChange,
    handlePrevCard,
    handleNextCard,
    toggleBackVisibility,
  };
};
