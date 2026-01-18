import { useState } from "react";

export function useFlashcards(words) {
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const flip = () => setIsFlipped((v) => !v);

  const next = () => {
    setIndex((i) => (i + 1 < words.length ? i + 1 : 0));
    setIsFlipped(false);
  };

  const prev = () => {
    setIndex((i) => (i - 1 >= 0 ? i - 1 : words.length - 1));
    setIsFlipped(false);
  };

  return {
    word: words[index],
    isFlipped,
    flip,
    next,
    prev,
  };
}
