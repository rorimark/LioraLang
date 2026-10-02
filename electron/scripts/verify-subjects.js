// Decks about something other than a language, in the desktop database,
// end to end on a real SQLite file: a programming deck saves without
// languages, keeps its code and difficulty, keeps its subject once it has
// words, travels through a file and back, and reaches Learn with its
// fields; a language deck's rows, file and hash stay as they were.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { closeDatabaseConnection, getDatabase, initDatabaseConnection } from "../db/db.js";
import { initDb } from "../db/initDb.js";
import {
  exportDeckToJsonPackage,
  getDeckById,
  importDeckFromJsonFile,
  listDecks,
  saveDeck,
} from "../db/services/db.services.js";
import { getSrsSessionSnapshot } from "../db/services/srs.services.js";
import { buildDeckContentHash } from "../../packages/shared/src/core/usecases/sync/index.js";

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const CODE = "const names = users.map(user => user.name);\n  // indented line";

const main = () => {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "lioralang-subjects-"));
  initDatabaseConnection(path.join(sandbox, "lioralang.db"));
  initDb();
  const db = getDatabase();

  // A language deck: nothing new in its rows, file or hash.
  const language = saveDeck({
    name: "Food",
    sourceLanguage: "English",
    targetLanguage: "Polish",
    words: [{ source: "asparagus", target: "szparag" }],
  });
  assert(!("subject" in language.deck), "a language deck has no subject");
  assert(!("subjectFields" in language.words[0]), "a language word has no subject fields");
  const languageRow = db.prepare("SELECT subject, subject_fields_json AS f FROM decks WHERE id = ?").get(language.deck.id);
  assert(languageRow.subject === null && languageRow.f === null, "a language deck's row stays empty");
  const languageHash = buildDeckContentHash({
    deck: { name: "Food", description: "English -> Polish", sourceLanguage: "English", targetLanguage: "Polish", usesWordLevels: true, tags: [] },
    words: language.words,
  });
  assert(language.deck.contentHash === languageHash, "a language deck hashes as before");
  const languagePackage = exportDeckToJsonPackage(language.deck.id, {}).package;
  assert(!("subject" in languagePackage.deck) && !("subjectFields" in languagePackage.words[0]), "a language file is unchanged");

  // A programming deck: no languages, its own fields.
  const programming = saveDeck({
    name: "JavaScript",
    subject: "programming",
    subjectFields: { technology: "JavaScript" },
    sourceLanguage: "English",
    targetLanguage: "Polish",
    words: [
      {
        source: "What does this return?",
        target: "A new array of the users' names.",
        subjectFields: { code: CODE, codeSide: "back", difficulty: "medium", unknown: "dropped" },
        examples: ["map never changes the original array."],
      },
    ],
  });
  assert(programming.deck.subject === "programming", "a programming deck keeps its subject");
  assert(programming.deck.subjectFields?.technology === "JavaScript", "and its technology");
  assert(programming.deck.sourceLanguage === "" && programming.deck.targetLanguage === "", "a programming deck has no languages");
  const entry = programming.words[0];
  assert(entry.subjectFields?.code === CODE, "code keeps its lines and indentation");
  assert(entry.subjectFields?.difficulty === "medium", "difficulty is kept");
  assert(!("unknown" in entry.subjectFields), "fields the profile does not name are dropped");

  // Once it has words, the subject stays.
  const resaved = saveDeck({ deckId: programming.deck.id, name: "JavaScript", subject: "language", words: programming.words });
  assert(getDeckById(resaved.deck.id).subject === "programming", "a deck with words keeps its subject");

  // Through a file and back.
  const filePackage = exportDeckToJsonPackage(programming.deck.id, {}).package;
  assert(filePackage.version === 3 && filePackage.words[0].subjectFields.codeSide === "back", "answer-side code requires a compatible reader");
  assert(filePackage.deck.subject === "programming", "the file says what the deck is about");
  assert(filePackage.words[0].subjectFields.code === CODE, "the file carries the code");
  const filePath = path.join(sandbox, "javascript.lioradeck");
  fs.writeFileSync(filePath, JSON.stringify(filePackage));
  const imported = importDeckFromJsonFile(filePath, { sourceLanguage: "English", targetLanguage: "Polish" });
  const importedDeck = listDecks().find((item) => item.id === imported.deckId);
  assert(importedDeck.subject === "programming" && importedDeck.sourceLanguage === "", "it imports as a programming deck");

  // Learn gets the fields; one entry is one review unit.
  const session = getSrsSessionSnapshot({ deckId: programming.deck.id, settings: {} });
  assert(session.deck.subject === "programming", "the session knows the subject");
  assert(session.deck.subjectFields?.technology === "JavaScript", "and the technology");
  assert(session.card?.subjectFields?.code === CODE, "the card carries its code");
  assert(session.card?.subjectFields?.codeSide === "back", "the session keeps answer-side code hidden until reveal");
  const importedSession = getSrsSessionSnapshot({ deckId: imported.deckId, settings: {} });
  assert(importedSession.card?.subjectFields?.codeSide === "back", "file import keeps the code placement");
  assert(session.stats.totalCards === 1, "one entry is one card");

  closeDatabaseConnection();
  fs.rmSync(sandbox, { recursive: true, force: true });
  console.log("Subjects check passed.");
};

try {
  main();
} catch (error) {
  console.error("Subjects check failed:", error);
  closeDatabaseConnection();
  process.exitCode = 1;
}
