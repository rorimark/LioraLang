import { describe, expect, it } from "vitest";
import {
  applyCardToRow,
  buildAiDeck,
  buildTopicRequest,
  canDraftCards,
  cardsToRows,
  chunkRows,
  editRow,
  isTopicReady,
  rowsToDraft,
  rowToWord,
} from "./cardDrafts.js";

const deck = buildAiDeck({ languages: { sourceLanguage: "English", targetLanguage: "Polish" }, tags: ["food"], tagLanguage: "Russian" });
const card = {
  recognized: true,
  source: "bread",
  target: "chleb",
  level: "a1",
  partOfSpeech: "noun",
  examples: ["Fresh bread smells great.", "Can you buy bread?", "Third."],
  tags: ["food"],
};

describe("card drafts", () => {
  it("asks only about lines with a word, in parts, and only for a deck of words", () => {
    const rows = [{ source: "bread" }, { source: "", target: "mleko" }, { source: "123", target: "" }, { source: "milk", ai: {} }];

    expect(rowsToDraft(rows)).toEqual([{ source: "bread" }, { source: "", target: "mleko" }]);
    expect(chunkRows([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(canDraftCards(deck)).toBe(true);
    expect(canDraftCards(buildAiDeck({ languages: { sourceLanguage: "English" } }))).toBe(false);
  });

  it("fills an empty side, keeps a written one, and keeps the rest beside the line", () => {
    const empty = applyCardToRow({ key: "a", source: "bread", target: "" }, card, deck);
    const written = applyCardToRow({ key: "b", source: "bread", target: "pieczywo" }, card, deck);

    expect(empty).toMatchObject({
      target: "chleb",
      ai: {
        side: "source",
        filled: ["target"],
        details: { level: "A1", part_of_speech: "noun", examples: ["Fresh bread smells great.", "Can you buy bread?"], tags: ["food"] },
      },
    });
    expect(written.target).toBe("pieczywo");
    expect(written.ai.filled).toEqual([]);
  });

  it("fills the word from a translation", () => {
    const row = applyCardToRow({ source: "", target: "chleb" }, { ...card, source: "bread" }, deck);
    expect(row).toMatchObject({ source: "bread", ai: { side: "target", filled: ["source"] } });
  });

  it("offers a correction for a misspelt line and leaves a changed line alone", () => {
    const row = { source: "bred", target: "" };

    expect(applyCardToRow(row, { recognized: false, correction: "bread" }, deck).ai).toEqual({
      side: "source",
      correction: "bread",
      filled: [],
      details: null,
    });
    expect(applyCardToRow(row, card, deck, { askedText: "brea" })).toBe(row);
  });

  it("forgets the card when its word changes, not when its translation does", () => {
    const row = applyCardToRow({ source: "bread", target: "" }, card, deck);

    expect(editRow(row, "target", "pieczywo").ai).toBe(row.ai);
    expect(editRow(row, "source", "butter").ai).toBeNull();
  });

  it("adds a drafted line with its details, and a plain one as it is", () => {
    const row = applyCardToRow({ source: "bread", target: "" }, card, deck);

    expect(rowToWord(row)).toEqual({
      source: "bread",
      target: "chleb",
      tertiary: "",
      examples: ["Fresh bread smells great.", "Can you buy bread?"],
      part_of_speech: "noun",
      level: "A1",
      tags: ["food"],
    });
    expect(rowToWord(row, { usesWordLevels: false }).level).toBe("");
    expect(rowToWord({ source: " milk ", target: "mleko" })).toEqual({ source: "milk", target: "mleko" });
  });

  it("turns a deck on a topic into lines to look over", () => {
    let seed = 0;
    const rows = cardsToRows([card, { source: "knife", target: "" }, { source: "fork", target: "widelec" }], deck, () => `k${(seed += 1)}`);

    expect(rows.map((row) => [row.key, row.line, row.source, row.target])).toEqual([
      ["k1", 1, "bread", "chleb"],
      ["k2", 2, "fork", "widelec"],
    ]);
    expect(rows[0].ai.filled).toEqual(["source", "target"]);
  });

  it("asks for a topic with a known count and level", () => {
    expect(buildTopicRequest({ deck, topic: "  kitchen ", level: "b1", count: 30, avoid: ["knife", ""] })).toEqual({
      deck,
      topic: "kitchen",
      level: "B1",
      count: 30,
      avoid: ["knife"],
    });
    expect(buildTopicRequest({ deck, topic: "kitchen", count: 7 }).count).toBe(20);
    expect(isTopicReady("kitchen")).toBe(true);
    expect(isTopicReady("  ")).toBe(false);
  });
});
