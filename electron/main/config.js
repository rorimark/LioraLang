export const APP_HOMEPAGE_URL = "https://github.com/rorimark/LioraLang";
export const SETTINGS_ROUTE_PATH = "/app/settings";
export const SETTINGS_MENU_TABS = [
  {
    key: "general",
    label: "General",
    sectionId: "settings-general",
    accelerator: "CmdOrCtrl+,",
  },
  {
    key: "learning-core",
    label: "Learning core",
    sectionId: "settings-learning-core",
  },
  {
    key: "deck-defaults",
    label: "Deck defaults",
    sectionId: "settings-deck-defaults",
  },
  {
    key: "import-export",
    label: "Import and export",
    sectionId: "settings-import-export",
  },
  {
    key: "storage-integrity",
    label: "Storage and integrity",
    sectionId: "settings-storage-integrity",
  },
  {
    key: "workspace-safety",
    label: "Workspace and safety",
    sectionId: "settings-workspace-safety",
  },
  {
    key: "advanced-desktop",
    label: "Advanced desktop and privacy",
    sectionId: "settings-advanced-desktop",
  },
];

export const DB_FILE_NAME = "lioralang.db";

export const LOG_LEVELS = {
  off: "off",
  error: "error",
  warn: "warn",
  debug: "debug",
};

export const LOG_LEVEL_PRIORITY = {
  [LOG_LEVELS.off]: 0,
  [LOG_LEVELS.error]: 1,
  [LOG_LEVELS.warn]: 2,
  [LOG_LEVELS.debug]: 3,
};

export const BACKUP_INTERVAL_MS = {
  off: 0,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};
