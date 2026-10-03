import { describe, expect, it } from "vitest";
import { DEFAULT_APP_PREFERENCES } from "@shared/config/appPreferencesDefaults";
import { SETTINGS_TAB_KEYS } from "@shared/config/settingsTabs";
import { buildI18nValue, ENGLISH_MESSAGES } from "@shared/lib/i18n";
import { buildSettingsSummaries } from "./settingsSummaries";

const i18n = buildI18nValue("en", ENGLISH_MESSAGES);

describe("buildSettingsSummaries", () => {
  it("describes the defaults in a line per section", () => {
    const summaries = buildSettingsSummaries({
      appPreferences: DEFAULT_APP_PREFERENCES,
      themeMode: "system",
      i18n,
    });

    expect(summaries[SETTINGS_TAB_KEYS.general]).toBe("System theme · normal text");
    expect(summaries[SETTINGS_TAB_KEYS.learningCore]).toBe("20 cards a day · 20 new");
    expect(summaries[SETTINGS_TAB_KEYS.deckDefaults]).toBe("English → Ukrainian · A1");
    expect(summaries[SETTINGS_TAB_KEYS.sync]).toBe("In the background");
    expect(summaries[SETTINGS_TAB_KEYS.importExport]).toBe("Exports as .lioradeck");
    expect(summaries[SETTINGS_TAB_KEYS.workspaceSafety]).toBe("Backups weekly");
    expect(summaries[SETTINGS_TAB_KEYS.advancedDesktop]).toBe(
      "Analytics off · crash reports on",
    );
  });

  it("follows what was changed", () => {
    const summaries = buildSettingsSummaries({
      appPreferences: {
        ...DEFAULT_APP_PREFERENCES,
        uiAccessibility: { ...DEFAULT_APP_PREFERENCES.uiAccessibility, reducedMotion: true },
        dataSafety: {
          ...DEFAULT_APP_PREFERENCES.dataSafety,
          autoBackupInterval: "off",
          confirmDestructive: false,
        },
        sync: { ...DEFAULT_APP_PREFERENCES.sync, autoSync: false },
      },
      themeMode: "dark",
      i18n,
    });

    expect(summaries[SETTINGS_TAB_KEYS.general]).toBe("Dark theme · normal text · reduced motion");
    expect(summaries[SETTINGS_TAB_KEYS.workspaceSafety]).toBe(
      "No automatic backups · no delete confirmation",
    );
    expect(summaries[SETTINGS_TAB_KEYS.sync]).toBe("Only when you sync");
  });

  it("counts independently enabled AI functions", () => {
    const all = buildSettingsSummaries({ appPreferences: DEFAULT_APP_PREFERENCES, i18n });
    expect(all[SETTINGS_TAB_KEYS.assistant]).toBe("6 / 6 functions on");
    const partial = buildSettingsSummaries({ appPreferences: { deckDefaults: { wordSuggestions: false }, aiFeatures: { conceptSuggestions: true } }, i18n });
    expect(partial[SETTINGS_TAB_KEYS.assistant]).toBe("1 / 6 functions on");
  });

  it("returns nothing without preferences", () => {
    expect(buildSettingsSummaries({ appPreferences: null, i18n })).toEqual({});
  });
});
