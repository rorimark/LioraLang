import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeWebDbConnection } from "@shared/platform/web/db/webDb.js";
import { createWebDeckRepository } from "./createWebDeckRepository.js";

const resetWebDb = async () => {
  await closeWebDbConnection();

  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("lioralang-web");

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
};

describe("createWebDeckRepository", () => {
  beforeEach(async () => {
    await resetWebDb();
  });

  afterEach(async () => {
    await resetWebDb();
  });

  it("persists a new deck without dropping word tags or extra examples", async () => {
    const repository = createWebDeckRepository();
    const result = await repository.saveDeck({
      name: "Education deck",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      description: "Useful school vocabulary",
      tags: ["education", "Education", "school"],
      words: [
        {
          source: "guidebook",
          target: "przewodnik",
          part_of_speech: "noun",
          tags: ["reading", "Reading", "school"],
          examples: ["Pack a guidebook", "Use a guidebook", "Pack a guidebook"],
        },
      ],
    });

    expect(result.deck).toMatchObject({
      name: "Education deck",
      wordsCount: 1,
      tagsJson: JSON.stringify(["education", "school"]),
    });
    expect(result.deck.syncId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(result.deck.originKind).toBe("local");
    expect(result.deck.contentHash).toMatch(/^deckh_[0-9a-f]{8}$/);

    expect(result.words).toEqual([
      expect.objectContaining({
        source: "guidebook",
        target: "przewodnik",
        tags: ["reading", "school"],
        examples: ["Pack a guidebook", "Use a guidebook"],
      }),
    ]);

    const listedDecks = await repository.listDecks();
    expect(listedDecks).toHaveLength(1);
    expect(listedDecks[0]).toMatchObject({
      name: "Education deck",
      wordsCount: 1,
    });
  });

  it("removes words that were deleted before the next save", async () => {
    const repository = createWebDeckRepository();
    const created = await repository.saveDeck({
      name: "Travel deck",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      words: [
        { source: "ticket", target: "bilet" },
        { source: "train", target: "pociąg" },
      ],
    });

    const [ticketWord] = created.words;
    const updated = await repository.saveDeck({
      deckId: created.deck.id,
      name: "Travel deck",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      words: [
        {
          ...ticketWord,
          target: "bilet kolejowy",
          examples: ["Buy the ticket"],
        },
      ],
    });

    expect(updated.words).toHaveLength(1);
    expect(updated.words[0]).toMatchObject({
      source: "ticket",
      target: "bilet kolejowy",
      examples: ["Buy the ticket"],
    });
  });

  it("imports a deck package and respects import settings", async () => {
    const repository = createWebDeckRepository();

    const imported = await repository.importDeckFromJson({
      deckName: "Imported education",
      fileName: "education.lioradeck",
      fileText: JSON.stringify({
        format: "lioralang.deck",
        version: 1,
        deck: {
          name: "Education",
          sourceLanguage: "English",
          targetLanguage: "Polish",
          syncId: "550e8400-e29b-41d4-a716-446655440000",
          originKind: "account",
          originRef: "library-1",
          tags: ["school"],
        },
        words: [
          {
            id: "1",
            source: "notebook",
            target: "zeszyt",
            tags: ["supplies"],
            examples: ["Open your notebook"],
          },
        ],
      }),
      settings: {
        includeExamples: false,
        includeTags: true,
      },
    });

    expect(imported).toMatchObject({
      deckName: "Imported education",
      importedCount: 1,
      skippedCount: 0,
    });

    const [deck] = await repository.listDecks();
    const words = await repository.getDeckWords(deck.id);

    expect(deck.syncId).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(deck.originKind).toBe("account");
    expect(deck.originRef).toBe("library-1");
    expect(words[0]).toMatchObject({
      source: "notebook",
      tags: ["supplies"],
      examples: [],
    });
  });
});
