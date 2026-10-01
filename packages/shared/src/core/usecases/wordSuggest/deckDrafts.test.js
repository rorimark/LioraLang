import { describe, expect, it } from "vitest";
import { buildDeckDescriptionRequest, canDescribeDeck, mergeDeckTags, normalizeDeckDescription } from "./deckDrafts.js";

describe("deck drafts", () => {
  it("asks about a deck by its name, sides, tags and words spread over it", () => {
    const words = Array.from({ length: 100 }, (_, index) => ({ source: `w${index}`, target: `t${index}` }));
    const request = buildDeckDescriptionRequest({
      deck: { name: " Kitchen ", sourceLanguage: "English", targetLanguage: "Polish", pictureSide: "", tagsInput: "home, Home, food" },
      words: [{ source: "12", target: "" }, ...words],
      writeIn: "Russian",
    });

    expect(request).toMatchObject({ name: "Kitchen", tags: ["home", "food"], writeIn: "Russian" });
    expect(request.words).toHaveLength(40);
    expect(request.words[0]).toEqual({ source: "w0", target: "t0" });
    expect(request.words.at(-1).source).toBe("w97");
    expect(canDescribeDeck(request)).toBe(true);
    expect(canDescribeDeck(buildDeckDescriptionRequest({ deck: {}, words: words.slice(0, 2) }))).toBe(false);
  });

  it("keeps a description short and adds tags after the deck's own", () => {
    expect(normalizeDeckDescription({ description: " Kitchen  words. ", tags: ["kitchen", "Kitchen", "a, b", "home"] })).toEqual({
      description: "Kitchen words.",
      tags: ["kitchen", "home"],
    });
    expect(normalizeDeckDescription({ description: "x".repeat(301) }).description).toBe("");
    expect(mergeDeckTags("home, food", ["Food", "kitchen"])).toBe("home, food, kitchen");
    expect(mergeDeckTags("a,b,c,d,e,f,g,h,i", ["j", "k"]).split(", ")).toHaveLength(10);
  });
});
