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
  assert.deepEqual(first.card.ratingPreview, {
    again: "1m",
    hard: "6m",
    good: "10m",
    easy: "7d",
  });
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
  assert.deepEqual(
    db
      .prepare(
        "SELECT state, interval_days, reps FROM review_cards WHERE word_id = ?",
      )
      .get(first.card.wordId),
    { state: "review", interval_days: 3, reps: 2 },
  );
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
  console.log(
    "Desktop SRS passed: scheduling, finite queues, atomic grades, logs, profile isolation.",
  );
} finally {
  closeDatabaseConnection();
}
