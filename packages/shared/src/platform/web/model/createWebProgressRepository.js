import { buildProgressOverview } from "@shared/core/usecases/progress";
import {
  WEB_DB_STORES,
  idbRequest,
  runReadonlyTransaction,
} from "@shared/platform/web/db";

export const createWebProgressRepository = () => {
  return {
    async getProgressOverview() {
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
            reviewCards: Array.isArray(cardRows) ? cardRows : [],
            reviewLogs: Array.isArray(logRows) ? logRows : [],
          };
        },
      );

      return buildProgressOverview({
        decks,
        words,
        reviewCards,
        reviewLogs,
      });
    },
  };
};
