import {
  EMPTY_SRS_SESSION,
  SRS_CARD_RATINGS,
  SRS_CARD_STATES,
  buildSrsSessionSnapshot,
  getQueueTypeByState,
  normalizeRating,
  normalizeReviewCard,
  normalizeSrsSettings,
  normalizeStudySettings,
  resolveScheduleOutcome,
} from "@shared/core/usecases/srs";
import { getCurrentSupabaseAuthUser } from "@shared/api";
import {
  buildUserProfileScope,
  createDeckSyncId,
  GUEST_PROFILE_SCOPE,
  normalizeProfileScope,
} from "@shared/core/usecases/sync";
import {
  WEB_DB_STORES,
  idbRequest,
  runReadonlyTransaction,
  runReadwriteTransaction,
  toLocalDayKey,
} from "@shared/platform/web/db";
import { createWebSyncLocalRepository } from "./createWebSyncLocalRepository";

let webSyncLocalRepository = null;

const getWebSyncLocalRepository = () => {
  if (!webSyncLocalRepository) {
    webSyncLocalRepository = createWebSyncLocalRepository();
  }

  return webSyncLocalRepository;
};

const parsePositiveInteger = (value) => {
  const numericValue = Number(value);

  if (!Number.isInteger(numericValue) || numericValue <= 0) {
    return null;
  }

  return numericValue;
};

const toIsoTimestamp = (timestampMs) => {
  const date = new Date(timestampMs);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString();
  }

  return date.toISOString();
};

const resolveCurrentProfileScope = async () => {
  try {
    const user = await getCurrentSupabaseAuthUser();

    if (user?.id) {
      return buildUserProfileScope(user.id);
    }
  } catch {
    // Ignore auth lookup failures and fall back to guest mode.
  }

  return GUEST_PROFILE_SCOPE;
};

const loadDeckLearningData = async (deckId, dayKey, profileScope) => {
  const normalizedDeckId = parsePositiveInteger(deckId);
  const normalizedProfileScope = normalizeProfileScope(profileScope);

  if (!normalizedDeckId) {
    throw new Error("Invalid deck id");
  }

  return runReadonlyTransaction(
    [
      WEB_DB_STORES.decks,
      WEB_DB_STORES.words,
      WEB_DB_STORES.reviewCards,
      WEB_DB_STORES.reviewLogs,
    ],
    async ({ getStore }) => {
      const decksStore = getStore(WEB_DB_STORES.decks);
      const wordsStore = getStore(WEB_DB_STORES.words);
      const reviewCardsStore = getStore(WEB_DB_STORES.reviewCards);
      const reviewLogsStore = getStore(WEB_DB_STORES.reviewLogs);

      const [deck, words, cards, todayLogs] = await Promise.all([
        idbRequest(decksStore.get(normalizedDeckId)),
        idbRequest(wordsStore.index("deckId").getAll(normalizedDeckId)),
        idbRequest(reviewCardsStore.index("deckId").getAll(normalizedDeckId)),
        idbRequest(reviewLogsStore.index("deckDayKey").getAll([normalizedDeckId, dayKey])),
      ]);

      if (!deck) {
        throw new Error("Deck not found");
      }

      return {
        deck,
        words: Array.isArray(words) ? words : [],
        cardsByWordId: new Map(
          (Array.isArray(cards) ? cards : [])
            .filter((card) => normalizeProfileScope(card?.profileScope) === normalizedProfileScope)
            .map((card) => [parsePositiveInteger(card?.wordId), card])
            .filter(([wordId]) => Boolean(wordId)),
        ),
        todayLogs: (Array.isArray(todayLogs) ? todayLogs : []).filter(
          (logRecord) =>
            normalizeProfileScope(logRecord?.profileScope) === normalizedProfileScope,
        ),
      };
    },
  );
};

const getSrsSessionSnapshotInternal = async ({
  deckId,
  forceAllCards,
  srsSettings,
  studySettings,
}) => {
  const nowMs = Date.now();
  const dayKey = toLocalDayKey(nowMs);
  const data = await loadDeckLearningData(deckId, dayKey, studySettings.profileScope);

  return buildSrsSessionSnapshot({
    deck: {
      id: data.deck.id,
      name: data.deck.name,
      sourceLanguage: data.deck.sourceLanguage,
      targetLanguage: data.deck.targetLanguage,
      tertiaryLanguage: data.deck.tertiaryLanguage,
    },
    words: data.words,
    cardsByWordId: data.cardsByWordId,
    todayLogs: data.todayLogs,
    srsSettings,
    studySettings,
    forceAllCards,
    nowMs,
  });
};

export const createWebSrsRepository = () => {
  const getSrsSession = async (deckId, settings = {}, options = {}) => {
    if (!deckId) {
      return EMPTY_SRS_SESSION;
    }

    const profileScope = await resolveCurrentProfileScope();
    await getWebSyncLocalRepository().activateProfile(profileScope);

    const srsSettings = normalizeSrsSettings(settings);
    const studySettings = {
      ...normalizeStudySettings(settings),
      profileScope,
    };

    return getSrsSessionSnapshotInternal({
      deckId,
      forceAllCards: Boolean(options?.forceAllCards),
      srsSettings,
      studySettings,
    });
  };

  const gradeSrsCard = async (payload = {}) => {
    const deckId = parsePositiveInteger(payload?.deckId);
    const wordId = parsePositiveInteger(payload?.wordId);
    const rating = normalizeRating(payload?.rating);

    if (!deckId) {
      throw new Error("Invalid deck id");
    }

    if (!wordId) {
      throw new Error("Invalid word id");
    }

    const profileScope = normalizeProfileScope(await resolveCurrentProfileScope());
    const settingsSource = payload?.settings || {};
    const srsSettings = normalizeSrsSettings(settingsSource);
    const studySettings = {
      ...normalizeStudySettings(settingsSource),
      profileScope,
    };
    const forceAllCards = Boolean(payload?.forceAllCards);
    const nowMs = Date.now();
    const syncLocalRepository = getWebSyncLocalRepository();
    await syncLocalRepository.activateProfile(profileScope);
    const { deviceId } = await syncLocalRepository.ensureDeviceIdentity();
    const deviceSeq = await syncLocalRepository.nextDeviceSequence(profileScope);
    const opId = createDeckSyncId();

    await runReadwriteTransaction(
      [WEB_DB_STORES.decks, WEB_DB_STORES.words, WEB_DB_STORES.reviewCards, WEB_DB_STORES.reviewLogs],
      async ({ getStore }) => {
        const decksStore = getStore(WEB_DB_STORES.decks);
        const wordsStore = getStore(WEB_DB_STORES.words);
        const reviewCardsStore = getStore(WEB_DB_STORES.reviewCards);
        const reviewLogsStore = getStore(WEB_DB_STORES.reviewLogs);
        const [word, existingCard] = await Promise.all([
          idbRequest(wordsStore.get(wordId)),
          idbRequest(reviewCardsStore.get(wordId)),
        ]);

        if (!word || parsePositiveInteger(word.deckId) !== deckId) {
          throw new Error("Word does not belong to selected deck");
        }

        const deck = await idbRequest(decksStore.get(deckId));

        if (!deck?.syncId) {
          throw new Error("Deck sync metadata is missing. Reopen the deck and try again.");
        }

        const previousCard = normalizeReviewCard(existingCard || { state: SRS_CARD_STATES.new });
        const queueType = getQueueTypeByState(previousCard.state);
        const nextCard = resolveScheduleOutcome({
          card: previousCard,
          rating,
          srsSettings,
          studySettings,
          nowMs,
        });

        reviewCardsStore.put({
          wordId,
          deckId,
          state: nextCard.state,
          learningStep: nextCard.learningStep,
          dueAt: nextCard.dueAt,
          dueAtMs: nextCard.dueAtMs,
          intervalDays: nextCard.intervalDays,
          easeFactor: nextCard.easeFactor,
          reps: nextCard.reps,
          lapses: nextCard.lapses,
          profileScope,
          createdAtMs: Number(existingCard?.createdAtMs) || nowMs,
          updatedAtMs: nowMs,
        });

        reviewLogsStore.add({
          deckId,
          wordId,
          rating,
          queueType,
          reviewedAt: toIsoTimestamp(nowMs),
          reviewedAtMs: nowMs,
          dayKey: toLocalDayKey(nowMs),
          wasCorrect: rating !== SRS_CARD_RATINGS.again,
          prevState: previousCard.state,
          nextState: nextCard.state,
          prevIntervalDays: previousCard.intervalDays,
          nextIntervalDays: nextCard.intervalDays,
          prevEaseFactor: previousCard.easeFactor,
          nextEaseFactor: nextCard.easeFactor,
          profileScope,
          opId,
          deviceId,
          deviceSeq,
          deckSyncId: String(deck.syncId || "").toLowerCase(),
          wordExternalId: String(word.externalId || ""),
          payload: {
            previousCard,
            nextCard,
            settings: {
              srsSettings,
              studySettings,
            },
          },
          syncStatus: "pending",
          syncedAt: "",
          serverSeq: 0,
          createdAtMs: nowMs,
          updatedAtMs: nowMs,
        });
      },
    );

    return getSrsSessionSnapshotInternal({
      deckId,
      forceAllCards,
      srsSettings,
      studySettings,
    });
  };

  return {
    getSrsSession,
    gradeSrsCard,
  };
};
