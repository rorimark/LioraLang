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
    });
  });

  ipcMain.handle("srs:grade-card", (_, payload) => {
    return gradeSrsCard({
      deckId: payload?.deckId,
      wordId: payload?.wordId,
      rating: payload?.rating,
      settings: payload?.settings || {},
      forceAllCards: Boolean(payload?.forceAllCards),
    });
  });

  ipcMain.handle("progress:get-overview", () => {
    return getProgressOverview();
  });
};
