import { memo } from "react";
import "./ThemeSwitch.css";

export const ThemeSwitch = memo(
  ({ themeMode, themeModeOptions = [], onThemeModeChange }) => {
    return (
      <label className="theme-switch">
        <span className="theme-switch__label">Color scheme</span>
        <select
          className="theme-switch__select"
          value={themeMode}
          onChange={onThemeModeChange}
        >
          {themeModeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  },
);

ThemeSwitch.displayName = "ThemeSwitch";
