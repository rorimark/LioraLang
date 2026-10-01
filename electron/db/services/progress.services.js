import { getDatabase } from "../db.js";
import { GUEST_PROFILE_SCOPE, normalizeProfileScope } from "../../../packages/shared/src/core/usecases/sync/index.js";
import { buildProgressOverview } from "../../../packages/shared/src/core/usecases/progress/buildProgressOverview.js";
import { buildDeckStudy } from "../../../packages/shared/src/core/usecases/progress/buildDeckStudy.js";
import { activateProgressProfile } from "./sync.services.js";

export const getProgressOverview = ({
  profileScope = GUEST_PROFILE_SCOPE,
} = {}) => {
  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  activateProgressProfile(normalizedProfileScope);

  const decks = db.prepare("SELECT id, name FROM decks").all();
  const words = db.prepare("SELECT id, deck_id AS deckId FROM words").all();
  const reviewCards = db
    .prepare(
      `
        SELECT
          review_cards.word_id AS wordId,
          words.deck_id AS deckId,
          review_cards.state,
          review_cards.interval_days AS intervalDays,
          review_cards.due_at AS dueAt,
          review_cards.lapses
        FROM review_cards
        JOIN words ON words.id = review_cards.word_id
        WHERE review_cards.profile_scope = ?
      `,
    )
    .all(normalizedProfileScope);
  const reviewLogs = db
    .prepare(
      `
        SELECT
          DATE(reviewed_at, 'localtime') AS dayKey,
          rating,
          queue_type AS queueType,
          deck_id AS deckId,
          word_id AS wordId
        FROM review_logs
        WHERE profile_scope = ?
      `,
    )
    // All of it: the stickers are dated from the whole history.
    .all(normalizedProfileScope);

  return buildProgressOverview({
    decks,
    words,
    reviewCards,
    reviewLogs,
    profileScope: normalizedProfileScope,
  });
};

// One deck, word by word, for the deck page.
export const getDeckStudy = ({ deckId, profileScope = GUEST_PROFILE_SCOPE } = {}) => {
  const numericDeckId = Number(deckId);

  if (!Number.isInteger(numericDeckId) || numericDeckId <= 0) {
    return buildDeckStudy();
  }

  const db = getDatabase();
  const normalizedProfileScope = normalizeProfileScope(profileScope);
  activateProgressProfile(normalizedProfileScope);

  const words = db.prepare("SELECT id FROM words WHERE deck_id = ?").all(numericDeckId);
  const reviewCards = db
    .prepare(
      `
        SELECT
          review_cards.word_id AS wordId,
          review_cards.state,
          review_cards.interval_days AS intervalDays,
          review_cards.due_at AS dueAt,
          review_cards.reps,
          review_cards.lapses,
          review_cards.last_reviewed_at AS lastReviewedAt
        FROM review_cards
        JOIN words ON words.id = review_cards.word_id
        WHERE words.deck_id = ? AND review_cards.profile_scope = ?
      `,
    )
    .all(numericDeckId, normalizedProfileScope);
  const reviewLogs = db
    .prepare(
      `
        SELECT reviewed_at AS reviewedAt, rating
        FROM review_logs
        WHERE deck_id = ? AND profile_scope = ?
      `,
    )
    .all(numericDeckId, normalizedProfileScope);

  return buildDeckStudy({ words, reviewCards, reviewLogs });
};
