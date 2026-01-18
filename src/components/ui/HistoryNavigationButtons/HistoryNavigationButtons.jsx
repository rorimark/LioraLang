import "./HistoryNavigationButtons.css";

export default function HistoryNavigationButtons({ onPrev, onNext }) {
  const windowHistoryState = window.history.state;
  const windowHistoryIdx = windowHistoryState?.idx ?? 0;
  //   const windowHistoryLength = window.history.length;

  const disabledBack = windowHistoryIdx <= 0;
  //   const disabledForward = windowHistoryidx >= windowHistoryLength - 1;

  return (
    <nav className="navigation-buttons">
      <button
        onClick={onPrev}
        disabled={disabledBack}
        className="nav-button nav-button--back"
        title="Back"
      />

      <button
        onClick={onNext}
        // disabled={disabledForward}
        className="nav-button nav-button--forward"
        title="Forward"
      />
    </nav>
  );
}
