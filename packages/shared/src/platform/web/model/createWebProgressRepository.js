import { buildDeckStudy, buildProgressOverview } from "@shared/core/usecases/progress";
import { getCurrentSupabaseAuthUser } from "@shared/api";
import { buildUserProfileScope, GUEST_PROFILE_SCOPE, normalizeProfileScope } from "@shared/core/usecases/sync";
import {
  WEB_DB_STORES,
  idbRequest,
  runReadonlyTransaction,
} from "@shared/platform/web/db";
import { createWebSyncLocalRepository } from "./createWebSyncLocalRepository";

let webSyncLocalRepository = null;

const getWebSyncLocalRepository = () => {
  if (!webSyncLocalRepository) {
    webSyncLocalRepository = createWebSyncLocalRepository();
  }

  return webSyncLocalRepository;
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

export const createWebProgressRepository = () => {
  return {
    // The profile can be given (the account page knows who is signed in
    // before the auth client has settled); otherwise it is looked up.
    async getProgressOverview({ profileScope: requestedProfileScope = "" } = {}) {
      const profileScope = normalizeProfileScope(
        requestedProfileScope || (await resolveCurrentProfileScope()),
      );
      await getWebSyncLocalRepository().activateProfile(profileScope);
      const { decks, words, reviewCards, reviewLogs } = await runReadonlyTransaction(
        [
          WEB_DB_STORES.decks,
          WEB_DB_STORES.words,
          WEB_DB_STORES.reviewCards,
          WEB_DB_STORES.reviewLogs,
        ],
        async ({ getStore }) => {
          const [deckRows, wordRows, cardRows, logRows] = await Promise.all([
            idbRequest(getStore(WEB_DB_STORES.decks).getAll()),
            idbRequest(getStore(WEB_DB_STORES.words).getAll()),
            idbRequest(getStore(WEB_DB_STORES.reviewCards).getAll()),
            idbRequest(getStore(WEB_DB_STORES.reviewLogs).getAll()),
          ]);

          return {
            decks: Array.isArray(deckRows) ? deckRows : [],
            words: Array.isArray(wordRows) ? wordRows : [],
            reviewCards: (Array.isArray(cardRows) ? cardRows : []).filter(
              (card) => normalizeProfileScope(card?.profileScope) === profileScope,
            ),
            reviewLogs: (Array.isArray(logRows) ? logRows : []).filter(
              (logRecord) => normalizeProfileScope(logRecord?.profileScope) === profileScope,
            ),
          };
        },
      );

      return buildProgressOverview({
        decks,
        words,
        reviewCards,
        reviewLogs,
        profileScope,
      });
    },

    // One deck, word by word: read through the deck indexes, so a large
    // library is not read for one page.
    async getDeckStudy(deckId, { profileScope: requestedProfileScope = "" } = {}) {
      const numericDeckId = Number(deckId);
      const profileScope = normalizeProfileScope(
        requestedProfileScope || (await resolveCurrentProfileScope()),
      );
      await getWebSyncLocalRepository().activateProfile(profileScope);
      const { words, reviewCards, reviewLogs } = await runReadonlyTransaction(
        [WEB_DB_STORES.words, WEB_DB_STORES.reviewCards, WEB_DB_STORES.reviewLogs],
        async ({ getStore }) => {
          const [wordRows, cardRows, logRows] = await Promise.all([
            idbRequest(getStore(WEB_DB_STORES.words).index("deckId").getAll(numericDeckId)),
            idbRequest(getStore(WEB_DB_STORES.reviewCards).index("deckId").getAll(numericDeckId)),
            idbRequest(getStore(WEB_DB_STORES.reviewLogs).index("deckId").getAll(numericDeckId)),
          ]);
          const isOwn = (row) => normalizeProfileScope(row?.profileScope) === profileScope;

          return {
            words: Array.isArray(wordRows) ? wordRows : [],
            reviewCards: (Array.isArray(cardRows) ? cardRows : []).filter(isOwn),
            reviewLogs: (Array.isArray(logRows) ? logRows : []).filter(isOwn),
          };
        },
      );

      return buildDeckStudy({ words, reviewCards, reviewLogs });
    },
  };
};
