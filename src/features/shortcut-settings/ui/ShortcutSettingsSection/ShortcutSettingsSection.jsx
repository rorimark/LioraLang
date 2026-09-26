import { memo, useId } from "react";
import { SettingRow, SettingSegmented, SettingSelect, SettingSwitch } from "@shared/ui";
import { useShortcutSettingsSection } from "../../model";

// "(Default)" belongs in a long list; in a row of three segments it only
// crowds the key names.
const toSegments = (options) =>
  options.map((option) => ({
    value: option.value,
    label: option.label.replace(/\s*\(Default\)$/, "").replace(/^Disabled$/, "Off"),
  }));

export const ShortcutSettingsSection = memo(() => {
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
  const historyId = useId();
  const ratingId = useId();
  const hintsId = useId();

  return (
    <>
      <SettingRow
        label="Flip the card"
        keywords="keyboard keys shortcut space enter"
        control={
          <SettingSegmented
            name="learn-flip-shortcut"
            value={learnFlipShortcutMode}
            options={toSegments(flipOptions)}
            onChange={handleFlipShortcutChange}
            ariaLabel="Flip the card"
          />
        }
      />
      <SettingRow
        label="Grade the card"
        hint="Again, Hard, Good, Easy, in that order."
        keywords="keyboard keys shortcut rating"
        controlId={ratingId}
        control={
          <SettingSelect
            id={ratingId}
            value={learnRatingShortcutMode}
            onChange={handleRatingShortcutChange}
          >
            {ratingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SettingSelect>
        }
      />
      <SettingRow
        label="Back and forward"
        hint="Move through the pages you opened."
        keywords="keyboard keys shortcut history navigation"
        controlId={historyId}
        control={
          <SettingSelect
            id={historyId}
            value={historyShortcutMode}
            onChange={handleHistoryShortcutChange}
          >
            {historyOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SettingSelect>
        }
      />
      <SettingRow
        label="Show keys on buttons"
        hint="The key for each action appears on its button in Learn."
        keywords="keyboard hints shortcut"
        controlId={hintsId}
        control={
          <SettingSwitch
            id={hintsId}
            checked={showLearnShortcuts}
            onChange={handleShowLearnShortcutsChange}
          />
        }
      />
    </>
  );
});

ShortcutSettingsSection.displayName = "ShortcutSettingsSection";
