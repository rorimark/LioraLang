export const APP_PREFERENCES_SETTINGS_KEY = "appPreferences";

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

const toIntegerInRange = (value, min, max, fallback) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  if (numericValue < min) {
    return min;
  }

  if (numericValue > max) {
    return max;
  }

  return Math.round(numericValue);
};

const normalizeUniqueTags = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueTags = [];
  const seen = new Set();

  value.forEach((item) => {
    const tag = toCleanString(item);
    const tagKey = tag.toLowerCase();

    if (!tag || seen.has(tagKey)) {
      return;
    }

    seen.add(tagKey);
    uniqueTags.push(tag);
  });

  return uniqueTags.slice(0, 10);
};

export const createRuntimePreferencesManager = ({
  Database,
  fs,
  path,
  app,
  dbFileName,
  defaultAppPreferences,
  readStoredDbPath,
  backupIntervals,
  logLevels,
}) => {
  const defaultRuntimeAppPreferences = {
    studySession: {
      dailyGoal: defaultAppPreferences.studySession.dailyGoal,
      repeatWrongCards: defaultAppPreferences.studySession.repeatWrongCards,
    },
    deckDefaults: {
      sourceLanguage: defaultAppPreferences.deckDefaults.sourceLanguage,
      targetLanguage: defaultAppPreferences.deckDefaults.targetLanguage,
      level: defaultAppPreferences.deckDefaults.level,
      partOfSpeech: defaultAppPreferences.deckDefaults.partOfSpeech,
      tags: [],
    },
    importExport: {
      autoOpenLanguageReview: defaultAppPreferences.importExport.autoOpenLanguageReview,
      duplicateStrategy: defaultAppPreferences.importExport.duplicateStrategy,
      exportFormat: defaultAppPreferences.importExport.exportFormat,
      includeExamples: defaultAppPreferences.importExport.includeExamples,
      includeTags: defaultAppPreferences.importExport.includeTags,
    },
    dataSafety: {
      autoBackupInterval: defaultAppPreferences.dataSafety.autoBackupInterval,
      maxBackups: defaultAppPreferences.dataSafety.maxBackups,
      confirmDestructive: defaultAppPreferences.dataSafety.confirmDestructive,
    },
    desktop: {
      launchAtStartup: defaultAppPreferences.desktop.launchAtStartup,
      minimizeToTray: defaultAppPreferences.desktop.minimizeToTray,
      hardwareAcceleration: defaultAppPreferences.desktop.hardwareAcceleration,
      devMode: defaultAppPreferences.desktop.devMode,
      updateChannel: defaultAppPreferences.desktop.updateChannel,
    },
    privacy: {
      analyticsEnabled: defaultAppPreferences.privacy.analyticsEnabled,
      crashReportsEnabled: defaultAppPreferences.privacy.crashReportsEnabled,
      logLevel: defaultAppPreferences.privacy.logLevel,
    },
  };

  const normalizeAppPreferencesForMain = (value = {}) => {
    const raw = value && typeof value === "object" ? value : {};
    const dataSafetyInterval = toCleanString(raw?.dataSafety?.autoBackupInterval);
    const backupInterval = Object.hasOwn(backupIntervals, dataSafetyInterval)
      ? dataSafetyInterval
      : defaultRuntimeAppPreferences.dataSafety.autoBackupInterval;
    const duplicateStrategy = ["skip", "update", "keep_both"].includes(
      raw?.importExport?.duplicateStrategy,
    )
      ? raw.importExport.duplicateStrategy
      : defaultRuntimeAppPreferences.importExport.duplicateStrategy;
    const exportFormat = ["lioradeck", "json"].includes(raw?.importExport?.exportFormat)
      ? raw.importExport.exportFormat
      : defaultRuntimeAppPreferences.importExport.exportFormat;
    const updateChannel = ["stable", "beta"].includes(raw?.desktop?.updateChannel)
      ? raw.desktop.updateChannel
      : defaultRuntimeAppPreferences.desktop.updateChannel;
    const logLevel = Object.hasOwn(logLevels, raw?.privacy?.logLevel)
      ? raw.privacy.logLevel
      : defaultRuntimeAppPreferences.privacy.logLevel;

    return {
      studySession: {
        dailyGoal: toIntegerInRange(
          raw?.studySession?.dailyGoal,
          1,
          999,
          defaultRuntimeAppPreferences.studySession.dailyGoal,
        ),
        repeatWrongCards: toBoolean(
          raw?.studySession?.repeatWrongCards,
          defaultRuntimeAppPreferences.studySession.repeatWrongCards,
        ),
      },
      deckDefaults: {
        sourceLanguage:
          toCleanString(raw?.deckDefaults?.sourceLanguage) ||
          defaultRuntimeAppPreferences.deckDefaults.sourceLanguage,
        targetLanguage:
          toCleanString(raw?.deckDefaults?.targetLanguage) ||
          defaultRuntimeAppPreferences.deckDefaults.targetLanguage,
        level:
          toCleanString(raw?.deckDefaults?.level) ||
          defaultRuntimeAppPreferences.deckDefaults.level,
        partOfSpeech:
          toCleanString(raw?.deckDefaults?.partOfSpeech) ||
          defaultRuntimeAppPreferences.deckDefaults.partOfSpeech,
        tags: normalizeUniqueTags(raw?.deckDefaults?.tags),
      },
      importExport: {
        autoOpenLanguageReview: toBoolean(
          raw?.importExport?.autoOpenLanguageReview,
          defaultRuntimeAppPreferences.importExport.autoOpenLanguageReview,
        ),
        duplicateStrategy,
        exportFormat,
        includeExamples: toBoolean(
          raw?.importExport?.includeExamples,
          defaultRuntimeAppPreferences.importExport.includeExamples,
        ),
        includeTags: toBoolean(
          raw?.importExport?.includeTags,
          defaultRuntimeAppPreferences.importExport.includeTags,
        ),
      },
      dataSafety: {
        autoBackupInterval: backupInterval,
        maxBackups: toIntegerInRange(
          raw?.dataSafety?.maxBackups,
          1,
          100,
          defaultRuntimeAppPreferences.dataSafety.maxBackups,
        ),
        confirmDestructive: toBoolean(
          raw?.dataSafety?.confirmDestructive,
          defaultRuntimeAppPreferences.dataSafety.confirmDestructive,
        ),
      },
      desktop: {
        launchAtStartup: toBoolean(
          raw?.desktop?.launchAtStartup,
          defaultRuntimeAppPreferences.desktop.launchAtStartup,
        ),
        minimizeToTray: toBoolean(
          raw?.desktop?.minimizeToTray,
          defaultRuntimeAppPreferences.desktop.minimizeToTray,
        ),
        hardwareAcceleration: toBoolean(
          raw?.desktop?.hardwareAcceleration,
          defaultRuntimeAppPreferences.desktop.hardwareAcceleration,
        ),
        devMode: toBoolean(
          raw?.desktop?.devMode,
          defaultRuntimeAppPreferences.desktop.devMode,
        ),
        updateChannel,
      },
      privacy: {
        analyticsEnabled: toBoolean(
          raw?.privacy?.analyticsEnabled,
          defaultRuntimeAppPreferences.privacy.analyticsEnabled,
        ),
        crashReportsEnabled: toBoolean(
          raw?.privacy?.crashReportsEnabled,
          defaultRuntimeAppPreferences.privacy.crashReportsEnabled,
        ),
        logLevel,
      },
    };
  };

  const extractAppPreferencesFromSettings = (settings = {}) => {
    const nextPreferences = settings?.[APP_PREFERENCES_SETTINGS_KEY];
    return normalizeAppPreferencesForMain(nextPreferences);
  };

  const getDefaultDbPath = () => {
    return path.join(app.getPath("userData"), "data", dbFileName);
  };

  const resolveActiveDbPath = () => {
    const storedDbPath = readStoredDbPath(app.getPath("userData"));
    return storedDbPath || getDefaultDbPath();
  };

  const readAppPreferencesFromDatabaseFile = (dbFilePath) => {
    if (typeof dbFilePath !== "string" || !dbFilePath || !fs.existsSync(dbFilePath)) {
      return defaultRuntimeAppPreferences;
    }

    let db = null;

    try {
      db = new Database(dbFilePath, {
        readonly: true,
        fileMustExist: true,
      });
      const row = db
        .prepare("SELECT value FROM app_settings WHERE key = ?")
        .get(APP_PREFERENCES_SETTINGS_KEY);

      if (!row || typeof row.value !== "string") {
        return defaultRuntimeAppPreferences;
      }

      const parsedValue = JSON.parse(row.value);
      return normalizeAppPreferencesForMain(parsedValue);
    } catch {
      return defaultRuntimeAppPreferences;
    } finally {
      try {
        db?.close();
      } catch {
        // no-op
      }
    }
  };

  const resolveBootstrapAppPreferences = () => {
    try {
      const bootstrapDbPath = resolveActiveDbPath();
      return readAppPreferencesFromDatabaseFile(bootstrapDbPath);
    } catch {
      return defaultRuntimeAppPreferences;
    }
  };

  return {
    defaultRuntimeAppPreferences,
    extractAppPreferencesFromSettings,
    resolveActiveDbPath,
    resolveBootstrapAppPreferences,
    toCleanString,
  };
};
