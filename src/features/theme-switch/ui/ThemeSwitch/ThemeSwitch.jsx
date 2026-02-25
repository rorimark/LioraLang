import { memo } from "react";
import "./ThemeSwitch.css";

export const ThemeSwitch = memo(({ isDarkTheme, onToggle }) => {
  return (
    <button
      type="button"
      className={isDarkTheme ? "theme-switch theme-switch--dark" : "theme-switch"}
      onClick={onToggle}
      aria-pressed={isDarkTheme}
    >
      <span className="theme-switch__label">
        Theme: {isDarkTheme ? "Dark" : "Light"}
      </span>
      <span className="theme-switch__track" aria-hidden>
        <span className="theme-switch__thumb" />
      </span>
    </button>
  );
});

ThemeSwitch.displayName = "ThemeSwitch";
