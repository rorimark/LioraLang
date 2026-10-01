import { describe, expect, it } from "vitest";
import {
  buildSuggestionRequest,
  hasSuggestionContent,
  isSuggestableText,
  normalizeSuggestion,
  resolveSuggestionAnchor,
  resolveSuggestionFills,
  collectDeckTags,
  suggestionCacheKey,
} from "./wordSuggest.js";

const deck = { sourceLanguage: "English", targetLanguage: "Polish", tertiaryLanguage: "", pictureSide: "", usesWordLevels: true };

describe("wordSuggest", () => {
  it("asks only about a word or a short phrase", () => {
    expect(isSuggestableText("a")).toBe(false);
    expect(isSuggestableText("42")).toBe(false);
    expect(isSuggestableText("take off")).toBe(true);
    expect(isSuggestableText("żółw")).toBe(true);
    expect(isSuggestableText("one two three four five six seven eight nine")).toBe(false);
  });

  it("asks from the front, or from the back when only the back is written", () => {
    expect(resolveSuggestionAnchor({ source: " ticket ", target: "" })).toEqual({ side: "source", text: "ticket" });
    expect(resolveSuggestionAnchor({ source: "", target: "bilet" })).toEqual({ side: "target", text: "bilet" });
    expect(resolveSuggestionAnchor({ source: "", target: "" })).toBeNull();
    // The picture side holds no text to ask about.
    expect(resolveSuggestionAnchor({ source: "stale", target: "chleb" }, "source")).toEqual({ side: "target", text: "chleb" });
  });

  it("builds the same request, and the same cache key, for the same word", () => {
    const request = buildSuggestionRequest({ anchor: { side: "source", text: "Ticket" }, deck });
    expect(request).toEqual({
      text: "Ticket",
      side: "source",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      tertiaryLanguage: "",
      pictureSide: "",
      usesWordLevels: true,
      tags: [],
      tagLanguage: "",
    });
    expect(suggestionCacheKey(request)).toBe(
      suggestionCacheKey(buildSuggestionRequest({ anchor: { side: "source", text: "ticket" }, deck })),
    );
  });

  it("keeps only what the card can hold", () => {
    const request = buildSuggestionRequest({ anchor: { side: "source", text: "ticket" }, deck });
    const suggestion = normalizeSuggestion(
      {
        source: "should not be here",
        target: " bilet ",
        tertiary: "квиток",
        level: "a2",
        partOfSpeech: "Noun",
        examples: ["I bought a ticket.", "i bought a ticket.", "Show your ticket.", "Third one."],
        tags: ["travel", "Travel", "a, b", "transport", "money", "fourth"],
        correction: "ticket",
      },
      request,
    );

    expect(suggestion).toEqual({
      recognized: true,
      correction: "",
      source: "",
      target: "bilet",
      tertiary: "",
      level: "A2",
      part_of_speech: "noun",
      examples: ["I bought a ticket.", "Show your ticket."],
      tags: ["travel", "transport", "money"],
    });
    expect(hasSuggestionContent(suggestion)).toBe(true);
  });

  it("drops unknown levels and parts of speech, and levels for a deck without them", () => {
    const request = buildSuggestionRequest({ anchor: { side: "source", text: "run" }, deck: { ...deck, usesWordLevels: false } });
    const suggestion = normalizeSuggestion({ target: "biegać", level: "B1", partOfSpeech: "gerund" }, request);

    expect(suggestion.level).toBe("");
    expect(suggestion.part_of_speech).toBe("");
  });

  it("offers a spelling correction instead of inventing a word", () => {
    const request = buildSuggestionRequest({ anchor: { side: "source", text: "recieve" }, deck });
    const suggestion = normalizeSuggestion({ recognized: false, correction: "receive", target: "otrzymać" }, request);

    expect(suggestion).toMatchObject({ recognized: false, correction: "receive", target: "" });
    expect(hasSuggestionContent(suggestion)).toBe(false);
    expect(resolveSuggestionFills({ source: "recieve" }, suggestion)).toEqual({});
  });

  it("asks for the front when the back was written", () => {
    const request = buildSuggestionRequest({ anchor: { side: "target", text: "bilet" }, deck });
    expect(normalizeSuggestion({ source: "ticket", target: "x" }, request)).toMatchObject({ source: "ticket", target: "" });
  });

  it("fills only the fields that are still empty", () => {
    const suggestion = {
      recognized: true,
      correction: "",
      source: "",
      target: "bilet",
      tertiary: "",
      level: "A2",
      part_of_speech: "noun",
      examples: ["I bought a ticket.", "Show your ticket."],
    };

    expect(resolveSuggestionFills({ source: "ticket", target: "", level: "B1", examplesInput: "" }, suggestion)).toEqual({
      target: "bilet",
      part_of_speech: "noun",
      examplesInput: "I bought a ticket.\nShow your ticket.",
    });
  });

  it("replaces a default nobody chose, never a value someone set", () => {
    const suggestion = { recognized: true, target: "biec", level: "A2", part_of_speech: "verb", examples: [] };
    const defaults = { level: "A1", part_of_speech: "noun" };
    const draft = { source: "run", target: "", level: "A1", part_of_speech: "noun" };

    expect(resolveSuggestionFills(draft, suggestion, { defaults })).toEqual({ target: "biec", level: "A2", part_of_speech: "verb" });
    expect(resolveSuggestionFills(draft, suggestion, { defaults, locked: new Set(["level"]) })).toEqual({
      target: "biec",
      part_of_speech: "verb",
    });
  });

  it("confirms a default the suggestion agrees with, once", () => {
    const suggestion = { recognized: true, target: "bilet", level: "A1", part_of_speech: "noun", examples: [] };
    const defaults = { level: "A1", part_of_speech: "noun" };
    const draft = { source: "ticket", target: "", level: "A1", part_of_speech: "noun" };

    expect(resolveSuggestionFills(draft, suggestion, { defaults })).toEqual({
      target: "bilet",
      level: "A1",
      part_of_speech: "noun",
    });
    expect(
      resolveSuggestionFills({ ...draft, target: "bilet" }, suggestion, {
        defaults,
        filled: { target: "bilet", level: "A1", part_of_speech: "noun" },
      }),
    ).toEqual({});
  });

  it("adds suggested tags to the default ones and leaves chosen tags alone", () => {
    const suggestion = { recognized: true, tags: ["travel", "transport"] };
    const defaults = { tagsInput: "polish" };

    expect(resolveSuggestionFills({ source: "ticket", tagsInput: "" }, suggestion)).toEqual({ tagsInput: "travel, transport" });
    expect(resolveSuggestionFills({ source: "ticket", tagsInput: "polish" }, suggestion, { defaults })).toEqual({
      tagsInput: "polish, travel, transport",
    });
    expect(resolveSuggestionFills({ source: "ticket", tagsInput: "Travel, transport" }, suggestion, { defaults: { tagsInput: "Travel, transport" } })).toEqual({});
    expect(resolveSuggestionFills({ source: "ticket", tagsInput: "work" }, suggestion, { defaults })).toEqual({});
  });

  it("passes the deck's most used tags along with the request", () => {
    const words = [{ tags: ["food", "home"] }, { tags: ["Food"] }, { tags: ["travel", "food"] }, { tags: "bad" }, {}];

    expect(collectDeckTags(words)).toEqual(["food", "home", "travel"]);
    expect(collectDeckTags(words, 1)).toEqual(["food"]);

    const request = buildSuggestionRequest({
      anchor: { side: "source", text: "bread" },
      deck: { ...deck, tags: collectDeckTags(words), tagLanguage: "Russian" },
    });
    expect(request.tags).toEqual(["food", "home", "travel"]);
    expect(suggestionCacheKey(request)).not.toBe(suggestionCacheKey({ ...request, tagLanguage: "German" }));
  });
});
