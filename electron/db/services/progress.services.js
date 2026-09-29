import { getDatabase } from "../db.js";
import { GUEST_PROFILE_SCOPE, normalizeProfileScope } from "../../../packages/shared/src/core/usecases/sync/index.js";
import { buildProgressOverview } from "../../../packages/shared/src/core/usecases/progress/buildProgressOverview.js";
import { activateProgressProfile } from "./sync.services.js";

// Enough history for the activity grid (26 weeks), the streak and the
// 30-day comparison; the total count is asked for separately.
const HISTORY_DAYS = 400;

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
          AND DATE(reviewed_at, 'localtime') >= DATE('now', 'localtime', ?)
      `,
    )
    .all(normalizedProfileScope, `-${HISTORY_DAYS} days`);
  const totalReviews =
    db
      .prepare("SELECT COUNT(*) AS total FROM review_logs WHERE profile_scope = ?")
      .get(normalizedProfileScope)?.total || 0;

  return buildProgressOverview({
    decks,
    words,
    reviewCards,
    reviewLogs,
    totalReviews: Number(totalReviews) || 0,
  });
};
