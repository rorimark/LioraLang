export const registerHubIpcHandlers = ({
  ipcMain,
  listHubDecks,
  getHubDeckBySlug,
  createHubDeckDownloadUrl,
  publishHubDeck,
  incrementHubDeckDownloads,
  deleteHubDeck,
  trackAnalyticsEvent,
}) => {
  ipcMain.handle("hub:list-decks", (_, payload) => {
    return listHubDecks({
      config: payload?.config || {},
      page: payload?.page,
      pageSize: payload?.pageSize,
      search: payload?.search,
    });
  });

  ipcMain.handle("hub:get-deck-by-slug", (_, payload) => {
    return getHubDeckBySlug({
      config: payload?.config || {},
      slug: payload?.slug,
    });
  });

  ipcMain.handle("hub:create-download-url", (_, payload) => {
    return createHubDeckDownloadUrl({
      config: payload?.config || {},
      filePath: payload?.filePath,
      expiresInSeconds: payload?.expiresInSeconds,
    });
  });

  ipcMain.handle("hub:publish-deck", async (_, payload) => {
    const publishResult = await publishHubDeck({
      config: payload?.config || {},
      deck: payload?.deck || {},
      deckPackage: payload?.deckPackage || null,
    });

    trackAnalyticsEvent("deck.publishedToHub", {
      deckId: publishResult?.deckId || null,
      version: publishResult?.version || null,
      wordsCount: publishResult?.wordsCount || null,
    });

    return publishResult;
  });

  ipcMain.handle("hub:increment-downloads", async (_, payload) => {
    return incrementHubDeckDownloads({
      config: payload?.config || {},
      deckId: payload?.deckId,
      currentDownloadsCount: payload?.currentDownloadsCount,
    });
  });

  ipcMain.handle("hub:delete-deck", async (_, payload) => {
    return deleteHubDeck({
      config: payload?.config || {},
      deckId: payload?.deckId,
    });
  });
};
