import "./HistoryNavigationButtons.css";

export default function HistoryNavigationButtons({ onPrev, onNext }) {
  const windowHistoryState = window.history.state;
  const windowHistoryIdx = windowHistoryState?.idx ?? 0;
  const disabledBack = windowHistoryIdx <= 0;

  return (
    <nav className="navigation-buttons" aria-label="Browser history navigation">
      <button
        onClick={onPrev}
        disabled={disabledBack}
        className="nav-button nav-button--back"
        aria-label="Go back"
        title="Back"
      ></button>

      <button
        onClick={onNext}
        className="nav-button nav-button--forward"
        aria-label="Go forward"
        title="Forward"
      ></button>
    </nav>
  );
}
