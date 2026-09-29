import { memo, useId } from "react";
import { SettingRow, SettingSegmented, SettingSelect, SettingSwitch } from "@shared/ui";
import { useShortcutSettingsSection } from "../../model";
import { useI18n } from "@shared/lib/i18n";

// "(default)" belongs in a long list; in a row of three segments it only
// crowds the key names, so segments use the short name.
const toSegments = (options) =>
  options.map((option) => ({ value: option.value, label: option.shortLabel || option.label }));

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
  const { t } = useI18n();
  const historyId = useId();
  const ratingId = useId();
  const hintsId = useId();

  return (
    <>
      <SettingRow
        label={t("shortcuts.flip")}
        keywords="keyboard keys shortcut space enter"
        control={
          <SettingSegmented
            name="learn-flip-shortcut"
            value={learnFlipShortcutMode}
            options={toSegments(flipOptions)}
            onChange={handleFlipShortcutChange}
            ariaLabel={t("shortcuts.flip")}
          />
        }
      />
      <SettingRow
        label={t("shortcuts.grade")}
        hint={t("shortcuts.gradeHint")}
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
        label={t("shortcuts.history")}
        hint={t("shortcuts.historyHint")}
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
        label={t("shortcuts.showKeys")}
        hint={t("shortcuts.showKeysHint")}
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
