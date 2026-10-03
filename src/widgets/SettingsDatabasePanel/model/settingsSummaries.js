import { AI_FEATURES, isAiEnabled, isAiFeatureEnabled } from "@shared/config/aiFeatures";
import { SETTINGS_TAB_KEYS } from "@shared/config/settingsTabs";
import { INTERFACE_LOCALES } from "@shared/lib/i18n";

// One line per section, saying what it is set to now, so the list of
// sections doubles as an overview and most people never need to open one.
// Said in the interface's language: takes the value useI18n() returns.

const joinParts = (...parts) => parts.filter(Boolean).join(" · ");

export const buildSettingsSummaries = ({ appPreferences, themeMode, isDesktopMode = false, i18n }) => {
  if (!appPreferences) {
    return {};
  }

  const { t, languageName } = i18n;
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
  const chosenLanguage = INTERFACE_LOCALES.find((item) => item.code === uiAccessibility.interfaceLanguage);
  const theme = ["system", "light", "dark"].includes(themeMode) ? themeMode : "system";

  return {
    [SETTINGS_TAB_KEYS.general]: joinParts(
      t(`summaries.theme.${theme}`),
      chosenLanguage?.nativeName,
      uiAccessibility.fontScale ? t(`summaries.textSize.${uiAccessibility.fontScale}`) : "",
      uiAccessibility.reducedMotion ? t("summaries.reducedMotion") : "",
    ),
    [SETTINGS_TAB_KEYS.learningCore]: joinParts(
      Number.isFinite(studySession.dailyGoal) ? t("summaries.dailyGoal", { count: studySession.dailyGoal }) : "",
      Number.isFinite(spacedRepetition.newCardsPerDay)
        ? t("summaries.newCards", { count: spacedRepetition.newCardsPerDay })
        : "",
    ),
    [SETTINGS_TAB_KEYS.deckDefaults]:
      deckDefaults.sourceLanguage && deckDefaults.targetLanguage
        ? joinParts(
            `${languageName(deckDefaults.sourceLanguage)} → ${languageName(deckDefaults.targetLanguage)}`,
            deckDefaults.level,
          )
        : "",
    [SETTINGS_TAB_KEYS.assistant]:
      !isAiEnabled(appPreferences) ? t("summaries.assistantOff") : t("summaries.assistantFeatures", { enabled: AI_FEATURES.filter(({ id }) => isAiFeatureEnabled(appPreferences, id)).length, total: AI_FEATURES.length }),
    [SETTINGS_TAB_KEYS.sync]: sync.autoSync === false ? t("summaries.syncManual") : t("summaries.syncAuto"),
    [SETTINGS_TAB_KEYS.importExport]: importExport.exportFormat
      ? t("summaries.exportsAs", { format: `.${importExport.exportFormat}` })
      : "",
    [SETTINGS_TAB_KEYS.workspaceSafety]: joinParts(
      dataSafety.autoBackupInterval ? t(`summaries.backups.${dataSafety.autoBackupInterval}`) : "",
      dataSafety.confirmDestructive === false ? t("summaries.noDeleteConfirmation") : "",
    ),
    [SETTINGS_TAB_KEYS.advancedDesktop]: joinParts(
      isDesktopMode && desktop.launchAtStartup ? t("summaries.opensAtLogin") : "",
      privacy.analyticsEnabled ? t("summaries.analyticsOn") : t("summaries.analyticsOff"),
      privacy.crashReportsEnabled ? t("summaries.crashReportsOn") : t("summaries.crashReportsOff"),
    ),
  };
};
