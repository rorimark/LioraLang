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

export const LEARN_RATING_SHORTCUT_MODES = {
  digits: "digits",
  asdf: "asdf",
  arrows: "arrows",
  disabled: "disabled",
};

export const DEFAULT_SHORTCUT_SETTINGS = {
  historyNavigation: HISTORY_SHORTCUT_MODES.system,
  learnFlip: LEARN_FLIP_SHORTCUT_MODES.space,
  learnRating: LEARN_RATING_SHORTCUT_MODES.digits,
  showLearnShortcuts: true,
};

const normalizeBoolean = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
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

  return LEARN_NAV_SHORTCUT_MODES.arrows;
};

const normalizeLearnRatingMode = (value) => {
  if (
    value === LEARN_RATING_SHORTCUT_MODES.digits ||
    value === LEARN_RATING_SHORTCUT_MODES.asdf ||
    value === LEARN_RATING_SHORTCUT_MODES.arrows ||
    value === LEARN_RATING_SHORTCUT_MODES.disabled
  ) {
    return value;
  }

  return DEFAULT_SHORTCUT_SETTINGS.learnRating;
};

const mapLegacyNavigationToRating = (value) => {
  const legacyMode = normalizeLearnNavigationMode(value);

  if (legacyMode === LEARN_NAV_SHORTCUT_MODES.ad) {
    return LEARN_RATING_SHORTCUT_MODES.asdf;
  }

  if (legacyMode === LEARN_NAV_SHORTCUT_MODES.arrows) {
    return LEARN_RATING_SHORTCUT_MODES.arrows;
  }

  if (legacyMode === LEARN_NAV_SHORTCUT_MODES.disabled) {
    return LEARN_RATING_SHORTCUT_MODES.disabled;
  }

  return LEARN_RATING_SHORTCUT_MODES.digits;
};

export const normalizeShortcutSettings = (value = {}) => {
  const normalizedLearnRating =
    typeof value?.learnRating === "string"
      ? normalizeLearnRatingMode(value.learnRating)
      : mapLegacyNavigationToRating(value?.learnNavigation);

  return {
    historyNavigation: normalizeHistoryMode(value?.historyNavigation),
    learnFlip: normalizeLearnFlipMode(value?.learnFlip),
    learnRating: normalizedLearnRating,
    showLearnShortcuts: normalizeBoolean(
      value?.showLearnShortcuts,
      DEFAULT_SHORTCUT_SETTINGS.showLearnShortcuts,
    ),
  };
};
