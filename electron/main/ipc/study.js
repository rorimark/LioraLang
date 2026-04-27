export const registerStudyIpcHandlers = ({
  ipcMain,
  getSrsSessionSnapshot,
  gradeSrsCard,
  getProgressOverview,
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
};
