import { describe, expect, it } from "vitest";
import { AI_FEATURES, isAiFeatureEnabled } from "@shared/config/aiFeatures";
import { mergeAppPreferences, normalizeAppPreferences } from "./appPreferences";

describe("appPreferences", () => {
  describe("normalizeAppPreferences", () => {
    it("defaults the study mode to review", () => {
      expect(normalizeAppPreferences({}).studySession.defaultStudyMode).toBe("review");
      expect(
        normalizeAppPreferences({
          studySession: { defaultStudyMode: "broken" },
        }).studySession.defaultStudyMode,
      ).toBe("review");
    });

    it("accepts srs as an explicit default study mode", () => {
      expect(
        normalizeAppPreferences({
          studySession: { defaultStudyMode: "srs" },
        }).studySession.defaultStudyMode,
      ).toBe("srs");
    });
  });

  describe("independent AI features", () => {
    it("migrates an old disabled assistant without silently enabling any function", () => {
      const migrated = normalizeAppPreferences({ deckDefaults: { wordSuggestions: false } });
      expect(migrated.aiAssistant.enabled).toBe(false);
      expect(Object.keys(migrated.aiFeatures)).toEqual(AI_FEATURES.map(({ id }) => id));
      expect(Object.values(migrated.aiFeatures).every((value) => value === false)).toBe(true);
      expect(Object.values(normalizeAppPreferences({}).aiFeatures).every(Boolean)).toBe(true);
    });
    it("enables just the chosen function after migration and preserves it on reload", () => {
      const changed = mergeAppPreferences({ deckDefaults: { wordSuggestions: false } }, { aiFeatures: { conceptSuggestions: true } });
      expect(Object.entries(changed.aiFeatures).filter(([, value]) => value).map(([id]) => id)).toEqual(["conceptSuggestions"]);
      expect(normalizeAppPreferences(JSON.parse(JSON.stringify(changed))).aiFeatures).toEqual(changed.aiFeatures);
    });
    it("preserves individual choices across master off, reload and back on", () => {
      const selected = mergeAppPreferences({}, { aiFeatures: { wordSuggestions: false, conceptSuggestions: true, reviewHints: false } });
      const off = mergeAppPreferences(selected, { aiAssistant: { enabled: false } });
      const reloaded = normalizeAppPreferences(JSON.parse(JSON.stringify(off)));
      expect(reloaded.aiFeatures).toEqual(selected.aiFeatures);
      for (const { id } of AI_FEATURES) expect(isAiFeatureEnabled(reloaded, id)).toBe(false);
      const on = mergeAppPreferences(reloaded, { aiAssistant: { enabled: true } });
      expect(on.aiFeatures).toEqual(selected.aiFeatures);
      expect(isAiFeatureEnabled(on, "conceptSuggestions")).toBe(true);
      expect(isAiFeatureEnabled(on, "wordSuggestions")).toBe(false);
    });
    it("keeps each setting independent and rejects unknown or malformed values", () => {
      const changed = mergeAppPreferences({}, { aiFeatures: { reviewHints: false, wordSuggestions: false, topicCollection: "off", future: true } });
      expect(changed.aiFeatures).toMatchObject({ reviewHints: false, wordSuggestions: false, topicCollection: true, listCompletion: true, conceptSuggestions: true });
      expect(changed.aiFeatures).not.toHaveProperty("future");
    });
  });

  describe("mergeAppPreferences", () => {
    it("persists default study mode patches", () => {
      expect(
        mergeAppPreferences(
          {},
          {
            studySession: {
              defaultStudyMode: "srs",
            },
          },
        ).studySession.defaultStudyMode,
      ).toBe("srs");
    });
  });
});
