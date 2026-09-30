// Pictures in the desktop database, end to end on a real SQLite file:
// a word keeps its picture, a file export carries it, an import brings it
// back under its content name, a text-only deck hashes as it always did,
// and pictures nobody uses are swept only after their grace period.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { closeDatabaseConnection, getDatabase, initDatabaseConnection } from "../db/db.js";
import { initDb } from "../db/initDb.js";
import {
  exportDeckToJsonFile,
  exportDeckToJsonPackage,
  getDeckWords,
  importDeckFromJsonFile,
  listDecks,
  saveDeck,
} from "../db/services/db.services.js";
import {
  collectUnusedMedia,
  findMissingMedia,
  getImage,
  saveImage,
  storeRemoteImage,
} from "../db/services/media.services.js";
import { getSrsSessionSnapshot } from "../db/services/srs.services.js";
import { buildDeckContentHash } from "../../packages/shared/src/core/usecases/sync/index.js";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

// A real 1×1 PNG.
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PNG_ID = createHash("sha256").update(PNG).digest("hex");

const main = () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "lioralang-media-"));
  initDatabaseConnection(path.join(sandbox, "lioralang.db"));
  initDb();

  const saved = saveImage({ full: { bytes: new Uint8Array(PNG), width: 1, height: 1 } });
  assert(saved.assetId === PNG_ID, "a picture is named by the SHA-256 of its bytes");
  assert(getImage(PNG_ID)?.mimeType === "image/png", "the stored picture reads back with its type");

  let rejected = false;
  try {
    saveImage({ full: { bytes: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") } });
  } catch {
    rejected = true;
  }
  assert(rejected, "an SVG is refused");

  const textOnlyWords = [{ source: "house", target: "dom", examples: [], tags: [] }];
  const textDeck = saveDeck({ name: "Text", sourceLanguage: "English", targetLanguage: "Polish", words: textOnlyWords });
  const expectedHash = buildDeckContentHash({
    deck: { name: "Text", description: "English -> Polish", sourceLanguage: "English", targetLanguage: "Polish", usesWordLevels: true, tags: [] },
    words: textDeck.words,
  });
  assert(textDeck.deck.contentHash === expectedHash, "a text-only deck hashes as before");
  assert(textDeck.words[0].image === null, "a word without a picture has none");

  const { deck } = saveDeck({
    name: "Food",
    sourceLanguage: "English",
    targetLanguage: "Polish",
    words: [
      { source: "asparagus", target: "szparag", image: { assetId: PNG_ID, alt: "Green stalks" } },
      { source: "bread", target: "chleb" },
    ],
  });
  const words = getDeckWords(deck.id);
  const asparagus = words.find((word) => word.source === "asparagus");
  assert(asparagus.image?.assetId === PNG_ID && asparagus.image.alt === "Green stalks", "a word keeps its picture");
  assert(listDecks().find((item) => item.id === deck.id).imagesCount === 1, "the deck list counts pictures");

  const session = getSrsSessionSnapshot({ deckId: deck.id });
  assert(JSON.stringify(session).includes(PNG_ID), "the study session carries the picture");

  const synced = exportDeckToJsonPackage(deck.id, { includeMedia: false }).package;
  assert(!synced.media, "a sync package leaves the bytes out");
  assert(synced.words.find((word) => word.source === "asparagus").image.assetId === PNG_ID, "but keeps the reference");

  const filePath = path.join(sandbox, "food.lioradeck");
  exportDeckToJsonFile(deck.id, filePath, {});
  const exported = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert(exported.version === 1, "the package format version is unchanged");
  assert(exported.media?.length === 1 && exported.media[0].id === PNG_ID, "a file carries its picture once");

  // Import into a fresh database, with a declared id that is wrong: the
  // importer names the bytes itself and points the word at the real name.
  closeDatabaseConnection();
  initDatabaseConnection(path.join(sandbox, "second.db"));
  initDb();
  const tampered = JSON.parse(JSON.stringify(exported));
  const wrongId = "f".repeat(64);
  tampered.media[0].id = wrongId;
  tampered.words.find((word) => word.source === "asparagus").image.assetId = wrongId;
  const tamperedPath = path.join(sandbox, "tampered.lioradeck");
  fs.writeFileSync(tamperedPath, JSON.stringify(tampered));
  const imported = importDeckFromJsonFile(tamperedPath, {});
  const importedWords = getDeckWords(imported.deckId);
  assert(
    importedWords.find((word) => word.source === "asparagus").image?.assetId === PNG_ID,
    "an imported word points at the name its bytes really have",
  );
  assert(getImage(PNG_ID), "the imported picture is stored");

  // An old file without pictures imports as it always did.
  const oldPath = path.join(sandbox, "old.lioradeck");
  fs.writeFileSync(oldPath, JSON.stringify({ format: "lioralang.deck", version: 1, deck: { name: "Old", sourceLanguage: "English", targetLanguage: "Polish" }, words: [{ source: "cat", target: "kot" }] }));
  const old = importDeckFromJsonFile(oldPath, {});
  assert(getDeckWords(old.deckId)[0].image === null, "an old file imports without pictures");

  // From another device: only the right bytes are accepted.
  assert(findMissingMedia([PNG_ID, "e".repeat(64)]).length === 1, "missing pictures are found");
  let mismatch = false;
  try {
    storeRemoteImage("e".repeat(64), PNG);
  } catch {
    mismatch = true;
  }
  assert(mismatch, "bytes that are not the picture they claim to be are refused");

  // A picture deck: pictures instead of a language on one side, words that
  // are a picture alone, and a save of its words that keeps the side.
  const pictureDeck = saveDeck({
    name: "Pictures",
    sourceLanguage: "English",
    targetLanguage: "Polish",
    pictureSide: "source",
    words: [{ source: "", target: "szparag", image: { assetId: PNG_ID, alt: "" } }],
  });
  assert(pictureDeck.deck.pictureSide === "source", "a deck keeps its picture side");
  assert(pictureDeck.deck.sourceLanguage === "", "a picture side has no language");
  assert(pictureDeck.words.length === 1 && pictureDeck.words[0].image?.assetId === PNG_ID, "a word can be a picture alone");
  const resaved = saveDeck({
    deckId: pictureDeck.deck.id,
    name: "Pictures",
    targetLanguage: "Polish",
    words: [...pictureDeck.words, { source: "", target: "chleb", image: { assetId: PNG_ID, alt: "bread" } }],
  });
  assert(resaved.deck.pictureSide === "source" && resaved.words.length === 2, "adding words keeps the picture side");
  const picturePackage = exportDeckToJsonPackage(pictureDeck.deck.id, {}).package;
  assert(picturePackage.deck.pictureSide === "source", "a picture deck's file says which side is pictures");
  const picturePath = path.join(sandbox, "pictures.lioradeck");
  fs.writeFileSync(picturePath, JSON.stringify(picturePackage));
  const reimported = importDeckFromJsonFile(picturePath, {});
  const reimportedDeck = listDecks().find((item) => item.id === reimported.deckId);
  assert(reimportedDeck.pictureSide === "source" && reimported.importedCount === 2, "a picture deck imports as a picture deck");

  // Removing the picture from the word leaves it for a day, then sweeps it.
  const db = getDatabase();
  const deckWords = getDeckWords(imported.deckId).map((word) => ({ ...word, image: null }));
  saveDeck({ deckId: imported.deckId, name: "Food", sourceLanguage: "English", targetLanguage: "Polish", words: deckWords });
  assert(getImage(PNG_ID), "an unused picture survives its grace period");
  db.prepare("DELETE FROM decks WHERE id IN (?, ?)").run(pictureDeck.deck.id, reimported.deckId);
  db.prepare("UPDATE media_assets SET touched_at = datetime('now', '-2 days')").run();
  collectUnusedMedia();
  assert(!getImage(PNG_ID), "an unused picture is swept after it");

  closeDatabaseConnection();
  fs.rmSync(sandbox, { recursive: true, force: true });
  console.log("Media check passed.");
};

try {
  main();
} catch (error) {
  console.error("Media check failed:", error);
  closeDatabaseConnection();
  process.exitCode = 1;
}
