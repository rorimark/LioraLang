import { memo, useId, useMemo, useRef } from "react";
import {
  FiBookOpen,
  FiCheck,
  FiClock,
  FiEye,
  FiLayers,
  FiRepeat,
  FiShuffle,
  FiSliders,
  FiTarget,
  FiType,
  FiX,
} from "react-icons/fi";
import { useDialogA11y } from "@shared/lib/a11y";
import { Button } from "@shared/ui";
import {
  LEARN_EXERCISE_MODE_FILL_GAP,
  LEARN_EXERCISE_MODE_FLASHCARDS,
  LEARN_EXERCISE_MODE_MULTIPLE_CHOICE,
  LEARN_EXERCISE_MODE_TYPE_TRANSLATION,
  LEARN_SESSION_DIRECTION_MIXED,
  LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
} from "../../model/learnSessionSettings";
import "./LearnSessionSettingsDialog.css";

const EXERCISE_MODE_OPTIONS = Object.freeze([
  {
    value: LEARN_EXERCISE_MODE_FLASHCARDS,
    title: "Flashcards",
    description: "Flip and grade cards quickly.",
    available: true,
  },
  {
    value: LEARN_EXERCISE_MODE_TYPE_TRANSLATION,
    title: "Type translation",
    description: "Answer by typing the translation.",
    available: false,
  },
  {
    value: LEARN_EXERCISE_MODE_FILL_GAP,
    title: "Fill missing word",
    description: "Complete the missing word in context.",
    available: false,
  },
  {
    value: LEARN_EXERCISE_MODE_MULTIPLE_CHOICE,
    title: "Multiple choice",
    description: "Pick the correct translation fast.",
    available: false,
  },
]);

const AUTO_FLIP_OPTIONS = Object.freeze([
  { value: "off", label: "Off" },
  { value: "1s", label: "1 sec" },
  { value: "2s", label: "2 sec" },
  { value: "3s", label: "3 sec" },
]);

const SHUFFLE_OPTIONS = Object.freeze([
  { value: "off", label: "Off" },
  { value: "per_session", label: "Per session" },
  { value: "always", label: "Always" },
]);

const resolveDirectionOptions = (deck = {}) => {
  const source = String(deck?.sourceLanguage || "Source").trim() || "Source";
  const target = [deck?.targetLanguage, deck?.tertiaryLanguage]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(" + ") || "Target";

  return [
    {
      value: LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
      title: `${source} → ${target}`,
      description: "Prompt on the source side, answer on the target side.",
    },
    {
      value: LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
      title: `${target} → ${source}`,
      description: "Reverse the deck and answer back to the source language.",
    },
    {
      value: LEARN_SESSION_DIRECTION_MIXED,
      title: `${source} ↔ ${target}`,
      description: "Mix both directions card by card.",
    },
  ];
};

const OptionCard = memo(({
  title,
  description,
  selected = false,
  disabled = false,
  onClick,
}) => {
  return (
    <button
      type="button"
      className={[
        "learn-session-dialog__option-card",
        selected ? "learn-session-dialog__option-card--active" : "",
        disabled ? "learn-session-dialog__option-card--disabled" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
    >
      <span className="learn-session-dialog__option-head">
        <strong>{title}</strong>
        {selected ? (
          <span className="learn-session-dialog__option-indicator" aria-hidden="true">
            <FiCheck />
          </span>
        ) : null}
        {!selected && disabled ? (
          <span className="learn-session-dialog__option-badge">Soon</span>
        ) : null}
      </span>
      <span>{description}</span>
    </button>
  );
});

OptionCard.displayName = "OptionCard";

export const LearnSessionSettingsDialog = memo(({ sessionControl }) => {
  const dialog = sessionControl || {};
  const currentDeck = useMemo(() => dialog.currentDeck || null, [dialog.currentDeck]);
  const sessionSettings = dialog.sessionSettings || {};
  const contentRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const directionOptions = useMemo(
    () => resolveDirectionOptions(currentDeck),
    [currentDeck],
  );

  useDialogA11y({
    isOpen: dialog.isOpen,
    containerRef: contentRef,
    onClose: dialog.onClose,
    initialFocusSelector: "[data-dialog-close]",
  });

  if (!dialog.isOpen) {
    return null;
  }

  return (
    <div className="learn-session-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <button
        type="button"
        className="learn-session-dialog__overlay"
        onClick={dialog.onClose}
        aria-hidden="true"
        tabIndex={-1}
      />

      <section className="learn-session-dialog__content" ref={contentRef} tabIndex={-1}>
        <header className="learn-session-dialog__header">
          <div className="learn-session-dialog__title-wrap">
            <span className="learn-session-dialog__title-icon" aria-hidden="true">
              <FiSliders />
            </span>
            <div className="learn-session-dialog__title-copy">
              <h2 id={titleId}>Session settings</h2>
              <p id={descriptionId}>{dialog.sessionSummary}</p>
            </div>
          </div>
          <button
            type="button"
            className="learn-session-dialog__close"
            onClick={dialog.onClose}
            aria-label="Close session settings"
            data-dialog-close
          >
            <FiX />
          </button>
        </header>

        <div className="learn-session-dialog__body">
          <section className="learn-session-dialog__section">
            <div className="learn-session-dialog__section-head">
              <h3 className="learn-session-dialog__section-title">
                <FiLayers aria-hidden="true" />
                <span>Study engine</span>
              </h3>
            </div>
            <div className="learn-session-dialog__options-grid learn-session-dialog__options-grid--two">
              <OptionCard
                title="Review"
                description="Browse the whole deck in a loop."
                selected={dialog.learnViewMode === "browse"}
                onClick={dialog.onSwitchToBrowseMode}
              />
              <OptionCard
                title="SRS"
                description="Follow due dates and daily limits."
                selected={dialog.learnViewMode === "srs"}
                onClick={dialog.onSwitchToSrsMode}
              />
            </div>
          </section>

          <section className="learn-session-dialog__section">
            <div className="learn-session-dialog__section-head">
              <h3 className="learn-session-dialog__section-title">
                <FiType aria-hidden="true" />
                <span>Exercise mode</span>
              </h3>
            </div>
            <div className="learn-session-dialog__options-grid learn-session-dialog__options-grid--two">
              {EXERCISE_MODE_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  selected={dialog.exerciseMode === option.value}
                  disabled={!option.available}
                  onClick={() => dialog.onExerciseModeChange(option.value)}
                />
              ))}
            </div>
          </section>

          <section className="learn-session-dialog__section">
            <div className="learn-session-dialog__section-head">
              <h3 className="learn-session-dialog__section-title">
                <FiRepeat aria-hidden="true" />
                <span>Direction</span>
              </h3>
            </div>
            <div className="learn-session-dialog__options-grid">
              {directionOptions.map((option) => (
                <OptionCard
                  key={option.value}
                  title={option.title}
                  description={option.description}
                  selected={sessionSettings.directionMode === option.value}
                  onClick={() => dialog.onDirectionModeChange(option.value)}
                />
              ))}
            </div>
          </section>

          <section className="learn-session-dialog__section">
            <div className="learn-session-dialog__section-head">
              <h3 className="learn-session-dialog__section-title">
                <FiBookOpen aria-hidden="true" />
                <span>Session behavior</span>
              </h3>
            </div>
            <div className="learn-session-dialog__fields-grid">
              <label className="learn-session-dialog__field">
                <span>
                  <FiTarget aria-hidden="true" />
                  <span>Daily goal</span>
                </span>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={sessionSettings.dailyGoal}
                  onChange={dialog.onDailyGoalChange}
                />
              </label>
              <label className="learn-session-dialog__field">
                <span>
                  <FiClock aria-hidden="true" />
                  <span>Auto-flip</span>
                </span>
                <select
                  value={sessionSettings.autoFlipDelay}
                  onChange={dialog.onAutoFlipDelayChange}
                >
                  {AUTO_FLIP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="learn-session-dialog__field">
                <span>
                  <FiShuffle aria-hidden="true" />
                  <span>Shuffle</span>
                </span>
                <select
                  value={sessionSettings.shuffleMode}
                  onChange={dialog.onShuffleModeChange}
                >
                  {SHUFFLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="learn-session-dialog__toggle learn-session-dialog__toggle--centered">
                <input
                  type="checkbox"
                  checked={sessionSettings.repeatWrongCards}
                  onChange={dialog.onRepeatWrongCardsChange}
                />
                <span className="learn-session-dialog__toggle-copy">
                  <span className="learn-session-dialog__toggle-title">
                    <FiRepeat aria-hidden="true" />
                    <strong>Repeat wrong cards</strong>
                  </span>
                  <small>Keep failed cards in the current SRS run.</small>
                </span>
              </label>
            </div>
          </section>

          <section className="learn-session-dialog__section">
            <div className="learn-session-dialog__section-head">
              <h3 className="learn-session-dialog__section-title">
                <FiEye aria-hidden="true" />
                <span>Card details</span>
              </h3>
            </div>
            <div className="learn-session-dialog__toggle-grid">
              <label className="learn-session-dialog__toggle learn-session-dialog__toggle--centered">
                <input
                  type="checkbox"
                  checked={sessionSettings.showExamples}
                  onChange={dialog.onShowExamplesChange}
                />
                <span className="learn-session-dialog__toggle-copy">
                  <span className="learn-session-dialog__toggle-title">
                    <FiBookOpen aria-hidden="true" />
                    <strong>Examples</strong>
                  </span>
                  <small>Show up to three usage examples under the answer.</small>
                </span>
              </label>
              <label className="learn-session-dialog__toggle learn-session-dialog__toggle--centered">
                <input
                  type="checkbox"
                  checked={sessionSettings.showLevel}
                  onChange={dialog.onShowLevelChange}
                />
                <span className="learn-session-dialog__toggle-copy">
                  <span className="learn-session-dialog__toggle-title">
                    <FiClock aria-hidden="true" />
                    <strong>Level badge</strong>
                  </span>
                  <small>Display the CEFR level on the answer side.</small>
                </span>
              </label>
              <label className="learn-session-dialog__toggle learn-session-dialog__toggle--centered">
                <input
                  type="checkbox"
                  checked={sessionSettings.showPartOfSpeech}
                  onChange={dialog.onShowPartOfSpeechChange}
                />
                <span className="learn-session-dialog__toggle-copy">
                  <span className="learn-session-dialog__toggle-title">
                    <FiType aria-hidden="true" />
                    <strong>Part of speech</strong>
                  </span>
                  <small>Show grammar context next to the answer.</small>
                </span>
              </label>
            </div>
          </section>
        </div>

        <footer className="learn-session-dialog__footer">
          <Button variant="secondary" onClick={dialog.onClose}>
            Close
          </Button>
        </footer>
      </section>
    </div>
  );
});

LearnSessionSettingsDialog.displayName = "LearnSessionSettingsDialog";
