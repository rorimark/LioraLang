import {
  LEARN_FLIP_SHORTCUT_MODES,
  LEARN_RATING_SHORTCUT_MODES,
} from "./shortcutSettings";

const RATING_KEYS_BY_MODE = {
  [LEARN_RATING_SHORTCUT_MODES.digits]: { again: "1", hard: "2", good: "3", easy: "4" },
  [LEARN_RATING_SHORTCUT_MODES.asdf]: { again: "A", hard: "S", good: "D", easy: "F" },
  [LEARN_RATING_SHORTCUT_MODES.arrows]: { again: "←", hard: "↓", good: "↑", easy: "→" },
};

// The key that flips the card, as it is printed on the key: "" when the
// shortcut is switched off, so nothing is shown.
export const resolveLearnFlipKeyLabel = (mode) => {
  if (mode === LEARN_FLIP_SHORTCUT_MODES.disabled) {
    return "";
  }

  return mode === LEARN_FLIP_SHORTCUT_MODES.enter ? "Enter" : "Space";
};

// The key for each grade, keyed by grade: {} when rating keys are off.
export const resolveLearnRatingKeyLabels = (mode) => RATING_KEYS_BY_MODE[mode] || {};
