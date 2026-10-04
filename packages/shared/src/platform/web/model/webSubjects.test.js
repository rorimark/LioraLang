import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeWebDbConnection } from "@shared/platform/web/db/webDb.js";
import { createWebDeckRepository } from "./createWebDeckRepository.js";
import { createWebSrsRepository } from "./createWebSrsRepository.js";

// A deck about programming in the browser's database: saved without
// languages, with its code, kept through reopening, a file and Learn. A
// language deck next to it stays exactly as it was.

const CODE = "const names = users.map(user => user.name);\n  // indented";

const reset = async () => {
  await closeWebDbConnection();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("lioralang-web");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
};

const saveProgrammingDeck = () =>
  createWebDeckRepository().saveDeck({
    name: "JavaScript",
    subject: "programming",
    subjectFields: { technology: "JavaScript" },
    words: [
      {
        source: "What does this return?",
        target: "A new array of the users' names.",
        subjectFields: { code: CODE, codeSide: "back", difficulty: "medium", unknown: "dropped" },
      },
    ],
  });

describe("web subjects", () => {
  beforeEach(reset);
  afterEach(reset);

  it("saves a programming deck without languages and keeps it after reopening", async () => {
    const saved = await saveProgrammingDeck();

    expect(saved.deck).toMatchObject({
      subject: "programming",
      subjectFields: { technology: "JavaScript" },
      sourceLanguage: "",
      targetLanguage: "",
    });

    await closeWebDbConnection();
    const repository = createWebDeckRepository();
    const [deck, words] = await Promise.all([
      repository.getDeckById(saved.deck.id),
      repository.getDeckWords(saved.deck.id),
    ]);

    expect(deck.subject).toBe("programming");
    expect(words[0].subjectFields).toEqual({ code: CODE, codeSide: "back", difficulty: "medium" });
  });

  it("keeps the subject once the deck has words", async () => {
    const saved = await saveProgrammingDeck();
    const resaved = await createWebDeckRepository().saveDeck({
      deckId: saved.deck.id,
      name: "JavaScript",
      subject: "language",
      words: saved.words,
    });

    expect(resaved.deck.subject).toBe("programming");
  });

  it("carries the deck through a file and into Learn as one card per entry", async () => {
    const saved = await saveProgrammingDeck();
    const repository = createWebDeckRepository();
    const exported = await repository.exportDeckPackage(saved.deck.id);

    expect(exported.package.deck.subject).toBe("programming");
    expect(exported.package.version).toBe(3);
    expect(exported.package.words[0].subjectFields.codeSide).toBe("back");
    expect(exported.package.words[0].subjectFields.code).toBe(CODE);

    const imported = await repository.importDeckFromJson({
      deckName: "JavaScript again",
      fileName: "javascript.lioradeck",
      fileText: JSON.stringify(exported.package),
      sourceLanguage: "English",
      targetLanguage: "Polish",
    });
    const importedDeck = await repository.getDeckById(imported.deckId);

    expect(importedDeck).toMatchObject({ subject: "programming", sourceLanguage: "", targetLanguage: "" });

    const session = await createWebSrsRepository().getSrsSession(saved.deck.id, {});

    expect(session.deck).toMatchObject({ subject: "programming", subjectFields: { technology: "JavaScript" } });
    expect(session.card.subjectFields).toEqual({ code: CODE, codeSide: "back", difficulty: "medium" });
    expect(session.stats.totalCards).toBe(1);
  });

  it.each([
    ["mathematics", { area: "Algebra", contentLanguage: "Polish" }, { formula: "x^2", steps: "1. Expand\n2. Simplify", difficulty: "medium" }],
    ["history", { period: "France", contentLanguage: "Russian" }, { date: "1789", context: "Political crisis", consequences: "Monarchy abolished", difficulty: "easy" }],
  ])("carries %s fields through reopening, export, import and review", async (subject, subjectFields, fields) => {
    const repository = createWebDeckRepository();
    const saved = await repository.saveDeck({ name: subject, subject, subjectFields, words: [{ source: "Question", target: "Answer", subjectFields: fields }] });
    await closeWebDbConnection();
    expect((await repository.getDeckWords(saved.deck.id))[0].subjectFields).toEqual(fields);
    const exported = (await repository.exportDeckPackage(saved.deck.id)).package;
    expect(exported.version).toBe(6);
    const imported = await repository.importDeckFromJson({ deckName: subject, fileName: "knowledge.lioradeck", fileText: JSON.stringify(exported) });
    const session = await createWebSrsRepository().getSrsSession(imported.deckId, {});
    expect(session.deck).toMatchObject({ subject, subjectFields });
    expect(session.card.subjectFields).toEqual(fields);
    expect(session.stats.totalCards).toBe(1);
  });

  it("leaves a language deck's records, file and session as they were", async () => {
    const repository = createWebDeckRepository();
    const saved = await repository.saveDeck({
      name: "Food",
      sourceLanguage: "English",
      targetLanguage: "Polish",
      words: [{ source: "asparagus", target: "szparag", subjectFields: { code: "x" } }],
    });

    expect(saved.deck).not.toHaveProperty("subject");
    expect(saved.words[0]).not.toHaveProperty("subjectFields");

    const exported = await repository.exportDeckPackage(saved.deck.id);
    expect(exported.package.deck).not.toHaveProperty("subject");
    expect(exported.package.words[0]).not.toHaveProperty("subjectFields");

    const session = await createWebSrsRepository().getSrsSession(saved.deck.id, {});
    expect(session.deck).not.toHaveProperty("subject");
    expect(session.card).not.toHaveProperty("subjectFields");
  });
});
