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
import { Button, Select } from "@shared/ui";
import {
  LEARN_EXERCISE_MODE_FILL_GAP,
  LEARN_EXERCISE_MODE_FLASHCARDS,
  LEARN_EXERCISE_MODE_MULTIPLE_CHOICE,
  LEARN_EXERCISE_MODE_TYPE_TRANSLATION,
  LEARN_SESSION_DIRECTION_MIXED,
  LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
} from "../../model/learnSessionSettings";
import { resolveDeckSideLabels } from "../../model/deckSideLabels";
import "./LearnSessionSettingsDialog.css";
import { useI18n } from "@shared/lib/i18n";

// Titles and descriptions are messages under session.*.
const EXERCISE_MODE_OPTIONS = Object.freeze([
  { value: LEARN_EXERCISE_MODE_FLASHCARDS, key: "flashcards", available: true },
  { value: LEARN_EXERCISE_MODE_TYPE_TRANSLATION, key: "typeTranslation", available: false },
  { value: LEARN_EXERCISE_MODE_FILL_GAP, key: "fillGap", available: false },
  { value: LEARN_EXERCISE_MODE_MULTIPLE_CHOICE, key: "multipleChoice", available: false },
]);

const AUTO_FLIP_OPTIONS = Object.freeze([
  { value: "off", seconds: 0 },
  { value: "1s", seconds: 1 },
  { value: "2s", seconds: 2 },
  { value: "3s", seconds: 3 },
]);

const SHUFFLE_OPTIONS = Object.freeze(["off", "per_session", "always"]);

// A picture side is named "Picture" in the options, the same way the desk
// names it, so "Picture → Polish" reads as the deck is.
const resolveDirectionOptions = (deck = {}, i18n) => {
  const { t } = i18n;
  const { source, target } = resolveDeckSideLabels(deck, i18n);

  return [
    {
      value: LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
      title: `${source} → ${target}`,
      description: t("session.direction.forward"),
    },
    {
      value: LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
      title: `${target} → ${source}`,
      description: t("session.direction.reverse"),
    },
    {
      value: LEARN_SESSION_DIRECTION_MIXED,
      title: `${source} ↔ ${target}`,
      description: t("session.direction.mixed"),
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
  const { t } = useI18n();

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
          <span className="learn-session-dialog__option-badge">{t("common.soon")}</span>
        ) : null}
      </span>
      <span>{description}</span>
    </button>
  );
});

OptionCard.displayName = "OptionCard";

export const LearnSessionSettingsDialog = memo(({ sessionControl }) => {
  const i18n = useI18n();
  const { t } = i18n;
  const dialog = sessionControl || {};
  const currentDeck = useMemo(() => dialog.currentDeck || null, [dialog.currentDeck]);
  const sessionSettings = dialog.sessionSettings || {};
  const contentRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const directionOptions = useMemo(
    () => resolveDirectionOptions(currentDeck, i18n),
    [currentDeck, i18n],
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
              <h2 id={titleId}>{t("learn.sessionSettings")}</h2>
              <p id={descriptionId}>{dialog.sessionSummary}</p>
            </div>
          </div>
          <button
            type="button"
            className="learn-session-dialog__close"
            onClick={dialog.onClose}
            aria-label={t("session.close")}
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
                <span>{t("session.engine.title")}</span>
              </h3>
            </div>
            <div className="learn-session-dialog__options-grid learn-session-dialog__options-grid--two">
              <OptionCard
                title={t("learn.engine.review")}
                description={t("session.engine.reviewDescription")}
                selected={dialog.learnViewMode === "browse"}
                onClick={dialog.onSwitchToBrowseMode}
              />
              <OptionCard
                title={t("learn.engine.srs")}
                description={t("session.engine.srsDescription")}
                selected={dialog.learnViewMode === "srs"}
                onClick={dialog.onSwitchToSrsMode}
              />
            </div>
          </section>

          <section className="learn-session-dialog__section">
            <div className="learn-session-dialog__section-head">
              <h3 className="learn-session-dialog__section-title">
                <FiType aria-hidden="true" />
                <span>{t("session.exercise.title")}</span>
              </h3>
            </div>
            <div className="learn-session-dialog__options-grid learn-session-dialog__options-grid--two">
              {EXERCISE_MODE_OPTIONS.map((option) => (
                <OptionCard
                  key={option.value}
                  title={t(`session.exercise.${option.key}.title`)}
                  description={t(`session.exercise.${option.key}.description`)}
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
                <span>{t("session.direction.title")}</span>
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
                <span>{t("session.behavior")}</span>
              </h3>
            </div>
            <div className="learn-session-dialog__fields-grid">
              <label className="learn-session-dialog__field">
                <span>
                  <FiTarget aria-hidden="true" />
                  <span>{t("session.dailyGoal")}</span>
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
                  <span>{t("session.autoFlip")}</span>
                </span>
                <Select
                  value={sessionSettings.autoFlipDelay}
                  onChange={dialog.onAutoFlipDelayChange}
                >
                  {AUTO_FLIP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.seconds ? t("session.seconds", { count: option.seconds }) : t("session.off")}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="learn-session-dialog__field">
                <span>
                  <FiShuffle aria-hidden="true" />
                  <span>{t("session.shuffle.title")}</span>
                </span>
                <Select
                  value={sessionSettings.shuffleMode}
                  onChange={dialog.onShuffleModeChange}
                >
                  {SHUFFLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {t(`session.shuffle.${option}`)}
                    </option>
                  ))}
                </Select>
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
                    <strong>{t("session.repeatMissed.title")}</strong>
                  </span>
                  <small>{t("session.repeatMissed.hint")}</small>
                </span>
              </label>
            </div>
          </section>

          <section className="learn-session-dialog__section">
            <div className="learn-session-dialog__section-head">
              <h3 className="learn-session-dialog__section-title">
                <FiEye aria-hidden="true" />
                <span>{t("session.cardDetails")}</span>
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
                    <strong>{t("session.examples.title")}</strong>
                  </span>
                  <small>{t("session.examples.hint")}</small>
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
                    <strong>{t("session.level.title")}</strong>
                  </span>
                  <small>{t("session.level.hint")}</small>
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
                    <strong>{t("session.partOfSpeech.title")}</strong>
                  </span>
                  <small>{t("session.partOfSpeech.hint")}</small>
                </span>
              </label>
            </div>
          </section>
        </div>

        <footer className="learn-session-dialog__footer">
          <Button variant="secondary" onClick={dialog.onClose}>
            {t("common.close")}
          </Button>
        </footer>
      </section>
    </div>
  );
});

LearnSessionSettingsDialog.displayName = "LearnSessionSettingsDialog";
