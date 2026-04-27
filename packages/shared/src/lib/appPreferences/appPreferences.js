import { DEFAULT_APP_PREFERENCES } from "@shared/config/appPreferencesDefaults";
import { APP_PREFERENCES_APP_KEY } from "./constants";

export { DEFAULT_APP_PREFERENCES };

const LEVEL_OPTIONS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);
const PART_OF_SPEECH_OPTIONS = new Set([
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "interjection",
  "phrase",
  "other",
]);
const AUTO_FLIP_OPTIONS = new Set(["off", "1s", "2s", "3s"]);
const SHUFFLE_MODE_OPTIONS = new Set(["off", "per_session", "always"]);
const DEFAULT_STUDY_MODE_OPTIONS = new Set(["review", "srs"]);
const DUPLICATE_STRATEGY_OPTIONS = new Set(["skip", "update", "keep_both"]);
const EXPORT_FORMAT_OPTIONS = new Set(["lioradeck", "json"]);
const FONT_SCALE_OPTIONS = new Set(["small", "normal", "large"]);
const THEME_MODE_OPTIONS = new Set(["system", "light", "dark"]);
const BACKUP_INTERVAL_OPTIONS = new Set(["off", "daily", "weekly", "monthly"]);
const UPDATE_CHANNEL_OPTIONS = new Set(["stable", "beta"]);
const LOG_LEVEL_OPTIONS = new Set(["off", "error", "warn", "debug"]);

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
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

const toOneOf = (value, options, fallback) => {
  return options.has(value) ? value : fallback;
};

const normalizeTags = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueTags = [];
  const seen = new Set();

  value.forEach((tag) => {
    const normalizedTag = toCleanString(tag);
    const normalizedKey = normalizedTag.toLowerCase();

    if (!normalizedTag || seen.has(normalizedKey)) {
      return;
    }

    seen.add(normalizedKey);
    uniqueTags.push(normalizedTag);
  });

  return uniqueTags.slice(0, 10);
};

export const normalizeAppPreferences = (value = {}) => {
  return {
    studySession: {
      defaultStudyMode: toOneOf(
        value?.studySession?.defaultStudyMode,
        DEFAULT_STUDY_MODE_OPTIONS,
        DEFAULT_APP_PREFERENCES.studySession.defaultStudyMode,
      ),
      dailyGoal: toNumberInRange(value?.studySession?.dailyGoal, {
        fallback: DEFAULT_APP_PREFERENCES.studySession.dailyGoal,
        min: 1,
        max: 999,
      }),
      autoFlipDelay: toOneOf(
        value?.studySession?.autoFlipDelay,
        AUTO_FLIP_OPTIONS,
        DEFAULT_APP_PREFERENCES.studySession.autoFlipDelay,
      ),
      shuffleMode: toOneOf(
        value?.studySession?.shuffleMode,
        SHUFFLE_MODE_OPTIONS,
        DEFAULT_APP_PREFERENCES.studySession.shuffleMode,
      ),
      repeatWrongCards: toBoolean(
        value?.studySession?.repeatWrongCards,
        DEFAULT_APP_PREFERENCES.studySession.repeatWrongCards,
      ),
    },
    spacedRepetition: {
      newCardsPerDay: toNumberInRange(value?.spacedRepetition?.newCardsPerDay, {
        fallback: DEFAULT_APP_PREFERENCES.spacedRepetition.newCardsPerDay,
        min: 1,
        max: 999,
      }),
      maxReviewsPerDay: toNumberInRange(
        value?.spacedRepetition?.maxReviewsPerDay,
        {
          fallback: DEFAULT_APP_PREFERENCES.spacedRepetition.maxReviewsPerDay,
          min: 1,
          max: 2000,
        },
      ),
      learningSteps:
        toCleanString(value?.spacedRepetition?.learningSteps) ||
        DEFAULT_APP_PREFERENCES.spacedRepetition.learningSteps,
      easyBonus: toNumberInRange(value?.spacedRepetition?.easyBonus, {
        fallback: DEFAULT_APP_PREFERENCES.spacedRepetition.easyBonus,
        min: 100,
        max: 300,
      }),
      lapsePenalty: toNumberInRange(value?.spacedRepetition?.lapsePenalty, {
        fallback: DEFAULT_APP_PREFERENCES.spacedRepetition.lapsePenalty,
        min: 10,
        max: 100,
      }),
    },
    deckDefaults: {
      sourceLanguage:
        toCleanString(value?.deckDefaults?.sourceLanguage) ||
        DEFAULT_APP_PREFERENCES.deckDefaults.sourceLanguage,
      targetLanguage:
        toCleanString(value?.deckDefaults?.targetLanguage) ||
        DEFAULT_APP_PREFERENCES.deckDefaults.targetLanguage,
      level: toOneOf(
        value?.deckDefaults?.level,
        LEVEL_OPTIONS,
        DEFAULT_APP_PREFERENCES.deckDefaults.level,
      ),
      partOfSpeech: toOneOf(
        value?.deckDefaults?.partOfSpeech,
        PART_OF_SPEECH_OPTIONS,
        DEFAULT_APP_PREFERENCES.deckDefaults.partOfSpeech,
      ),
      tags: normalizeTags(value?.deckDefaults?.tags),
    },
    importExport: {
      autoOpenLanguageReview: toBoolean(
        value?.importExport?.autoOpenLanguageReview,
        DEFAULT_APP_PREFERENCES.importExport.autoOpenLanguageReview,
      ),
      duplicateStrategy: toOneOf(
        value?.importExport?.duplicateStrategy,
        DUPLICATE_STRATEGY_OPTIONS,
        DEFAULT_APP_PREFERENCES.importExport.duplicateStrategy,
      ),
      exportFormat: toOneOf(
        value?.importExport?.exportFormat,
        EXPORT_FORMAT_OPTIONS,
        DEFAULT_APP_PREFERENCES.importExport.exportFormat,
      ),
      includeExamples: toBoolean(
        value?.importExport?.includeExamples,
        DEFAULT_APP_PREFERENCES.importExport.includeExamples,
      ),
      includeTags: toBoolean(
        value?.importExport?.includeTags,
        DEFAULT_APP_PREFERENCES.importExport.includeTags,
      ),
    },
    uiAccessibility: {
      themeMode: toOneOf(
        value?.uiAccessibility?.themeMode,
        THEME_MODE_OPTIONS,
        DEFAULT_APP_PREFERENCES.uiAccessibility.themeMode,
      ),
      fontScale: toOneOf(
        value?.uiAccessibility?.fontScale,
        FONT_SCALE_OPTIONS,
        DEFAULT_APP_PREFERENCES.uiAccessibility.fontScale,
      ),
      compactMode: toBoolean(
        value?.uiAccessibility?.compactMode,
        DEFAULT_APP_PREFERENCES.uiAccessibility.compactMode,
      ),
      reducedMotion: toBoolean(
        value?.uiAccessibility?.reducedMotion,
        DEFAULT_APP_PREFERENCES.uiAccessibility.reducedMotion,
      ),
      highContrast: toBoolean(
        value?.uiAccessibility?.highContrast,
        DEFAULT_APP_PREFERENCES.uiAccessibility.highContrast,
      ),
    },
    dataSafety: {
      autoBackupInterval: toOneOf(
        value?.dataSafety?.autoBackupInterval,
        BACKUP_INTERVAL_OPTIONS,
        DEFAULT_APP_PREFERENCES.dataSafety.autoBackupInterval,
      ),
      maxBackups: toNumberInRange(value?.dataSafety?.maxBackups, {
        fallback: DEFAULT_APP_PREFERENCES.dataSafety.maxBackups,
        min: 1,
        max: 100,
      }),
      confirmDestructive: toBoolean(
        value?.dataSafety?.confirmDestructive,
        DEFAULT_APP_PREFERENCES.dataSafety.confirmDestructive,
      ),
    },
    desktop: {
      launchAtStartup: toBoolean(
        value?.desktop?.launchAtStartup,
        DEFAULT_APP_PREFERENCES.desktop.launchAtStartup,
      ),
      minimizeToTray: toBoolean(
        value?.desktop?.minimizeToTray,
        DEFAULT_APP_PREFERENCES.desktop.minimizeToTray,
      ),
      hardwareAcceleration: toBoolean(
        value?.desktop?.hardwareAcceleration,
        DEFAULT_APP_PREFERENCES.desktop.hardwareAcceleration,
      ),
      devMode: toBoolean(
        value?.desktop?.devMode,
        DEFAULT_APP_PREFERENCES.desktop.devMode,
      ),
      updateChannel: toOneOf(
        value?.desktop?.updateChannel,
        UPDATE_CHANNEL_OPTIONS,
        DEFAULT_APP_PREFERENCES.desktop.updateChannel,
      ),
    },
    privacy: {
      analyticsEnabled: toBoolean(
        value?.privacy?.analyticsEnabled,
        DEFAULT_APP_PREFERENCES.privacy.analyticsEnabled,
      ),
      crashReportsEnabled: toBoolean(
        value?.privacy?.crashReportsEnabled,
        DEFAULT_APP_PREFERENCES.privacy.crashReportsEnabled,
      ),
      logLevel: toOneOf(
        value?.privacy?.logLevel,
        LOG_LEVEL_OPTIONS,
        DEFAULT_APP_PREFERENCES.privacy.logLevel,
      ),
    },
    sync: {
      autoSync: toBoolean(
        value?.sync?.autoSync,
        DEFAULT_APP_PREFERENCES.sync.autoSync,
      ),
      syncOnLaunch: toBoolean(
        value?.sync?.syncOnLaunch,
        DEFAULT_APP_PREFERENCES.sync.syncOnLaunch,
      ),
      notifyOnError: toBoolean(
        value?.sync?.notifyOnError,
        DEFAULT_APP_PREFERENCES.sync.notifyOnError,
      ),
      keepLocalCopyOnConflict: toBoolean(
        value?.sync?.keepLocalCopyOnConflict,
        DEFAULT_APP_PREFERENCES.sync.keepLocalCopyOnConflict,
      ),
    },
  };
};

export const mergeAppPreferences = (currentValue = {}, patch = {}) => {
  const current = normalizeAppPreferences(currentValue);
  const next = { ...current };

  Object.entries(patch || {}).forEach(([sectionKey, sectionValue]) => {
    if (!sectionValue || typeof sectionValue !== "object" || Array.isArray(sectionValue)) {
      return;
    }

    next[sectionKey] = {
      ...(next[sectionKey] || {}),
      ...sectionValue,
    };
  });

  return normalizeAppPreferences(next);
};
