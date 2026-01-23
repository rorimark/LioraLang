import "./FlashcardNavButtons.css";

export default function FlashcardNavButtons({ onNext, onPrev }) {
  return (
    <nav
      className="flashcard-nav-buttons-container"
      aria-label="Flashcard navigation"
    >
      <button
        className="flashcard-nav-button flashcard-nav-button--back"
        onClick={onPrev}
        aria-label="Previous flashcard"
        title="Previous flashcard"
      ></button>
      <button
        className="flashcard-nav-button flashcard-nav-button--forward"
        onClick={onNext}
        aria-label="Next flashcard"
        title="Next flashcard"
      ></button>
    </nav>
  );
}
