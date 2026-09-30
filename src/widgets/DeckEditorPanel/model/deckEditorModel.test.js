import { describe, expect, it } from "vitest";
import {
  applySavedIds,
  buildSavePayload,
  draftToWord,
  matchesWordQuery,
  parseTagsInput,
  toDeckForm,
  validateDeckForm,
  validateWordDraft,
} from "./deckEditorModel";

const form = {
  name: "Animals",
  description: "",
  sourceLanguage: "English",
  targetLanguage: "Polish",
  tertiaryLanguage: "",
  pictureSide: "",
  usesWordLevels: true,
  tagsInput: "zoo, Zoo, farm",
};

describe("deckEditorModel", () => {
  it("keeps tags unique regardless of case", () => {
    expect(parseTagsInput("zoo, Zoo, farm,  ")).toEqual(["zoo", "farm"]);
  });

  it("asks for the side that is missing", () => {
    expect(validateWordDraft({ source: "", target: "kot" })).toBe("editor.errors.emptyWord");
    expect(validateWordDraft({ source: "cat", target: "" })).toBe("editor.errors.emptyTranslation");
    expect(validateWordDraft({ source: "cat", target: "kot" })).toBe("");
  });

  it("asks for a picture on a picture side and not for its text", () => {
    const image = { assetId: "a".repeat(64), alt: "" };

    expect(validateWordDraft({ source: "", target: "kot" }, "source")).toBe("editor.errors.emptyPicture");
    expect(validateWordDraft({ source: "", target: "kot", image }, "source")).toBe("");
    expect(validateWordDraft({ source: "", target: "", image }, "source")).toBe("editor.errors.emptyWord");
    expect(validateWordDraft({ source: "cat", target: "", image }, "target")).toBe("");
  });

  it("checks the deck's name and that its languages differ", () => {
    expect(validateDeckForm({ ...form, name: " " })).toBe("editor.errors.nameRequired");
    expect(validateDeckForm({ ...form, targetLanguage: "English" })).toBe("editor.errors.sameLanguages");
    expect(validateDeckForm({ ...form, tertiaryLanguage: "Polish" })).toBe("editor.errors.sameLanguages");
    // The picture side has no language, so the other side can be anything.
    expect(validateDeckForm({ ...form, pictureSide: "source", targetLanguage: "English" })).toBe("");
    expect(validateDeckForm(form)).toBe("");
  });

  it("drops what the deck does not use when a draft becomes a word", () => {
    const word = draftToWord(
      { source: " cat ", target: "kot", tertiary: "Katze", level: "A1", part_of_speech: "noun", examplesInput: "a\n\na", tagsInput: "" },
      { usesWordLevels: false, hasTertiary: false },
    );

    expect(word).toMatchObject({ source: "cat", target: "kot", tertiary: "", level: "", examples: ["a"], image: null });
    expect(word.externalId).toMatch(/^manual-/);
  });

  it("keeps the word's identity when it is changed", () => {
    const base = { id: 7, externalId: "w-7" };
    const word = draftToWord({ source: "dog", target: "pies" }, { base });

    expect(word.id).toBe(7);
    expect(word.externalId).toBe("w-7");
  });

  it("builds a payload with no language on the picture side", () => {
    const payload = buildSavePayload({
      deckId: 3,
      form: { ...form, pictureSide: "source" },
      words: [{ id: "4", externalId: "w-4", source: "", target: "kot", tertiary: "x", level: "A1", tags: [], examples: [], image: { assetId: "b".repeat(64), alt: "" } }],
    });

    expect(payload).toMatchObject({ deckId: 3, sourceLanguage: "", targetLanguage: "Polish", pictureSide: "source", tags: ["zoo", "farm"] });
    expect(payload.words[0]).toMatchObject({ id: 4, tertiary: "", level: "A1", image: { assetId: "b".repeat(64) } });
  });

  it("takes the ids storage gave and leaves words added meanwhile alone", () => {
    const local = [
      { id: null, externalId: "new" },
      { id: null, externalId: "later" },
      { id: 1, externalId: "old" },
    ];
    const next = applySavedIds(local, [{ id: 9, externalId: "new" }, { id: 1, externalId: "old" }]);

    expect(next.map((word) => word.id)).toEqual([9, null, 1]);
    expect(applySavedIds(next, [{ id: 9, externalId: "new" }])).toBe(next);
  });

  it("reads a stored deck back into the form", () => {
    expect(toDeckForm({ name: "A", tagsJson: '["x","y"]', pictureSide: "target", usesWordLevels: false })).toMatchObject({
      name: "A",
      tagsInput: "x, y",
      pictureSide: "target",
      usesWordLevels: false,
    });
  });

  it("finds words by either side, the picture's description and tags", () => {
    const word = { source: "cat", target: "kot", image: { alt: "tabby" }, tags: ["pets"] };

    expect(matchesWordQuery(word, "KOT")).toBe(true);
    expect(matchesWordQuery(word, "tab")).toBe(true);
    expect(matchesWordQuery(word, "pet")).toBe(true);
    expect(matchesWordQuery(word, "dog")).toBe(false);
    expect(matchesWordQuery(word, "  ")).toBe(true);
  });
});
