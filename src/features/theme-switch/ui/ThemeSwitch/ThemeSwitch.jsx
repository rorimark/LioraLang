import { memo } from "react";
import "./ThemeSwitch.css";

export const ThemeSwitch = memo(({ control }) => {
    const resolvedControl = control || {};

    return (
      <label className="theme-switch">
        <span className="theme-switch__label">Color scheme</span>
        <select
          className="theme-switch__select"
          value={resolvedControl.themeMode}
          onChange={resolvedControl.onThemeModeChange}
        >
          {(resolvedControl.themeModeOptions || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  });

ThemeSwitch.displayName = "ThemeSwitch";
