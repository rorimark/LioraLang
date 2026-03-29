import { describe, expect, it } from "vitest";
import { normalizeWord } from "./normalizeWord.js";

describe("normalizeWord", () => {
  it("folds the legacy example field into examples and removes duplicates", () => {
    expect(
      normalizeWord(
        {
          source: "guidebook",
          target: "przewodnik",
          example: "Pack a guidebook",
          examples: ["Pack a guidebook", "Use a guidebook", "", "Use a guidebook"],
          level: "A2",
          tags: ["travel"],
        },
        "fallback-id",
      ),
    ).toEqual({
      id: "fallback-id",
      externalId: "",
      source: "guidebook",
      target: "przewodnik",
      tertiary: "",
      level: "A2",
      part_of_speech: "other",
      tags: ["travel"],
      examples: ["Pack a guidebook", "Use a guidebook"],
      example: "Pack a guidebook",
    });
  });

  it("keeps a predictable shape even for partial or malformed words", () => {
    expect(normalizeWord({ id: 5, tags: "wrong-type" }, "backup")).toEqual({
      id: 5,
      externalId: "",
      source: "",
      target: "",
      tertiary: "",
      level: null,
      part_of_speech: "other",
      tags: [],
      examples: [],
      example: "",
    });
  });
});
