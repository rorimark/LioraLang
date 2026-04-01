export const DEFAULT_APP_PREFERENCES = {
  studySession: Object.freeze({
    dailyGoal: 20,
    autoFlipDelay: "off",
    shuffleMode: "per_session",
    repeatWrongCards: false,
  }),
  spacedRepetition: Object.freeze({
    newCardsPerDay: 20,
    maxReviewsPerDay: 100,
    learningSteps: "10m, 1d, 3d",
    easyBonus: 130,
    lapsePenalty: 70,
  }),
  deckDefaults: Object.freeze({
    sourceLanguage: "English",
    targetLanguage: "Ukrainian",
    level: "A1",
    partOfSpeech: "noun",
    tags: Object.freeze([]),
  }),
  importExport: Object.freeze({
    autoOpenLanguageReview: false,
    duplicateStrategy: "skip",
    exportFormat: "lioradeck",
    includeExamples: true,
    includeTags: true,
  }),
  uiAccessibility: Object.freeze({
    themeMode: "system",
    fontScale: "normal",
    compactMode: false,
    reducedMotion: false,
    highContrast: false,
  }),
  dataSafety: Object.freeze({
    autoBackupInterval: "weekly",
    maxBackups: 10,
    confirmDestructive: true,
  }),
  desktop: Object.freeze({
    launchAtStartup: false,
    minimizeToTray: false,
    hardwareAcceleration: true,
    devMode: false,
    updateChannel: "stable",
  }),
  privacy: Object.freeze({
    analyticsEnabled: false,
    crashReportsEnabled: true,
    logLevel: "off",
  }),

};
