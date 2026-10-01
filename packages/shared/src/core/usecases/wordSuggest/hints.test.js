import { describe, expect, it } from "vitest";
import { buildHintRequest, hintCacheKey } from "./hints.js";

const word = { source: "bilet", target: "билет", examples: ["Mam bilet.", "", "Gdzie jest bilet?", "Trzeci."] };

describe("hints", () => {
  it("explains the source word, whatever the interface language", () => {
    expect(buildHintRequest({ word, deck: { sourceLanguage: "Polish", targetLanguage: "Russian" }, explainIn: "Russian" })).toEqual({
      word: "bilet",
      translation: "билет",
      wordLanguage: "Polish",
      translationLanguage: "Russian",
      explainIn: "Russian",
      recall: "",
      examples: ["Mam bilet.", "Gdzie jest bilet?"],
    });
    // Someone learning English with the app in English: still "ticket".
    expect(
      buildHintRequest({ word: { source: "ticket", target: "bilet" }, deck: { sourceLanguage: "English", targetLanguage: "Polish" }, explainIn: "English" }),
    ).toMatchObject({ word: "ticket", wordLanguage: "English", translation: "bilet" });
  });

  it("says whether the word or its meaning was asked, from the direction shown", () => {
    // English → Polish deck, studied Polish → English with the app in
    // English: they saw "wolny pokój" and could not come up with
    // "vacant room".
    const vacant = { source: "vacant room", target: "wolny pokój" };
    const deck = { sourceLanguage: "English", targetLanguage: "Polish" };

    expect(buildHintRequest({ word: vacant, deck, explainIn: "English", direction: "target_to_source" })).toMatchObject({
      word: "vacant room",
      translation: "wolny pokój",
      recall: "word",
    });
    expect(buildHintRequest({ word: vacant, deck, explainIn: "English", direction: "source_to_target" })).toMatchObject({
      word: "vacant room",
      recall: "meaning",
    });
    expect(buildHintRequest({ word: vacant, deck, explainIn: "English", direction: "mixed" })).toMatchObject({ recall: "" });
  });

  it("explains the target word in a deck that says its target is learned", () => {
    // A Polish → English deck for someone learning English: "wolny pokój"
    // in the source, "vacant room" in the target.
    const deck = { sourceLanguage: "Polish", targetLanguage: "English", learnedSide: "target" };
    const vacant = { source: "wolny pokój", target: "vacant room" };

    expect(buildHintRequest({ word: vacant, deck, explainIn: "English", direction: "source_to_target" })).toMatchObject({
      word: "vacant room",
      translation: "wolny pokój",
      wordLanguage: "English",
      translationLanguage: "Polish",
      recall: "word",
    });
    expect(buildHintRequest({ word: vacant, deck, explainIn: "English", direction: "target_to_source" })).toMatchObject({
      word: "vacant room",
      recall: "meaning",
    });
  });

  it("asks again when the same word is missed in the other direction", () => {
    const vacant = { source: "vacant room", target: "wolny pokój" };
    const deck = { sourceLanguage: "English", targetLanguage: "Polish" };
    const keyFor = (direction) => hintCacheKey(buildHintRequest({ word: vacant, deck, explainIn: "Russian", direction }));

    expect(keyFor("target_to_source")).not.toBe(keyFor("source_to_target"));
  });

  it("has nothing to ask about a picture card or a half-written one", () => {
    expect(buildHintRequest({ word, deck: { sourceLanguage: "Polish", targetLanguage: "Russian", pictureSide: "source" } })).toBeNull();
    expect(buildHintRequest({ word: { source: "bilet" }, deck: { sourceLanguage: "Polish", targetLanguage: "Russian" } })).toBeNull();
    expect(hintCacheKey(null)).toBe("");
  });
});
