import { memo } from "react";
import { useShortcutSettingsSection } from "../../model";
import "./ShortcutSettingsSection.css";

export const ShortcutSettingsSection = memo(() => {
  const {
    historyShortcutMode,
    learnFlipShortcutMode,
    learnNavigationShortcutMode,
    historyOptions,
    flipOptions,
    navigationOptions,
    handleHistoryShortcutChange,
    handleFlipShortcutChange,
    handleNavigationShortcutChange,
  } = useShortcutSettingsSection();

  return (
    <section className="shortcut-settings-section">
      <div className="shortcut-settings-section__head">
        <h3>Shortcuts</h3>
        <p>Saved automatically and applied instantly.</p>
      </div>

      <label className="shortcut-settings-section__field">
        <span className="shortcut-settings-section__label">History navigation</span>
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
        <span className="shortcut-settings-section__label">Next/previous flashcard</span>
        <select
          value={learnNavigationShortcutMode}
          onChange={handleNavigationShortcutChange}
        >
          {navigationOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
});

ShortcutSettingsSection.displayName = "ShortcutSettingsSection";
