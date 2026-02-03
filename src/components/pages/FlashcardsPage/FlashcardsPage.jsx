import "./FlashcardsPage.css";
import { useWords } from "../../../hooks/useWords";
import { useFlashcards } from "../../../hooks/useFlashcards";
import Flashcard from "../../ui/Flashcard/Flashcard";
import FlashcardNavButtons from "../../layout/FlashcardNavButtons/FlashcardNavButtons";

export default function FlashcardsPage() {
  const { words, isLoading, error } = useWords();
  const { word, isFlipped, flip, next, prev } = useFlashcards(words);

  return (
    <main className="flashcards-page-content">
      {error ? (
        <div style={{ color: "#ff6b6b", padding: "1rem" }}>
          Error loading flashcards: {error}
        </div>
      ) : isLoading || !words.length ? (
        <div style={{ color: "#ffffff", padding: "1rem" }}>Loading...</div>
      ) : word ? (
        <Flashcard
          front={word.eng}
          back={word.ru}
          isFlipped={isFlipped}
          onFlip={flip}
        />
      ) : null}

      <FlashcardNavButtons onNext={next} onPrev={prev} />
    </main>
  );
}
