import { describe, expect, it } from "vitest";
import { hubDeckSides, toHubDeck, toPublishableDeck, validatePublishableDeck } from "./index.js";

const words = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

describe("hub: picture decks", () => {
  it("publishes a deck with pictures on the front under its back's languages", () => {
    const deck = toPublishableDeck({
      name: "Kitchen",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      tertiaryLanguage: "Ukrainian",
      pictureSide: "source",
    });

    expect(deck).toMatchObject({ sourceLanguage: "", targetLanguages: ["Polish", "Ukrainian"], pictureSide: "source" });
    expect(() => validatePublishableDeck(deck)).not.toThrow();
  });

  it("publishes a deck with pictures on the back under its front's language", () => {
    const deck = toPublishableDeck({
      name: "Animals",
      sourceLanguage: "German",
      targetLanguage: "Polish",
      pictureSide: "target",
    });

    expect(deck).toMatchObject({ sourceLanguage: "German", targetLanguages: [], pictureSide: "target" });
    expect(() => validatePublishableDeck(deck)).not.toThrow();
  });

  it("still asks a deck of words for both its languages", () => {
    expect(() => validatePublishableDeck(toPublishableDeck({ name: "Words", sourceLanguage: "English" }))).toThrow(
      "target language",
    );
    expect(() =>
      validatePublishableDeck(toPublishableDeck({ name: "Words", targetLanguage: "Polish", pictureSide: "target" })),
    ).toThrow("source language");
  });

  it("reads the picture side back and gives the library deck its sides", () => {
    const front = toHubDeck(
      { id: "1", title: "Kitchen", source_language: "", target_languages: ["Polish", "Ukrainian"], picture_side: "source" },
      null,
      words,
    );
    const back = toHubDeck(
      { id: "2", title: "Animals", source_language: "German", target_languages: ["Ukrainian"], picture_side: "target" },
      null,
      words,
    );
    const plain = toHubDeck({ id: "3", title: "Words", source_language: "English", target_languages: ["Polish"] }, null, words);

    expect(front.pictureSide).toBe("source");
    expect(plain.pictureSide).toBe("");
    expect(hubDeckSides(front)).toEqual({
      pictureSide: "source",
      sourceLanguage: "",
      targetLanguage: "Polish",
      tertiaryLanguage: "Ukrainian",
    });
    expect(hubDeckSides(back)).toEqual({
      pictureSide: "target",
      sourceLanguage: "German",
      targetLanguage: "",
      tertiaryLanguage: "Ukrainian",
    });
    expect(hubDeckSides(plain)).toEqual({ sourceLanguage: "English", targetLanguage: "Polish", tertiaryLanguage: "" });
  });
});
