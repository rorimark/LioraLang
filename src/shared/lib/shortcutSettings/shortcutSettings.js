export const SHORTCUT_SETTINGS_APP_KEY = "shortcutSettings";

export const HISTORY_SHORTCUT_MODES = {
  system: "system",
  alternative: "alternative",
  disabled: "disabled",
};

export const LEARN_FLIP_SHORTCUT_MODES = {
  space: "space",
  enter: "enter",
  disabled: "disabled",
};

export const LEARN_NAV_SHORTCUT_MODES = {
  arrows: "arrows",
  ad: "ad",
  jl: "jl",
  disabled: "disabled",
};

export const DEFAULT_SHORTCUT_SETTINGS = {
  historyNavigation: HISTORY_SHORTCUT_MODES.system,
  learnFlip: LEARN_FLIP_SHORTCUT_MODES.space,
  learnNavigation: LEARN_NAV_SHORTCUT_MODES.arrows,
};

const normalizeHistoryMode = (value) => {
  if (
    value === HISTORY_SHORTCUT_MODES.system ||
    value === HISTORY_SHORTCUT_MODES.alternative ||
    value === HISTORY_SHORTCUT_MODES.disabled
  ) {
    return value;
  }

  return DEFAULT_SHORTCUT_SETTINGS.historyNavigation;
};

const normalizeLearnFlipMode = (value) => {
  if (
    value === LEARN_FLIP_SHORTCUT_MODES.space ||
    value === LEARN_FLIP_SHORTCUT_MODES.enter ||
    value === LEARN_FLIP_SHORTCUT_MODES.disabled
  ) {
    return value;
  }

  return DEFAULT_SHORTCUT_SETTINGS.learnFlip;
};

const normalizeLearnNavigationMode = (value) => {
  if (
    value === LEARN_NAV_SHORTCUT_MODES.arrows ||
    value === LEARN_NAV_SHORTCUT_MODES.ad ||
    value === LEARN_NAV_SHORTCUT_MODES.jl ||
    value === LEARN_NAV_SHORTCUT_MODES.disabled
  ) {
    return value;
  }

  return DEFAULT_SHORTCUT_SETTINGS.learnNavigation;
};

export const normalizeShortcutSettings = (value = {}) => {
  return {
    historyNavigation: normalizeHistoryMode(value?.historyNavigation),
    learnFlip: normalizeLearnFlipMode(value?.learnFlip),
    learnNavigation: normalizeLearnNavigationMode(value?.learnNavigation),
  };
};
