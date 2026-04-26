import { describe, expect, it } from "vitest";
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
