import { describe, expect, it } from "vitest";
import { applyWordSuggestion, normalizeWordSuggestion } from "./wordSuggestion.js";

const ASSET_ID = "a".repeat(64);
const suggestion = {
  target: " szparag ",
  level: "b1",
  partOfSpeech: "Noun",
  tags: ["Food", "Vegetables", "Food"],
  examples: ["I grilled some asparagus for dinner."],
  image: { assetId: ASSET_ID, alt: "Green stalks on a plate" },
};

describe("word suggestions", () => {
  it("tidies what a helper offers and drops what is not usable", () => {
    expect(normalizeWordSuggestion({ ...suggestion, level: "Z9", image: { url: "https://example.com/a.jpg" } })).toEqual({
      target: "szparag",
      level: "",
      partOfSpeech: "noun",
      tags: ["Food", "Vegetables"],
      examples: ["I grilled some asparagus for dinner."],
      image: null,
    });
  });

  it("fills an entry from one typed word, picture included", () => {
    const word = applyWordSuggestion({ source: "asparagus" }, suggestion);

    expect(word).toMatchObject({
      source: "asparagus",
      target: "szparag",
      level: "B1",
      part_of_speech: "noun",
      tags: ["Food", "Vegetables"],
      image: { assetId: ASSET_ID, alt: "Green stalks on a plate" },
    });
  });

  it("takes only the accepted fields and never replaces what the person wrote", () => {
    const word = applyWordSuggestion(
      { source: "asparagus", target: "szparagi" },
      suggestion,
      ["target", "image"],
    );

    expect(word.target).toBe("szparagi");
    expect(word.image.assetId).toBe(ASSET_ID);
    expect(word.level).toBeUndefined();
  });
});
