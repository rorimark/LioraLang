import { useState, useCallback } from "react";

export function useFlashcards(words = []) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const flip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => (i + 1 < words.length ? i + 1 : 0));
    setIsFlipped(false);
  }, [words.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 >= 0 ? i - 1 : words.length - 1));
    setIsFlipped(false);
  }, [words.length]);

  const currentWord = words[index] || null;

  return {
    word: currentWord,
    isFlipped,
    flip,
    next,
    prev,
    currentIndex: index,
    totalWords: words.length,
  };
}
