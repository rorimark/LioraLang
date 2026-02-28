import { memo } from "react";
import { useShortcutSettingsSection } from "../../model";
import "./ShortcutSettingsSection.css";

export const ShortcutSettingsSection = memo(({ compact = false }) => {
  const {
    historyShortcutMode,
    learnFlipShortcutMode,
    learnRatingShortcutMode,
    historyOptions,
    flipOptions,
    ratingOptions,
    showLearnShortcuts,
    handleHistoryShortcutChange,
    handleFlipShortcutChange,
    handleRatingShortcutChange,
    handleShowLearnShortcutsChange,
  } = useShortcutSettingsSection();

  return (
    <section
      className={
        compact
          ? "shortcut-settings-section shortcut-settings-section--compact"
          : "shortcut-settings-section"
      }
    >
      {!compact && (
        <div className="shortcut-settings-section__head">
          <h3>Shortcuts</h3>
          <p>Saved automatically and applied instantly.</p>
        </div>
      )}

      <label className="shortcut-settings-section__field">
        <span className="shortcut-settings-section__label">
          History navigation
        </span>
        <select
          value={historyShortcutMode}
          onChange={handleHistoryShortcutChange}
        >
          {historyOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="shortcut-settings-section__field">
        <span className="shortcut-settings-section__label">Flip flashcard</span>
        <select
          value={learnFlipShortcutMode}
          onChange={handleFlipShortcutChange}
        >
          {flipOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="shortcut-settings-section__field">
        <span className="shortcut-settings-section__label">Rate flashcard</span>
        <select
          value={learnRatingShortcutMode}
          onChange={handleRatingShortcutChange}
        >
          {ratingOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="shortcut-settings-section__check">
        <input
          type="checkbox"
          checked={showLearnShortcuts}
          onChange={handleShowLearnShortcutsChange}
        />
        <span>Show shortcut hints</span>
      </label>
    </section>
  );
});

ShortcutSettingsSection.displayName = "ShortcutSettingsSection";
