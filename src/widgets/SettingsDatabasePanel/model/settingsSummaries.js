import { SETTINGS_TAB_KEYS } from "@shared/config/settingsTabs";

// One line per section, saying what it is set to now, so the list of
// sections doubles as an overview and most people never need to open one.

const THEME_LABELS = { system: "System theme", light: "Light theme", dark: "Dark theme" };
const TEXT_SIZE_LABELS = { small: "small text", normal: "normal text", large: "large text" };
const BACKUP_LABELS = {
  off: "No automatic backups",
  daily: "Backups daily",
  weekly: "Backups weekly",
  monthly: "Backups monthly",
};

const joinParts = (...parts) => parts.filter(Boolean).join(" · ");

export const buildSettingsSummaries = ({ appPreferences, themeMode, isDesktopMode = false }) => {
  if (!appPreferences) {
    return {};
  }

  const {
    studySession = {},
    spacedRepetition = {},
    deckDefaults = {},
    importExport = {},
    uiAccessibility = {},
    dataSafety = {},
    privacy = {},
    desktop = {},
    sync = {},
  } = appPreferences;

  return {
    [SETTINGS_TAB_KEYS.general]: joinParts(
      THEME_LABELS[themeMode] || THEME_LABELS.system,
      TEXT_SIZE_LABELS[uiAccessibility.fontScale],
      uiAccessibility.reducedMotion ? "reduced motion" : "",
    ),
    [SETTINGS_TAB_KEYS.learningCore]: joinParts(
      Number.isFinite(studySession.dailyGoal) ? `${studySession.dailyGoal} cards a day` : "",
      Number.isFinite(spacedRepetition.newCardsPerDay)
        ? `${spacedRepetition.newCardsPerDay} new`
        : "",
    ),
    [SETTINGS_TAB_KEYS.deckDefaults]:
      deckDefaults.sourceLanguage && deckDefaults.targetLanguage
        ? joinParts(
            `${deckDefaults.sourceLanguage} → ${deckDefaults.targetLanguage}`,
            deckDefaults.level,
          )
        : "",
    [SETTINGS_TAB_KEYS.sync]: sync.autoSync === false ? "Only when you sync" : "In the background",
    [SETTINGS_TAB_KEYS.importExport]: importExport.exportFormat
      ? `Exports as .${importExport.exportFormat}`
      : "",
    [SETTINGS_TAB_KEYS.workspaceSafety]: joinParts(
      BACKUP_LABELS[dataSafety.autoBackupInterval],
      dataSafety.confirmDestructive === false ? "no delete confirmation" : "",
    ),
    [SETTINGS_TAB_KEYS.advancedDesktop]: joinParts(
      isDesktopMode && desktop.launchAtStartup ? "Opens at login" : "",
      privacy.analyticsEnabled ? "Analytics on" : "Analytics off",
      privacy.crashReportsEnabled ? "crash reports on" : "crash reports off",
    ),
  };
};
