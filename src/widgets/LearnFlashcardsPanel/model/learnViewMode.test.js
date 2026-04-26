import { describe, expect, it } from "vitest";
import {
  LEARN_DEFAULT_STUDY_MODE_SRS,
  LEARN_VIEW_MODE_BROWSE,
  LEARN_VIEW_MODE_SRS,
  resolveLoopedBrowseIndex,
  resolvePreferredLearnViewMode,
} from "./learnViewMode";

describe("learnViewMode", () => {
  describe("resolvePreferredLearnViewMode", () => {
    it("defaults to review mode for unknown values", () => {
      expect(resolvePreferredLearnViewMode("")).toBe(LEARN_VIEW_MODE_BROWSE);
      expect(resolvePreferredLearnViewMode("broken")).toBe(LEARN_VIEW_MODE_BROWSE);
    });

    it("allows opting back into srs mode", () => {
      expect(resolvePreferredLearnViewMode(LEARN_DEFAULT_STUDY_MODE_SRS)).toBe(
        LEARN_VIEW_MODE_SRS,
      );
    });
  });

  describe("resolveLoopedBrowseIndex", () => {
    it("wraps from the first card to the last one", () => {
      expect(
        resolveLoopedBrowseIndex({
          currentIndex: 0,
          total: 4,
          direction: -1,
        }),
      ).toBe(3);
    });

    it("wraps from the last card to the first one", () => {
      expect(
        resolveLoopedBrowseIndex({
          currentIndex: 3,
          total: 4,
          direction: 1,
        }),
      ).toBe(0);
    });
  });
});
