import { memo } from "react";
import { SettingRow, SettingSegmented } from "@shared/ui";

export const ThemeSwitch = memo(({ control }) => {
  const resolvedControl = control || {};
  const options = (resolvedControl.themeModeOptions || []).map((option) => ({
    value: option.value,
    label: option.label.replace(/\s*\(Default\)$/, ""),
  }));

  return (
    <SettingRow
      label="Theme"
      hint="System follows your device."
      keywords="color colour scheme dark light mode appearance"
      control={
        <SettingSegmented
          name="theme-mode"
          value={resolvedControl.themeMode}
          options={options}
          onChange={resolvedControl.onThemeModeChange}
          ariaLabel="Theme"
        />
      }
    />
  );
});

ThemeSwitch.displayName = "ThemeSwitch";
