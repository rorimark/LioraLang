export const registerStudyIpcHandlers = ({
  ipcMain,
  getSrsSessionSnapshot,
  gradeSrsCard,
  getProgressOverview,
  getDeckStudy,
}) => {
  ipcMain.handle("srs:get-session", (_, payload) => {
    return getSrsSessionSnapshot({
      deckId: payload?.deckId,
      settings: payload?.settings || {},
      forceAllCards: Boolean(payload?.forceAllCards),
      profileScope: payload?.profileScope,
    });
  });

  ipcMain.handle("srs:grade-card", (_, payload) => {
    return gradeSrsCard({
      deckId: payload?.deckId,
      wordId: payload?.wordId,
      rating: payload?.rating,
      expectedRevision: payload?.expectedRevision,
      expectedProfileScope: payload?.expectedProfileScope,
      settings: payload?.settings || {},
      forceAllCards: Boolean(payload?.forceAllCards),
      profileScope: payload?.profileScope,
    });
  });

  ipcMain.handle("progress:get-overview", (_, payload) => {
    return getProgressOverview({
      profileScope: payload?.profileScope,
    });
  });

  ipcMain.handle("progress:get-deck-study", (_, payload) => {
    return getDeckStudy({
      deckId: payload?.deckId,
      profileScope: payload?.profileScope,
    });
  });
};
