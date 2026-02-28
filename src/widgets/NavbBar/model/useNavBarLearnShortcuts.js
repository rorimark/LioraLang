import { useMemo } from "react";
import {
  LEARN_FLIP_SHORTCUT_MODES,
  LEARN_RATING_SHORTCUT_MODES,
  useShortcutSettings,
} from "@shared/lib/shortcutSettings";

const LEARN_SHORTCUT_ACTIONS = [
  { key: "again", label: "Again" },
  { key: "hard", label: "Hard" },
  { key: "good", label: "Good" },
  { key: "easy", label: "Easy" },
];

const RATING_SHORTCUT_KEYS_BY_MODE = {
  [LEARN_RATING_SHORTCUT_MODES.digits]: {
    again: "1",
    hard: "2",
    good: "3",
    easy: "4",
  },
  [LEARN_RATING_SHORTCUT_MODES.asdf]: {
    again: "A",
    hard: "S",
    good: "D",
    easy: "F",
  },
  [LEARN_RATING_SHORTCUT_MODES.arrows]: {
    again: "←",
    hard: "↓",
    good: "↑",
    easy: "→",
  },
};

const resolveFlipShortcutLabel = (mode) => {
  if (mode === LEARN_FLIP_SHORTCUT_MODES.enter) {
    return "Enter";
  }

  if (mode === LEARN_FLIP_SHORTCUT_MODES.disabled) {
    return "Off";
  }

  return "Space";
};

const buildLearnShortcutLegend = (flipMode, ratingMode) => {
  const legend = [
    {
      key: "flip",
      label: "Flip card",
      shortcut: resolveFlipShortcutLabel(flipMode),
    },
  ];

  const ratingShortcuts = RATING_SHORTCUT_KEYS_BY_MODE[ratingMode];

  if (!ratingShortcuts) {
    legend.push({
      key: "rate",
      label: "Rate card",
      shortcut: "Off",
    });
    return legend;
  }

  LEARN_SHORTCUT_ACTIONS.forEach((action) => {
    legend.push({
      key: action.key,
      label: action.label,
      shortcut: ratingShortcuts[action.key] || "-",
    });
  });

  return legend;
};

export const useNavBarLearnShortcuts = () => {
  const { shortcutSettings } = useShortcutSettings();
  const learnShortcutLegend = useMemo(
    () =>
      buildLearnShortcutLegend(
        shortcutSettings.learnFlip,
        shortcutSettings.learnRating,
      ),
    [shortcutSettings.learnFlip, shortcutSettings.learnRating],
  );

  return {
    learnShortcutLegend,
  };
};
