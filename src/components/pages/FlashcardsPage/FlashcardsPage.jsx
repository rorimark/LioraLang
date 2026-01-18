import Header from "../../layout/Header/Header";
import "./FlashcardsPage.css";
import Flashcard from "../../ui/Flashcard/Flashcard";
import NavigationButtons from "../../ui/HistoryNavigationButtons/HistoryNavigationButtons";
import { useWords } from "../../../hooks/useWords";
import { useFlashcards } from "../../../hooks/useFlashcards";
import FlashcardNavButtons from "../../ui/FlashcardNavButtons/FlashcardNavButtons";

export default function FlashcardsPage() {
  const words = useWords();

  const { word, isFlipped, flip, next, prev } = useFlashcards(words);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        color: "#ffffff",
      }}
    >
      <Header headerTitle="Flashcards" />
      <main className="flashcards-page-content">
        {!words.length ? (
          <div style={{ color: "white" }}>Loading...</div>
        ) : (
          <Flashcard
            front={word.eng}
            back={word.ru}
            isFlipped={isFlipped}
            onFlip={flip}
          />
        )}

        <FlashcardNavButtons onNext={next} onPrev={prev} />
      </main>
    </div>
  );
}
