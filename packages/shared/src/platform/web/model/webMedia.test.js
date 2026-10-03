import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { closeWebDbConnection } from "@shared/platform/web/db/webDb.js";
import { createWebDeckRepository } from "./createWebDeckRepository.js";
import { createWebMediaRepository } from "./webMediaStore.js";

const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="),
  (char) => char.charCodeAt(0),
);
const PNG_ID = createHash("sha256").update(PNG).digest("hex");

const resetWebDb = async () => {
  await closeWebDbConnection();
  await new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase("lioralang-web");
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
};

const pngBlob = () => new Blob([PNG], { type: "image/png" });
const deckPayload = (words) => ({ name: "Food", sourceLanguage: "English", targetLanguage: "Polish", words });

describe("pictures in the browser database", () => {
  beforeEach(resetWebDb);
  afterEach(resetWebDb);

  it("stores a picture under its content name and reads it back", async () => {
    const media = createWebMediaRepository();
    const saved = await media.saveImage({ full: { blob: pngBlob(), width: 1, height: 1 } });

    expect(saved.assetId).toBe(PNG_ID);
    const image = await media.getImage(PNG_ID);
    expect(image.mimeType).toBe("image/png");
    expect(new Uint8Array(await image.blob.arrayBuffer())).toEqual(PNG);
    expect(await media.findMissing([PNG_ID, "e".repeat(64)])).toEqual(["e".repeat(64)]);
  });

  it("refuses bytes that are not the picture they claim to be", async () => {
    const media = createWebMediaRepository();
    await expect(media.storeRemoteImage("e".repeat(64), pngBlob())).rejects.toThrow();
  });

  it("keeps a word's picture, counts it, and exports it once in a file", async () => {
    const media = createWebMediaRepository();
    const decks = createWebDeckRepository();
    await media.saveImage({ full: { blob: pngBlob(), width: 1, height: 1 } });

    const { deck, words } = await decks.saveDeck(
      deckPayload([
        { source: "asparagus", target: "szparag", image: { assetId: PNG_ID, alt: "Green stalks" } },
        { source: "bread", target: "chleb" },
      ]),
    );

    expect(words.find((word) => word.source === "asparagus").image).toEqual({ assetId: PNG_ID, alt: "Green stalks" });
    expect(words.find((word) => word.source === "bread").image).toBeNull();
    expect((await decks.listDecks())[0].imagesCount).toBe(1);

    const file = (await decks.exportDeckPackage(deck.id)).package;
    const synced = (await decks.exportDeckPackage(deck.id, { includeMedia: false })).package;

    expect(file.version).toBe(4);
    expect(file.media).toHaveLength(1);
    expect(file.media[0].id).toBe(PNG_ID);
    expect(synced.media).toBeUndefined();
    expect(synced.words.find((word) => word.source === "asparagus").image.assetId).toBe(PNG_ID);
  });

  it("imports a file with pictures on a device that has never seen them", async () => {
    const media = createWebMediaRepository();
    const decks = createWebDeckRepository();
    await media.saveImage({ full: { blob: pngBlob() } });
    const { deck } = await decks.saveDeck(
      deckPayload([{ source: "asparagus", target: "szparag", image: { assetId: PNG_ID, alt: "" } }]),
    );
    const fileText = JSON.stringify((await decks.exportDeckPackage(deck.id)).package);

    await resetWebDb();

    const fresh = createWebDeckRepository();
    const imported = await fresh.importDeckFromJson({ fileText, fileName: "food.lioradeck", deckName: "Food copy" });
    const importedWords = await fresh.getDeckWords(imported.deckId);

    expect(importedWords[0].image.assetId).toBe(PNG_ID);
    expect(await createWebMediaRepository().getImage(PNG_ID)).not.toBeNull();
  });

  it("keeps a text-only deck's hash unchanged by the picture support", async () => {
    const decks = createWebDeckRepository();
    const { deck, words } = await decks.saveDeck(deckPayload([{ source: "house", target: "dom" }]));
    const { buildDeckContentHash } = await import("@shared/core/usecases/sync");

    expect(words[0].image).toBeNull();
    expect(deck.contentHash).toBe(
      buildDeckContentHash({
        deck: { name: "Food", description: "", sourceLanguage: "English", targetLanguage: "Polish", usesWordLevels: true, tags: [] },
        words: [{ externalId: words[0].externalId, source: "house", target: "dom", part_of_speech: "" }],
      }),
    );
  });
});
