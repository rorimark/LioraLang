export const SETTINGS_TAB_QUERY_KEY = "tab";

export const SETTINGS_TAB_KEYS = {
  general: "general",
  importExport: "import-export",
  storageIntegrity: "storage-integrity",
  learningCore: "learning-core",
  deckDefaults: "deck-defaults",
  workspaceSafety: "workspace-safety",
  advancedDesktop: "advanced-desktop",
};

export const SETTINGS_SECTION_IDS = {
  [SETTINGS_TAB_KEYS.general]: "settings-general",
  [SETTINGS_TAB_KEYS.importExport]: "settings-import-export",
  [SETTINGS_TAB_KEYS.storageIntegrity]: "settings-storage-integrity",
  [SETTINGS_TAB_KEYS.learningCore]: "settings-learning-core",
  [SETTINGS_TAB_KEYS.deckDefaults]: "settings-deck-defaults",
  [SETTINGS_TAB_KEYS.workspaceSafety]: "settings-workspace-safety",
  [SETTINGS_TAB_KEYS.advancedDesktop]: "settings-advanced-desktop",
};

const VALID_SETTINGS_TAB_VALUES = new Set(Object.values(SETTINGS_TAB_KEYS));

export const normalizeSettingsTab = (value, fallback = SETTINGS_TAB_KEYS.general) => {
  const normalizedValue =
    typeof value === "string" ? value.trim().toLowerCase() : "";

  if (VALID_SETTINGS_TAB_VALUES.has(normalizedValue)) {
    return normalizedValue;
  }

  return fallback;
};
