import "./Flashcard.css";

export default function Flashcard({ front, back, isFlipped, onFlip }) {
  return (
    <div className={`flashcard ${isFlipped ? "flipped" : ""}`} onClick={onFlip}>
      {isFlipped ? back : front}
      {/* <div className="flash-card-inner">
        <div className="flash-card-front">{front}</div>
        <div className="flash-card-back">{back}</div>
      </div> */}
    </div>
  );
}
