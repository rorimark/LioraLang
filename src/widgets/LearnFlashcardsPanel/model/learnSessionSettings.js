import { DEFAULT_APP_PREFERENCES } from "@shared/config/appPreferencesDefaults";

export const LEARN_SESSION_SETTINGS_SESSION_KEY = "learnSessionSettingsSession";
export const LEARN_SESSION_SETTINGS_LOCAL_KEY = "learnSessionSettingsLocal";
export const LEARN_SESSION_SETTINGS_STORAGE_VERSION = 2;

export const LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET = "source_to_target";
export const LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE = "target_to_source";
export const LEARN_SESSION_DIRECTION_MIXED = "mixed";

export const LEARN_EXERCISE_MODE_FLASHCARDS = "flashcards";
export const LEARN_EXERCISE_MODE_TYPE_TRANSLATION = "type_translation";
export const LEARN_EXERCISE_MODE_FILL_GAP = "fill_gap";
export const LEARN_EXERCISE_MODE_MULTIPLE_CHOICE = "multiple_choice";

const DIRECTION_MODE_OPTIONS = new Set([
  LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
  LEARN_SESSION_DIRECTION_MIXED,
]);

const EXERCISE_MODE_OPTIONS = new Set([
  LEARN_EXERCISE_MODE_FLASHCARDS,
  LEARN_EXERCISE_MODE_TYPE_TRANSLATION,
  LEARN_EXERCISE_MODE_FILL_GAP,
  LEARN_EXERCISE_MODE_MULTIPLE_CHOICE,
]);

const AUTO_FLIP_OPTIONS = new Set(["off", "1s", "2s", "3s"]);
const SHUFFLE_MODE_OPTIONS = new Set(["off", "per_session", "always"]);
const LOCAL_ONLY_SESSION_KEYS = Object.freeze([
  "directionMode",
  "exerciseMode",
  "showExamples",
  "showLevel",
  "showPartOfSpeech",
]);

export const createLearnSessionSettingsDefaults = (appPreferences = {}) => {
  const studySession = appPreferences?.studySession || {};

  return {
    directionMode: LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
    exerciseMode: LEARN_EXERCISE_MODE_FLASHCARDS,
    dailyGoal: Number(studySession?.dailyGoal) || DEFAULT_APP_PREFERENCES.studySession.dailyGoal,
    autoFlipDelay:
      typeof studySession?.autoFlipDelay === "string" &&
      AUTO_FLIP_OPTIONS.has(studySession.autoFlipDelay)
        ? studySession.autoFlipDelay
        : DEFAULT_APP_PREFERENCES.studySession.autoFlipDelay,
    shuffleMode:
      typeof studySession?.shuffleMode === "string" &&
      SHUFFLE_MODE_OPTIONS.has(studySession.shuffleMode)
        ? studySession.shuffleMode
        : DEFAULT_APP_PREFERENCES.studySession.shuffleMode,
    repeatWrongCards:
      typeof studySession?.repeatWrongCards === "boolean"
        ? studySession.repeatWrongCards
        : DEFAULT_APP_PREFERENCES.studySession.repeatWrongCards,
    showExamples: false,
    showLevel: false,
    showPartOfSpeech: false,
  };
};

export const pickLocalOnlyLearnSessionSettings = (value = {}) => {
  return LOCAL_ONLY_SESSION_KEYS.reduce((result, key) => {
    if (Object.hasOwn(value, key)) {
      result[key] = value[key];
    }

    return result;
  }, {});
};

const toOneOf = (value, options, fallback) => {
  return options.has(value) ? value : fallback;
};

const toBoolean = (value, fallback) => {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
};

const toNumberInRange = (value, { fallback, min, max }) => {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  if (numeric < min) {
    return min;
  }

  if (numeric > max) {
    return max;
  }

  return Math.round(numeric);
};

export const normalizeLearnSessionSettings = (
  value = {},
  appPreferences = {},
) => {
  const defaults = createLearnSessionSettingsDefaults(appPreferences);

  return {
    directionMode: toOneOf(
      value?.directionMode,
      DIRECTION_MODE_OPTIONS,
      defaults.directionMode,
    ),
    exerciseMode: toOneOf(
      value?.exerciseMode,
      EXERCISE_MODE_OPTIONS,
      defaults.exerciseMode,
    ),
    dailyGoal: toNumberInRange(value?.dailyGoal, {
      fallback: defaults.dailyGoal,
      min: 1,
      max: 999,
    }),
    autoFlipDelay: toOneOf(
      value?.autoFlipDelay,
      AUTO_FLIP_OPTIONS,
      defaults.autoFlipDelay,
    ),
    shuffleMode: toOneOf(
      value?.shuffleMode,
      SHUFFLE_MODE_OPTIONS,
      defaults.shuffleMode,
    ),
    repeatWrongCards: toBoolean(
      value?.repeatWrongCards,
      defaults.repeatWrongCards,
    ),
    showExamples: toBoolean(value?.showExamples, defaults.showExamples),
    showLevel: toBoolean(value?.showLevel, defaults.showLevel),
    showPartOfSpeech: toBoolean(
      value?.showPartOfSpeech,
      defaults.showPartOfSpeech,
    ),
  };
};

const readStoredPayload = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(
      LEARN_SESSION_SETTINGS_SESSION_KEY,
    );

    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore invalid session payload
  }

  try {
    const raw = window.localStorage.getItem(LEARN_SESSION_SETTINGS_LOCAL_KEY);

    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore invalid local payload
  }

  return null;
};

const migrateStoredPayload = (payload) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if (payload.version === LEARN_SESSION_SETTINGS_STORAGE_VERSION) {
    return payload;
  }

  return {
    ...payload,
    showExamples: false,
    showLevel: false,
    showPartOfSpeech: false,
    version: LEARN_SESSION_SETTINGS_STORAGE_VERSION,
  };
};

export const readLearnSessionSettingsFromStorage = (appPreferences = {}) => {
  const payload = migrateStoredPayload(readStoredPayload());

  if (!payload) {
    return createLearnSessionSettingsDefaults(appPreferences);
  }

  return normalizeLearnSessionSettings(
    pickLocalOnlyLearnSessionSettings(payload),
    appPreferences,
  );
};

export const writeLearnSessionSettingsToStorage = (
  value,
  appPreferences = {},
) => {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = normalizeLearnSessionSettings(value, appPreferences);
  const payload = {
    ...pickLocalOnlyLearnSessionSettings(normalized),
    version: LEARN_SESSION_SETTINGS_STORAGE_VERSION,
  };

  try {
    window.sessionStorage.setItem(
      LEARN_SESSION_SETTINGS_SESSION_KEY,
      JSON.stringify(payload),
    );
    window.localStorage.setItem(
      LEARN_SESSION_SETTINGS_LOCAL_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // ignore storage failures
  }
};

const hashValue = (value) => {
  const source = String(value || "");
  let hash = 0;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0;
  }

  return hash;
};

export const resolveEffectiveDirectionMode = (
  directionMode = LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  word = {},
) => {
  if (directionMode !== LEARN_SESSION_DIRECTION_MIXED) {
    return directionMode;
  }

  const mixedSeed =
    word?.wordId ??
    word?.id ??
    word?.externalId ??
    word?.source ??
    word?.target ??
    "";

  return hashValue(mixedSeed) % 2 === 0
    ? LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET
    : LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE;
};
