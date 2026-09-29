import { memo } from "react";
import { SettingRow, SettingSegmented } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";

export const ThemeSwitch = memo(({ control }) => {
  const { t } = useI18n();
  const resolvedControl = control || {};
  const options = (resolvedControl.themeModeOptions || []).map((option) => ({
    value: option.value,
    label: t(`theme.${option.value}`),
  }));

  return (
    <SettingRow
      label={t("theme.label")}
      hint={t("theme.hint")}
      keywords="color colour scheme dark light mode appearance"
      control={
        <SettingSegmented
          name="theme-mode"
          value={resolvedControl.themeMode}
          options={options}
          onChange={resolvedControl.onThemeModeChange}
          ariaLabel={t("theme.label")}
        />
      }
    />
  );
});

ThemeSwitch.displayName = "ThemeSwitch";
