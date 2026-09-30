import {
  DEFAULT_SRS_SETTINGS,
  DEFAULT_STUDY_SETTINGS,
  normalizeReviewCard,
  normalizeSrsSettings,
  normalizeStudySettings,
  buildRatingPreview,
  getQueueTypeByState,
  getCardRevision,
} from "./srsScheduler.js";

export const EMPTY_SRS_SESSION = Object.freeze({
  deck: null,
  sessionMode: "default",
  card: null,
  stats: {
    totalCards: 0,
    dueLearning: 0,
    dueReview: 0,
    dueNew: 0,
    dueTotal: 0,
    reviewedToday: 0,
    newStudiedToday: 0,
    totalStudiedToday: 0,
    answersToday: 0,
    waitingLearning: 0,
  },
  limits: {
    ...DEFAULT_SRS_SETTINGS,
    dailyGoal: DEFAULT_STUDY_SETTINGS.dailyGoal,
    dailyLeft: DEFAULT_STUDY_SETTINGS.dailyGoal,
    newLeft: 20,
    reviewLeft: 100,
    isBypassed: false,
  },
  completionState: { done: false, reason: "", canStartNewSession: false },
  nextDueAt: null,
  nextLearningDueAt: null,
});
const clean = (value) => (typeof value === "string" ? value.trim() : "");
const cleanList = (value) =>
  Array.isArray(value) ? value.map(clean).filter(Boolean).slice(0, 10) : [];
export const toSessionCard = ({
  word,
  card,
  srsSettings,
  studySettings,
  nowMs,
}) => ({
  wordId: Number(word.id),
  source: clean(word.source),
  target: clean(word.target),
  tertiary: clean(word.tertiary),
  level: clean(word.level),
  part_of_speech: clean(word.part_of_speech),
  tags: cleanList(word.tags),
  examples: cleanList(word.examples),
  ...card,
  queueType: getQueueTypeByState(card.state),
  revision: getCardRevision(card),
  ratingPreview: buildRatingPreview({
    card,
    srsSettings,
    studySettings,
    nowMs,
    seed: Number(word.id),
  }),
});
const uniqueWords = (logs) =>
  new Set(
    logs
      .map((log) => Number(log.wordId))
      .filter((id) => Number.isInteger(id) && id > 0),
  ).size;
const byDue = (a, b) =>
  (a.card.dueAtMs ?? 0) - (b.card.dueAtMs ?? 0) || a.word.id - b.word.id;
// Mix both seed and identity; adding a seed to a linear hash barely changes order.
const hash = (id, seed) => {
  let value = (Number(id) ^ Number(seed)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
};
const chooseNew = (cards, settings) => {
  if (settings.shuffleMode === "always")
    return cards[Math.floor(Math.random() * cards.length)];
  return cards
    .slice()
    .sort((a, b) =>
      settings.shuffleMode === "per_session"
        ? hash(a.word.id, settings.shuffleSeed) -
            hash(b.word.id, settings.shuffleSeed) || a.word.id - b.word.id
        : (Number(a.word.createdAtMs) || 0) -
            (Number(b.word.createdAtMs) || 0) || a.word.id - b.word.id,
    )[0];
};
export const buildSrsSessionSnapshot = ({
  deck,
  words,
  cardsByWordId,
  todayLogs = [],
  srsSettings = {},
  studySettings = {},
  forceAllCards = false,
  nowMs = Date.now(),
}) => {
  const srs = normalizeSrsSettings(srsSettings);
  const study = normalizeStudySettings(studySettings);
  const queue = { new: [], review: [], learning: [], future: [] };
  for (const word of words) {
    const card = normalizeReviewCard(cardsByWordId.get(Number(word.id)) || {});
    const candidate = { word, card };
    if (card.state !== "new" && card.dueAtMs > nowMs)
      queue.future.push(candidate);
    else queue[getQueueTypeByState(card.state)].push(candidate);
  }
  queue.learning.sort(byDue);
  queue.review.sort(byDue);
  queue.future.sort(byDue);
  const reviewedToday = uniqueWords(
    todayLogs.filter((log) => log.queueType === "review"),
  );
  const newStudiedToday = uniqueWords(
    todayLogs.filter((log) => log.queueType === "new"),
  );
  const totalStudiedToday = uniqueWords(todayLogs);
  const newLeft = Math.max(0, srs.newCardsPerDay - newStudiedToday);
  const reviewLeft = Math.max(0, srs.maxReviewsPerDay - reviewedToday);
  const dueReview = Math.min(
    queue.review.length,
    forceAllCards ? Infinity : reviewLeft,
  );
  const dueNew = Math.min(queue.new.length, forceAllCards ? Infinity : newLeft);
  const candidate =
    queue.learning[0] ||
    (dueReview > 0 ? queue.review[0] : null) ||
    (dueNew > 0 ? chooseNew(queue.new, study) : null);
  const blocked = queue.review.length > dueReview || queue.new.length > dueNew;
  const waitingLearning = queue.future.filter(
    ({ card }) => card.state !== "review",
  );
  const reason = candidate
    ? ""
    : words.length === 0
      ? "empty-deck"
      : blocked
        ? "daily-limit"
        : waitingLearning.length
          ? "learning-wait"
          : "empty-queue";
  return {
    deck: {
      id: deck.id,
      name: deck.name,
      sourceLanguage: clean(deck.sourceLanguage),
      targetLanguage: clean(deck.targetLanguage),
      tertiaryLanguage: clean(deck.tertiaryLanguage),
    },
    sessionMode: forceAllCards ? "extended" : "default",
    card: candidate
      ? toSessionCard({
          ...candidate,
          srsSettings: srs,
          studySettings: study,
          nowMs,
        })
      : null,
    stats: {
      totalCards: words.length,
      dueLearning: queue.learning.length,
      dueReview,
      dueNew,
      dueTotal: queue.learning.length + dueReview + dueNew,
      reviewedToday,
      newStudiedToday,
      totalStudiedToday,
      answersToday: todayLogs.length,
      waitingLearning: waitingLearning.length,
    },
    limits: {
      newCardsPerDay: srs.newCardsPerDay,
      maxReviewsPerDay: srs.maxReviewsPerDay,
      dailyGoal: study.dailyGoal,
      dailyLeft: Math.max(0, study.dailyGoal - totalStudiedToday),
      newLeft,
      reviewLeft,
      isBypassed: forceAllCards,
    },
    completionState: {
      done: !candidate,
      reason,
      canStartNewSession: !candidate && blocked && !forceAllCards,
    },
    nextDueAt: queue.future[0]?.card.dueAt || null,
    nextLearningDueAt: waitingLearning[0]?.card.dueAt || null,
  };
};
