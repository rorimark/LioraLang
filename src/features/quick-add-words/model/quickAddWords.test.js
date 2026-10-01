import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeWebDbConnection } from "@shared/platform/web/db/webDb.js";
import { createWebDeckRepository } from "@shared/platform/web/model/createWebDeckRepository.js";
import { ROW_STATUS, looksLikeWordList, parseWordList, splitWordLine } from "./parseWordList";
import {
  DUPLICATE_KIND,
  buildDeckWordIndex,
  findDuplicate,
  markListDuplicates,
} from "./wordDuplicates";
import { appendWordsToDeck, createDeckForWords, removeWordsFromDeck } from "./deckWordsWriter";

describe("parseWordList", () => {
  it("splits the separators people actually paste", () => {
    expect(splitWordLine("apple — jabłko")).toMatchObject({ source: "apple", target: "jabłko" });
    expect(splitWordLine("apple – jabłko")).toMatchObject({ source: "apple", target: "jabłko" });
    expect(splitWordLine("apple - jabłko")).toMatchObject({ source: "apple", target: "jabłko" });
    expect(splitWordLine("apple\tjabłko\tnoun")).toMatchObject({ source: "apple", target: "jabłko" });
    expect(splitWordLine("apple = jabłko")).toMatchObject({ source: "apple", target: "jabłko" });
    expect(splitWordLine("apple; jabłko")).toMatchObject({ source: "apple", target: "jabłko" });
    expect(splitWordLine("apple | jabłko")).toMatchObject({ source: "apple", target: "jabłko" });
    expect(splitWordLine("apple: jabłko")).toMatchObject({ source: "apple", target: "jabłko" });
    expect(splitWordLine("apple, jabłko")).toMatchObject({ source: "apple", target: "jabłko" });
  });

  it("keeps hyphenated words and several meanings whole", () => {
    expect(splitWordLine("well-known — znany, słynny")).toMatchObject({
      source: "well-known",
      target: "znany, słynny",
    });
    expect(splitWordLine("check-in = odprawa")).toMatchObject({ source: "check-in", target: "odprawa" });
  });

  it("drops numbering, bullets, quotes and blank lines", () => {
    const rows = parseWordList('1. apple — jabłko\n\n- "pear" — gruszka\n• plum — śliwka\r\n');

    expect(rows.map(({ source, target }) => [source, target])).toEqual([
      ["apple", "jabłko"],
      ["pear", "gruszka"],
      ["plum", "śliwka"],
    ]);
    expect(rows.map((row) => row.line)).toEqual([1, 3, 4]);
  });

  it("marks a line it cannot split instead of guessing", () => {
    const [row] = parseWordList("serendipity");

    expect(row).toMatchObject({ source: "serendipity", target: "", status: ROW_STATUS.missingTranslation });
    expect(parseWordList(" — jabłko")[0].status).toBe(ROW_STATUS.missingWord);
  });

  it("tells a list from a single word", () => {
    expect(looksLikeWordList("apple")).toBe(false);
    expect(looksLikeWordList("apple — jabłko\npear — gruszka")).toBe(true);
  });
});

describe("word duplicates", () => {
  const index = buildDeckWordIndex([
    { id: 1, source: "bank", target: "brzeg" },
    { id: 2, source: "Apple", target: "jabłko" },
  ]);

  it("stops only for the same word with the same translation", () => {
    expect(findDuplicate(index, { source: "apple ", target: "Jabłko" }).kind).toBe(DUPLICATE_KIND.exact);
    expect(findDuplicate(index, { source: "bank", target: "bank" })).toMatchObject({
      kind: DUPLICATE_KIND.otherMeaning,
      matches: [{ id: 1, target: "brzeg" }],
    });
    expect(findDuplicate(index, { source: "pear", target: "gruszka" }).kind).toBe(DUPLICATE_KIND.none);
  });

  it("catches a pair repeated inside the pasted list", () => {
    const rows = markListDuplicates(
      [
        { source: "plum", target: "śliwka" },
        { source: "Plum", target: "śliwka" },
        { source: "plum", target: "fioletowy" },
      ],
      index,
    );

    expect(rows.map((row) => row.duplicate.kind)).toEqual([
      DUPLICATE_KIND.none,
      DUPLICATE_KIND.repeatedInList,
      DUPLICATE_KIND.none,
    ]);
  });
});

const resetWebDb = async () => {
  await closeWebDbConnection();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("lioralang-web");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
};

describe("deckWordsWriter on the web store", () => {
  beforeEach(resetWebDb);
  afterEach(resetWebDb);

  const seedDeck = async (repository) => {
    const { deck } = await repository.saveDeck({
      name: "Fruit",
      description: "Kept as it is",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      tags: ["food"],
      usesWordLevels: true,
      words: [
        {
          source: "apple",
          target: "jabłko",
          level: "B1",
          part_of_speech: "noun",
          tags: ["fruit"],
          examples: ["An apple a day"],
        },
      ],
    });
    return deck;
  };

  it("adds cards one after another without losing earlier ones or existing details", async () => {
    const repository = createWebDeckRepository();
    const deck = await seedDeck(repository);

    await Promise.all([
      appendWordsToDeck(repository, deck.id, [{ source: "pear", target: "gruszka" }]),
      appendWordsToDeck(repository, deck.id, [{ source: "plum", target: "śliwka" }]),
      appendWordsToDeck(repository, deck.id, [{ source: "fig", target: "figa" }]),
    ]);

    const words = await repository.getDeckWords(deck.id);
    expect(words.map((word) => word.source).sort()).toEqual(["apple", "fig", "pear", "plum"]);
    expect(words.find((word) => word.source === "apple")).toMatchObject({
      level: "B1",
      part_of_speech: "noun",
      tags: ["fruit"],
      examples: ["An apple a day"],
    });
    // A word nobody gave a level to does not quietly become A1.
    expect(words.find((word) => word.source === "pear").level).toBeNull();

    const saved = await repository.getDeckById(deck.id);
    expect(saved).toMatchObject({ name: "Fruit", description: "Kept as it is", wordsCount: 4 });
    expect(JSON.parse(saved.tagsJson)).toEqual(["food"]);
    expect(saved.syncId).toBe(deck.syncId);
    expect(saved.contentHash).not.toBe(deck.contentHash);
  });

  it("returns the stored cards it added, and undo removes only those", async () => {
    const repository = createWebDeckRepository();
    const deck = await seedDeck(repository);
    const { added } = await appendWordsToDeck(repository, deck.id, [
      { source: "pear", target: "gruszka" },
      { source: "apple", target: "jabłko" },
    ]);

    expect(added).toHaveLength(2);
    expect(added.every((word) => Number.isInteger(word.id))).toBe(true);

    await removeWordsFromDeck(repository, deck.id, added.map((word) => word.id));
    const words = await repository.getDeckWords(deck.id);
    expect(words.map((word) => [word.source, word.target])).toEqual([["apple", "jabłko"]]);
  });

  it("adds a card whose first side is a picture", async () => {
    const repository = createWebDeckRepository();
    const { deck } = await repository.saveDeck({
      name: "Food",
      sourceLanguage: "",
      targetLanguage: "Polish",
      pictureSide: "source",
      words: [{ source: "", target: "szparagi", image: { assetId: "a".repeat(64), alt: "" } }],
    });

    const { added } = await appendWordsToDeck(repository, deck.id, [
      { source: "", target: "chleb", image: { assetId: "b".repeat(64), alt: "" } },
    ]);

    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({ source: "", target: "chleb", image: { assetId: "b".repeat(64) } });
    expect((await repository.getDeckWords(deck.id)).map((word) => word.target).sort()).toEqual(["chleb", "szparagi"]);
  });

  it("says nothing was added instead of pretending", async () => {
    const repository = createWebDeckRepository();
    const deck = await seedDeck(repository);

    await expect(appendWordsToDeck(repository, deck.id, [{ source: "", target: "gruszka" }])).rejects.toMatchObject({
      i18nKey: "quickAdd.errors.save",
    });
  });

  it("creates an empty deck ready for words", async () => {
    const repository = createWebDeckRepository();
    const { deck } = await createDeckForWords(repository, {
      name: "Travel",
      sourceLanguage: "English",
      targetLanguage: "German",
    });

    const { added } = await appendWordsToDeck(repository, deck.id, [{ source: "ticket", target: "die Fahrkarte" }]);
    expect(added[0]).toMatchObject({ source: "ticket", target: "die Fahrkarte" });
  });

  it("creates a picture deck: pictures on the front, words on the back", async () => {
    const repository = createWebDeckRepository();
    const { deck } = await createDeckForWords(repository, {
      name: "Animals",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      pictureSide: "source",
    });
    const stored = await repository.getDeckById(deck.id);

    expect(stored).toMatchObject({ pictureSide: "source", sourceLanguage: "", targetLanguage: "Polish" });
  });

  it("creates a deck with pictures on the back", async () => {
    const repository = createWebDeckRepository();
    const { deck } = await createDeckForWords(repository, {
      name: "Show me",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      pictureSide: "target",
    });
    const stored = await repository.getDeckById(deck.id);

    expect(stored).toMatchObject({ pictureSide: "target", sourceLanguage: "English", targetLanguage: "" });
  });
});
