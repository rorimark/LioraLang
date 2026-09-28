import { getDatabase } from "../db.js";
import {
  activateProgressProfile,
  ensureSyncDeviceIdentity,
  getNextDeviceSequence,
} from "./sync.services.js";
import {
  createDeckSyncId,
  GUEST_PROFILE_SCOPE,
  normalizeProfileScope,
} from "../../../packages/shared/src/core/usecases/sync/index.js";
import {
  buildSrsSessionSnapshot,
  normalizeSrsSettings,
  normalizeStudySettings,
  normalizeReviewCard,
  normalizeRating,
  resolveScheduleOutcome,
  getQueueTypeByState,
  assertGradeAllowed,
} from "../../../packages/shared/src/core/usecases/srs/index.js";

const toCleanString = (value) =>
  typeof value === "string" ? value.trim() : "";
const parseList = (value) => {
  try {
    const list = JSON.parse(value);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
};

export const getSrsSessionSnapshot = ({
  deckId,
  settings = {},
  forceAllCards = false,
  profileScope = GUEST_PROFILE_SCOPE,
}) => {
  const id = Number(deckId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid deck id");
  const db = getDatabase();
  const scope = normalizeProfileScope(profileScope);
  activateProgressProfile(scope);
  const nowMs = Date.now();
  const deck = db
    .prepare(
      `SELECT id, name, source_language AS sourceLanguage,
    target_language AS targetLanguage, tertiary_language AS tertiaryLanguage FROM decks WHERE id = ?`,
    )
    .get(id);
  if (!deck) throw new Error("Deck not found");
  const words = db
    .prepare(
      `SELECT id, source_text AS source, target_text AS target, tertiary_text AS tertiary,
    level, part_of_speech, tags_json AS tagsJson, examples_json AS examplesJson,
    created_at AS createdAt FROM words WHERE deck_id = ?`,
    )
    .all(id)
    .map((word) => ({
      ...word,
      tags: parseList(word.tagsJson),
      examples: parseList(word.examplesJson),
      createdAtMs: Date.parse(word.createdAt),
    }));
  const cards = db
    .prepare(
      `SELECT word_id AS wordId, state, learning_step AS learningStep, due_at AS dueAt,
    interval_days AS intervalDays, ease_factor AS easeFactor, reps, lapses FROM review_cards
    WHERE profile_scope = ? AND word_id IN (SELECT id FROM words WHERE deck_id = ?)`,
    )
    .all(scope, id);
  const todayLogs = db
    .prepare(
      `SELECT word_id AS wordId, queue_type AS queueType FROM review_logs
    WHERE deck_id = ? AND profile_scope = ? AND DATE(reviewed_at, 'localtime') = DATE(?, 'localtime')`,
    )
    .all(id, scope, new Date(nowMs).toISOString());
  return {
    ...buildSrsSessionSnapshot({
      deck,
      words,
      cardsByWordId: new Map(cards.map((card) => [card.wordId, card])),
      todayLogs,
      srsSettings: normalizeSrsSettings(settings),
      studySettings: normalizeStudySettings(settings),
      forceAllCards: Boolean(forceAllCards),
      nowMs,
    }),
    profileScope: scope,
  };
};

export const gradeSrsCard = ({
  deckId,
  wordId,
  rating,
  settings = {},
  forceAllCards = false,
  profileScope = GUEST_PROFILE_SCOPE,
  expectedRevision,
  expectedProfileScope,
}) => {
  const numericDeckId = Number(deckId);
  const numericWordId = Number(wordId);

  if (!Number.isInteger(numericDeckId) || numericDeckId <= 0) {
    throw new Error("Invalid deck id");
  }

  if (!Number.isInteger(numericWordId) || numericWordId <= 0) {
    throw new Error("Invalid word id");
  }

  const normalizedRating = normalizeRating(rating);
  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  if (
    expectedProfileScope !== undefined &&
    expectedProfileScope !== normalizedProfileScope
  ) {
    throw new Error(
      "Your account changed. Refresh the session before rating a card.",
    );
  }
  activateProgressProfile(normalizedProfileScope);
  const srsSettings = normalizeSrsSettings(settings);
  const studySessionSettings = normalizeStudySettings(settings);
  const now = new Date();
  const nowIso = now.toISOString();
  const syncRuntimeState = ensureSyncDeviceIdentity({
    platform: "desktop",
  });
  const deviceId = syncRuntimeState.deviceId || createDeckSyncId();
  const deviceSeq = getNextDeviceSequence(normalizedProfileScope);
  const opId = createDeckSyncId();

  const mutateTransaction = db.transaction(() => {
    const wordRow = db
      .prepare(
        `
          SELECT
            words.id AS wordId,
            words.deck_id AS deckId,
            words.external_id AS externalId,
            decks.sync_id AS deckSyncId
          FROM words
          INNER JOIN decks ON decks.id = words.deck_id
          WHERE words.id = ? AND words.deck_id = ?
        `,
      )
      .get(numericWordId, numericDeckId);

    if (!wordRow) {
      throw new Error("Card not found in selected deck");
    }

    const currentReviewRow = db
      .prepare(
        `
          SELECT
            state,
            learning_step AS learningStep,
            due_at AS dueAt,
            interval_days AS intervalDays,
            ease_factor AS easeFactor,
          reps,
          lapses
          FROM review_cards
          WHERE word_id = ?
        `,
      )
      .get(numericWordId);

    const currentCard = normalizeReviewCard(currentReviewRow || {});
    assertGradeAllowed({
      card: currentCard,
      expectedRevision,
      nowMs: now.getTime(),
    });
    const outcome = resolveScheduleOutcome({
      card: currentCard,
      rating: normalizedRating,
      srsSettings,
      studySettings: studySessionSettings,
      nowMs: now.getTime(),
    });

    db.prepare(
      `
        INSERT INTO review_cards (
          word_id,
          state,
          learning_step,
          due_at,
          interval_days,
          ease_factor,
          reps,
          lapses,
          last_reviewed_at,
          profile_scope
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(word_id) DO UPDATE SET
          state = excluded.state,
          learning_step = excluded.learning_step,
          due_at = excluded.due_at,
          interval_days = excluded.interval_days,
          ease_factor = excluded.ease_factor,
          reps = excluded.reps,
          lapses = excluded.lapses,
          last_reviewed_at = excluded.last_reviewed_at,
          profile_scope = excluded.profile_scope
      `,
    ).run(
      numericWordId,
      outcome.state,
      outcome.learningStep,
      outcome.dueAt,
      outcome.intervalDays,
      outcome.easeFactor,
      outcome.reps,
      outcome.lapses,
      nowIso,
      normalizedProfileScope,
    );

    db.prepare(
      `
        INSERT INTO review_logs (
          word_id,
          deck_id,
          reviewed_at,
          rating,
          queue_type,
          prev_state,
          next_state,
          prev_interval_days,
          next_interval_days,
          prev_ease_factor,
          next_ease_factor,
          profile_scope,
          op_id,
          device_id,
          device_seq,
          deck_sync_id,
          word_external_id,
          payload_json,
          sync_status,
          synced_at,
          server_seq,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, 0, ?, ?)
      `,
    ).run(
      numericWordId,
      numericDeckId,
      nowIso,
      normalizedRating,
      getQueueTypeByState(currentCard.state),
      currentCard.state,
      outcome.state,
      currentCard.intervalDays,
      outcome.intervalDays,
      currentCard.easeFactor,
      outcome.easeFactor,
      normalizedProfileScope,
      opId,
      deviceId,
      deviceSeq,
      toCleanString(wordRow.deckSyncId).toLowerCase(),
      toCleanString(wordRow.externalId),
      JSON.stringify({
        previousCard: currentCard,
        nextCard: outcome,
        settings: {
          srsSettings,
          studySessionSettings,
        },
      }),
      nowIso,
      nowIso,
    );
  });

  mutateTransaction();

  return getSrsSessionSnapshot({
    deckId: numericDeckId,
    settings,
    forceAllCards: Boolean(forceAllCards),
    profileScope: normalizedProfileScope,
  });
};
