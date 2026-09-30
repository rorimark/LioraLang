import assert from "node:assert/strict";
import {
  initDatabaseConnection,
  closeDatabaseConnection,
  getDatabase,
} from "../db/db.js";
import { initDb } from "../db/initDb.js";
import { saveDeck } from "../db/services/db.services.js";
import {
  getSrsSessionSnapshot,
  gradeSrsCard,
} from "../db/services/srs.services.js";
import { activateProgressProfile } from "../db/services/sync.services.js";

// An isolated in-memory database; never opens the user's learning database.
initDatabaseConnection(":memory:");
try {
  initDb();
  const db = getDatabase();
  const saved = saveDeck({
    name: "SRS integration",
    sourceLanguage: "English",
    targetLanguage: "Polish",
    words: [
      { source: "one", target: "jeden" },
      { source: "two", target: "dwa" },
    ],
  });
  const deckId = saved.deck.id;
  const settings = {
    spacedRepetition: { learningSteps: "1m, 10m" },
    studySession: { dailyGoal: 1 },
  };
  const get = (extra = {}) =>
    getSrsSessionSnapshot({ deckId, settings, ...extra });
  const rate = (session, rating, extra = {}) =>
    gradeSrsCard({
      deckId,
      wordId: session.card.wordId,
      rating,
      settings,
      expectedRevision: session.card.revision,
      expectedProfileScope: session.profileScope,
      ...extra,
    });
  const first = get();
  assert.equal(first.deck.sourceLanguage, "English");
  const { easy: easyPreview, ...shortPreview } = first.card.ratingPreview;
  assert.deepEqual(shortPreview, { again: "1m", hard: "6m", good: "10m" });
  // FSRS: Easy on a new word is about sixteen days, spread a little per word.
  assert.match(easyPreview, /^1[3-9]d$/);
  const second = rate(first, "good");
  assert.notEqual(second.card.wordId, first.card.wordId);
  assert.equal(second.limits.dailyLeft, 0);
  assert.throws(() => rate(first, "good"), /progress changed/);
  assert.equal(
    db.prepare("SELECT COUNT(*) AS count FROM review_logs").get().count,
    1,
  );
  const waiting = rate(second, "good", { forceAllCards: true });
  assert.equal(waiting.card, null);
  assert.equal(waiting.completionState.reason, "learning-wait");
  assert.equal(waiting.stats.waitingLearning, 2);
  assert.equal(get({ forceAllCards: true }).card, null);

  db.prepare("UPDATE review_cards SET due_at = ? WHERE word_id = ?").run(
    new Date(Date.now() - 1000).toISOString(),
    first.card.wordId,
  );
  const due = get();
  const after = rate(due, "good");
  assert.equal(after.stats.totalStudiedToday, 2);
  assert.equal(after.stats.answersToday, 3);
  const learned = db
    .prepare(
      "SELECT state, interval_days, reps, stability, difficulty, last_reviewed_at FROM review_cards WHERE word_id = ?",
    )
    .get(first.card.wordId);
  assert.equal(learned.state, "review");
  assert.equal(learned.reps, 2);
  // Two Goods on one day: about four days, spread a little per word.
  assert.ok(learned.interval_days >= 3 && learned.interval_days <= 6, `interval ${learned.interval_days}`);
  // The FSRS memory lives in SQLite with the card.
  assert.ok(learned.stability > 3, `stability ${learned.stability}`);
  assert.ok(learned.difficulty >= 1 && learned.difficulty <= 10, `difficulty ${learned.difficulty}`);
  assert.ok(learned.last_reviewed_at);
  // The next session reads that memory back: the preview it offers is the
  // schedule the grade writes.
  db.prepare("UPDATE review_cards SET due_at = ? WHERE word_id = ?").run(
    new Date(Date.now() - 1000).toISOString(),
    first.card.wordId,
  );
  const again = get();
  assert.equal(again.card.wordId, first.card.wordId);
  assert.equal(again.card.stability, learned.stability);
  const reviewed = rate(again, "good");
  const grown = db
    .prepare("SELECT interval_days, stability FROM review_cards WHERE word_id = ?")
    .get(first.card.wordId);
  assert.ok(grown.stability > learned.stability, "stability grows after a successful review");
  assert.equal(`${grown.interval_days}d`, again.card.ratingPreview.good);
  void reviewed;
  const log = db
    .prepare(
      "SELECT payload_json, sync_status FROM review_logs ORDER BY id DESC LIMIT 1",
    )
    .get();
  assert.equal(JSON.parse(log.payload_json).nextCard.state, "review");
  assert.equal(log.sync_status, "pending");

  // A separate profile starts fresh and switching back restores the existing schedule.
  const profile = "user:11111111-1111-4111-8111-111111111111";
  const account = get({ profileScope: profile });
  assert.equal(account.card.state, "new");
  assert.throws(() => rate(account, "good"), /account changed/);
  activateProgressProfile("guest:default");
  assert.equal(get().stats.totalStudiedToday, 2);
  // Switching profiles rebuilds cards from the review log, the way sync
  // does; the FSRS memory survives it.
  const replayed = db
    .prepare("SELECT stability, difficulty FROM review_cards WHERE word_id = ?")
    .get(first.card.wordId);
  assert.equal(replayed.stability, grown.stability);
  assert.ok(replayed.difficulty >= 1 && replayed.difficulty <= 10);
  console.log(
    "Desktop SRS passed: FSRS scheduling and memory in SQLite, finite queues, atomic grades, logs, profile isolation.",
  );
} finally {
  closeDatabaseConnection();
}
