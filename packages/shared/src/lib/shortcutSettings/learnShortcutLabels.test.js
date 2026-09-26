import { describe, expect, it } from "vitest";
import { LEARN_FLIP_SHORTCUT_MODES, LEARN_RATING_SHORTCUT_MODES } from "./shortcutSettings";
import { resolveLearnFlipKeyLabel, resolveLearnRatingKeyLabels } from "./learnShortcutLabels";

describe("learn shortcut labels", () => {
  it("names the flip key, and nothing when it is off", () => {
    expect(resolveLearnFlipKeyLabel(LEARN_FLIP_SHORTCUT_MODES.enter)).toBe("Enter");
    expect(resolveLearnFlipKeyLabel(LEARN_FLIP_SHORTCUT_MODES.disabled)).toBe("");
    expect(resolveLearnFlipKeyLabel(undefined)).toBe("Space");
  });

  it("maps every grade to its key", () => {
    expect(resolveLearnRatingKeyLabels(LEARN_RATING_SHORTCUT_MODES.digits)).toEqual({
      again: "1",
      hard: "2",
      good: "3",
      easy: "4",
    });
    expect(resolveLearnRatingKeyLabels(LEARN_RATING_SHORTCUT_MODES.asdf).good).toBe("D");
    expect(resolveLearnRatingKeyLabels("off")).toEqual({});
  });
});
