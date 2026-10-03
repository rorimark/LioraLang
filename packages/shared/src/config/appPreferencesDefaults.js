import { DEFAULT_AI_FEATURES } from "./aiFeatures.js";

export const DEFAULT_APP_PREFERENCES = Object.freeze({
  studySession: Object.freeze({
    defaultStudyMode: "review",
    dailyGoal: 20,
    autoFlipDelay: "off",
    shuffleMode: "per_session",
    repeatWrongCards: false,
  }),
  spacedRepetition: Object.freeze({
    newCardsPerDay: 20,
    maxReviewsPerDay: 100,
    learningSteps: "10m",
    // FSRS: the share of words to still know when they come back, and the
    // longest a word may wait between reviews.
    desiredRetention: 90,
    maximumIntervalDays: 365,
    // Read from older settings; the FSRS schedule does not use them.
    easyBonus: 130,
    lapsePenalty: 20,
  }),
  deckDefaults: Object.freeze({
    sourceLanguage: "English",
    targetLanguage: "Ukrainian",
    level: "A1",
    partOfSpeech: "noun",
    tags: Object.freeze([]),
    // Legacy preference, retained for migration and older clients only.
    wordSuggestions: true,
  }),
  aiAssistant: Object.freeze({ enabled: true }),
  aiFeatures: DEFAULT_AI_FEATURES,
  importExport: Object.freeze({
    autoOpenLanguageReview: false,
    duplicateStrategy: "skip",
    exportFormat: "lioradeck",
    includeExamples: true,
    includeTags: true,
  }),
  uiAccessibility: Object.freeze({
    interfaceLanguage: "auto",
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
  sync: Object.freeze({
    autoSync: true,
    syncOnLaunch: true,
    notifyOnError: true,
    keepLocalCopyOnConflict: true,
  }),
});
