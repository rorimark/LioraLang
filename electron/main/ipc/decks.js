export const registerDeckIpcHandlers = ({
  ipcMain,
  dialog,
  fs,
  path,
  getMainWindow,
  importWorkflow,
  getDeckById,
  getDeckWords,
  listDecks,
  exportDeckToJsonFile,
  exportDeckToJsonPackage,
  renameDeck,
  deleteDeck,
  saveDeck,
  getAppSettings,
  extractAppPreferencesFromSettings,
  sendDecksUpdated,
  trackAnalyticsEvent,
}) => {
  ipcMain.handle("decks:list", () => listDecks());

  ipcMain.handle("decks:get-by-id", (_, deckId) => {
    return getDeckById(Number(deckId));
  });

  ipcMain.handle("decks:get-words", (_, deckId) => {
    return getDeckWords(Number(deckId));
  });

  ipcMain.handle("decks:pick-import-json", async () => {
    return importWorkflow.pickDeckImportPayloadFromDialog();
  });

  ipcMain.handle("decks:import-json", async (_, payload) => {
    const filePath =
      typeof payload?.filePath === "string" ? payload.filePath.trim() : "";
    const fileText =
      typeof payload?.fileText === "string" ? payload.fileText.trim() : "";
    let tempFilePath = "";

    try {
      if (!filePath && fileText) {
        tempFilePath = importWorkflow.persistImportTextToTempFile(
          fileText,
          payload?.fileName || payload?.deckName || "",
        );
      }

      const importFilePath = filePath || tempFilePath;
      const { importResult, duplicateStrategy } = importWorkflow.importDeckFromFilePath(
        importFilePath,
        payload || {},
      );

      sendDecksUpdated();
      trackAnalyticsEvent("deck.imported", {
        deckId: importResult.deckId,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        duplicateStrategy,
        source: fileText ? "json-text" : "local-file",
      });

      return {
        canceled: false,
        ...importResult,
      };
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (cleanupError) {
          console.warn("[LioraLang] Failed to clean temp import file", cleanupError);
        }
      }
    }
  });

  ipcMain.handle("decks:import-url", async (_, payload) => {
    const downloadUrl =
      typeof payload?.downloadUrl === "string" ? payload.downloadUrl.trim() : "";
    const fileNameHint =
      typeof payload?.fileName === "string" ? payload.fileName.trim() : "";
    let tempFilePath = "";

    try {
      const downloadedFile = await importWorkflow.downloadRemoteDeckToTempFile(
        downloadUrl,
        fileNameHint,
      );
      tempFilePath = downloadedFile.tempFilePath;
      const downloadedBytes = downloadedFile.byteLength;
      const { importResult, duplicateStrategy } = importWorkflow.importDeckFromFilePath(
        tempFilePath,
        payload || {},
      );

      sendDecksUpdated();
      trackAnalyticsEvent("deck.imported", {
        deckId: importResult.deckId,
        importedCount: importResult.importedCount,
        skippedCount: importResult.skippedCount,
        duplicateStrategy,
        source: "hub-remote",
        downloadedBytes,
      });

      return {
        canceled: false,
        ...importResult,
      };
    } finally {
      if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.rmSync(tempFilePath, { force: true });
      }
    }
  });

  ipcMain.handle("decks:export-json", async (_, payload) => {
    const normalizedDeckId = Number(
      typeof payload === "object" ? payload?.deckId : payload,
    );
    const deck = getDeckById(normalizedDeckId);

    if (!deck) {
      throw new Error("Deck not found");
    }

    const appPreferences = extractAppPreferencesFromSettings(getAppSettings());
    const preferredFormat = ["lioradeck", "json"].includes(
      payload?.settings?.exportFormat,
    )
      ? payload.settings.exportFormat
      : appPreferences.importExport.exportFormat;
    const includeExamples =
      typeof payload?.settings?.includeExamples === "boolean"
        ? payload.settings.includeExamples
        : appPreferences.importExport.includeExamples;
    const includeTags =
      typeof payload?.settings?.includeTags === "boolean"
        ? payload.settings.includeTags
        : appPreferences.importExport.includeTags;
    const isJsonFormat = preferredFormat === "json";
    const primaryFilter = isJsonFormat
      ? { name: "JSON", extensions: ["json"] }
      : { name: "Liora deck", extensions: ["lioradeck"] };
    const secondaryFilter = isJsonFormat
      ? { name: "Liora deck", extensions: ["lioradeck"] }
      : { name: "JSON", extensions: ["json"] };
    const defaultExtension = isJsonFormat ? "json" : "lioradeck";

    const result = await dialog.showSaveDialog(getMainWindow(), {
      title: "Export deck package",
      defaultPath: `${deck.name}.${defaultExtension}`,
      filters: [primaryFilter, secondaryFilter],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    const selectedExtension = path.extname(result.filePath).toLowerCase();
    const hasSupportedExtension =
      selectedExtension === ".lioradeck" || selectedExtension === ".json";
    const resolvedFilePath = hasSupportedExtension
      ? result.filePath
      : `${result.filePath}.${defaultExtension}`;
    const exportResult = exportDeckToJsonFile(
      normalizedDeckId,
      resolvedFilePath,
      {
        includeExamples,
        includeTags,
      },
    );
    trackAnalyticsEvent("deck.exported", {
      deckId: normalizedDeckId,
      exportedCount: exportResult.exportedCount,
      format: preferredFormat,
    });

    return {
      canceled: false,
      ...exportResult,
    };
  });

  ipcMain.handle("decks:export-package", (_, payload) => {
    const normalizedDeckId = Number(
      typeof payload === "object" ? payload?.deckId : payload,
    );
    const appPreferences = extractAppPreferencesFromSettings(getAppSettings());
    const includeExamples =
      typeof payload?.settings?.includeExamples === "boolean"
        ? payload.settings.includeExamples
        : appPreferences.importExport.includeExamples;
    const includeTags =
      typeof payload?.settings?.includeTags === "boolean"
        ? payload.settings.includeTags
        : appPreferences.importExport.includeTags;
    const exportResult = exportDeckToJsonPackage(normalizedDeckId, {
      includeExamples,
      includeTags,
    });

    return exportResult;
  });

  ipcMain.handle("decks:rename", (_, payload) => {
    const renamedDeck = renameDeck(payload?.deckId, payload?.name);
    sendDecksUpdated();
    trackAnalyticsEvent("deck.renamed", {
      deckId: payload?.deckId,
    });
    return renamedDeck;
  });

  ipcMain.handle("decks:delete", (_, payload) => {
    const deletionResult = deleteDeck(payload?.deckId);
    sendDecksUpdated();
    trackAnalyticsEvent("deck.deleted", {
      deckId: payload?.deckId,
    });
    return deletionResult;
  });

  ipcMain.handle("decks:save", (_, payload) => {
    const saveResult = saveDeck(payload || {});
    sendDecksUpdated();
    trackAnalyticsEvent("deck.saved", {
      deckId: saveResult?.deck?.id || payload?.deckId || null,
      wordsCount: Array.isArray(saveResult?.words) ? saveResult.words.length : 0,
    });
    return saveResult;
  });
};
