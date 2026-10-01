import { describe, expect, it } from "vitest";
import { buildHintRequest, hintCacheKey } from "./hints.js";

const word = { source: "bilet", target: "билет", examples: ["Mam bilet.", "", "Gdzie jest bilet?", "Trzeci."] };

describe("hints", () => {
  it("explains the word that is not in the person's language", () => {
    expect(buildHintRequest({ word, deck: { sourceLanguage: "Polish", targetLanguage: "Russian" }, explainIn: "Russian" })).toEqual({
      word: "bilet",
      translation: "билет",
      wordLanguage: "Polish",
      translationLanguage: "Russian",
      explainIn: "Russian",
      examples: ["Mam bilet.", "Gdzie jest bilet?"],
    });
    expect(
      buildHintRequest({ word: { source: "ticket", target: "bilet" }, deck: { sourceLanguage: "English", targetLanguage: "Polish" }, explainIn: "English" }),
    ).toMatchObject({ word: "bilet", wordLanguage: "Polish", translation: "ticket" });
  });

  it("takes the front when neither side is the person's language", () => {
    expect(
      buildHintRequest({ word: { source: "ticket", target: "bilet" }, deck: { sourceLanguage: "English", targetLanguage: "Polish" }, explainIn: "Russian" }),
    ).toMatchObject({ word: "ticket", wordLanguage: "English" });
  });

  it("has nothing to ask about a picture card or a half-written one", () => {
    expect(buildHintRequest({ word, deck: { sourceLanguage: "Polish", targetLanguage: "Russian", pictureSide: "source" } })).toBeNull();
    expect(buildHintRequest({ word: { source: "bilet" }, deck: { sourceLanguage: "Polish", targetLanguage: "Russian" } })).toBeNull();
    expect(hintCacheKey(null)).toBe("");
  });
});
