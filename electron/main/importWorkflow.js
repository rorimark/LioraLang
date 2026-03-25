import process from "node:process";

const SUPPORTED_DECK_IMPORT_EXTENSIONS = [".json", ".lioradeck", ".lioralang"];
const REMOTE_IMPORT_TIMEOUT_MS = 35_000;
const REMOTE_IMPORT_MAX_BYTES = 50 * 1024 * 1024;

export const createImportWorkflow = ({
  app,
  BrowserWindow,
  dialog,
  fs,
  path,
  fetchImpl,
  getMainWindow,
  getSupabaseUrl,
  getAppPreferences,
  readDeckImportMetadataFromJsonFile,
  importDeckFromJsonFile,
  isTrustedHubStorageUrl,
  toOrigin,
  reportRuntimeError,
}) => {
  let pendingImportFilePaths = [];

  const normalizeImportFilePath = (filePath) => {
    if (typeof filePath !== "string") {
      return "";
    }

    const trimmedPath = filePath.trim().replace(/^['"]|['"]$/g, "");

    if (!trimmedPath) {
      return "";
    }

    return path.resolve(trimmedPath);
  };

  const isDeckImportFilePath = (filePath) => {
    const normalizedPath = normalizeImportFilePath(filePath);

    if (!normalizedPath) {
      return false;
    }

    const fileExtension = path.extname(normalizedPath).toLowerCase();

    return SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(fileExtension);
  };

  const resolveDeckImportFilePathFromArgs = (
    args = [],
    workingDirectory = process.cwd(),
  ) => {
    if (!Array.isArray(args) || args.length === 0) {
      return "";
    }

    for (const argValue of args) {
      if (typeof argValue !== "string" || argValue.startsWith("-")) {
        continue;
      }

      const normalizedArgValue = argValue.trim().replace(/^['"]|['"]$/g, "");

      if (!normalizedArgValue) {
        continue;
      }

      const resolvedPath = path.isAbsolute(normalizedArgValue)
        ? normalizedArgValue
        : path.resolve(workingDirectory || process.cwd(), normalizedArgValue);

      if (!isDeckImportFilePath(resolvedPath) || !fs.existsSync(resolvedPath)) {
        continue;
      }

      return normalizeImportFilePath(resolvedPath);
    }

    return "";
  };

  const readDeckImportPayloadFromFilePath = (filePath) => {
    const normalizedFilePath = normalizeImportFilePath(filePath);

    if (!normalizedFilePath || !fs.existsSync(normalizedFilePath)) {
      return null;
    }

    const fallbackDeckName = path.basename(
      normalizedFilePath,
      path.extname(normalizedFilePath),
    );
    const importMetadata = (() => {
      try {
        return readDeckImportMetadataFromJsonFile(normalizedFilePath);
      } catch {
        return null;
      }
    })();

    return {
      canceled: false,
      filePath: normalizedFilePath,
      fileName: path.basename(normalizedFilePath),
      suggestedDeckName: importMetadata?.name || fallbackDeckName,
      sourceLanguage: importMetadata?.sourceLanguage || "",
      targetLanguage: importMetadata?.targetLanguage || "",
      tertiaryLanguage: importMetadata?.tertiaryLanguage || "",
      tags: Array.isArray(importMetadata?.tags) ? importMetadata.tags : [],
      description: importMetadata?.description || "",
      wordsCount: importMetadata?.wordsCount ?? null,
      packageFormat: importMetadata?.format || "",
      packageVersion: importMetadata?.version ?? null,
    };
  };

  const resolveDeckImportSettings = (payload = {}) => {
    const appPreferences = getAppPreferences();
    const sourceLanguage =
      typeof payload?.sourceLanguage === "string" ? payload.sourceLanguage.trim() : "";
    const targetLanguage =
      typeof payload?.targetLanguage === "string" ? payload.targetLanguage.trim() : "";
    const tertiaryLanguage =
      typeof payload?.tertiaryLanguage === "string"
        ? payload.tertiaryLanguage.trim()
        : "";
    const duplicateStrategy = ["skip", "update", "keep_both"].includes(
      payload?.settings?.duplicateStrategy,
    )
      ? payload.settings.duplicateStrategy
      : appPreferences.importExport.duplicateStrategy;
    const includeExamples =
      typeof payload?.settings?.includeExamples === "boolean"
        ? payload.settings.includeExamples
        : appPreferences.importExport.includeExamples;
    const includeTags =
      typeof payload?.settings?.includeTags === "boolean"
        ? payload.settings.includeTags
        : appPreferences.importExport.includeTags;

    return {
      deckName:
        typeof payload?.deckName === "string" ? payload.deckName.trim() : "",
      sourceLanguage,
      targetLanguage,
      tertiaryLanguage,
      duplicateStrategy,
      includeExamples,
      includeTags,
    };
  };

  const importDeckFromFilePath = (filePath, payload = {}) => {
    const normalizedFilePath =
      typeof filePath === "string" ? filePath.trim() : "";

    if (!normalizedFilePath) {
      throw new Error("Import file is not selected");
    }

    const fileExtension = path.extname(normalizedFilePath).toLowerCase();

    if (!SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(fileExtension)) {
      throw new Error("Only .json, .lioradeck and .lioralang files can be imported");
    }

    if (!fs.existsSync(normalizedFilePath)) {
      throw new Error("Selected import file does not exist");
    }

    const importSettings = resolveDeckImportSettings(payload);
    const importResult = importDeckFromJsonFile(normalizedFilePath, importSettings);

    return {
      importResult,
      duplicateStrategy: importSettings.duplicateStrategy,
    };
  };

  const toSafeImportFileName = (value, fallbackExtension = ".lioradeck") => {
    const rawValue =
      typeof value === "string" ? value.trim() : "";
    const baseName = rawValue
      ? path.basename(rawValue)
      : `hub-deck${fallbackExtension}`;
    const cleanedName = baseName
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");
    const normalizedExtension = path.extname(cleanedName).toLowerCase();

    if (SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(normalizedExtension)) {
      return cleanedName;
    }

    const fallbackName =
      path.basename(cleanedName, path.extname(cleanedName)) || "hub-deck";
    const safeExtension = SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(fallbackExtension)
      ? fallbackExtension
      : ".lioradeck";

    return `${fallbackName}${safeExtension}`;
  };

  const persistImportTextToTempFile = (fileText, fileNameHint = "") => {
    const normalizedText =
      typeof fileText === "string" ? fileText.trim() : "";

    if (!normalizedText) {
      throw new Error("Import JSON text is empty");
    }

    const importTempDir = path.join(app.getPath("temp"), "lioralang-imports");
    fs.mkdirSync(importTempDir, { recursive: true });

    const safeFileName = toSafeImportFileName(
      fileNameHint || "imported-deck.json",
      ".json",
    );
    const randomSuffix = Math.random().toString(16).slice(2, 10);
    const tempFilePath = path.join(
      importTempDir,
      `json-${Date.now()}-${randomSuffix}-${safeFileName}`,
    );

    fs.writeFileSync(tempFilePath, normalizedText, "utf8");

    return tempFilePath;
  };

  const resolveRemoteImportUrl = (value) => {
    if (typeof value !== "string") {
      return null;
    }

    const normalizedUrl = value.trim();

    if (!normalizedUrl) {
      return null;
    }

    try {
      const parsedUrl = new URL(normalizedUrl);

      if (!["https:", "http:"].includes(parsedUrl.protocol)) {
        return null;
      }

      if (
        !isTrustedHubStorageUrl(
          parsedUrl,
          toOrigin(getSupabaseUrl()),
        )
      ) {
        return null;
      }

      return parsedUrl;
    } catch {
      return null;
    }
  };

  const downloadRemoteDeckToTempFile = async (downloadUrl, fileNameHint = "") => {
    const parsedUrl = resolveRemoteImportUrl(downloadUrl);

    if (!parsedUrl) {
      throw new Error("Invalid Hub deck download URL");
    }

    const extensionFromPath = path.extname(parsedUrl.pathname || "").toLowerCase();
    const safeFileName = toSafeImportFileName(
      fileNameHint,
      extensionFromPath || ".lioradeck",
    );
    const safeExtension = path.extname(safeFileName).toLowerCase();

    if (!SUPPORTED_DECK_IMPORT_EXTENSIONS.includes(safeExtension)) {
      throw new Error("Only .json, .lioradeck and .lioralang files can be imported");
    }

    const importTempDir = path.join(app.getPath("temp"), "lioralang-imports");
    fs.mkdirSync(importTempDir, { recursive: true });

    const randomSuffix = Math.random().toString(16).slice(2, 10);
    const tempFilePath = path.join(
      importTempDir,
      `hub-${Date.now()}-${randomSuffix}${safeExtension}`,
    );
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, REMOTE_IMPORT_TIMEOUT_MS);

    try {
      const response = await fetchImpl(parsedUrl.toString(), {
        method: "GET",
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to download deck package (${response.status})`);
      }

      const contentLength = Number(response.headers.get("content-length"));

      if (Number.isFinite(contentLength) && contentLength > REMOTE_IMPORT_MAX_BYTES) {
        throw new Error("Downloaded deck file is too large");
      }

      const fileBuffer = new Uint8Array(await response.arrayBuffer());

      if (fileBuffer.byteLength === 0) {
        throw new Error("Downloaded deck file is empty");
      }

      if (fileBuffer.byteLength > REMOTE_IMPORT_MAX_BYTES) {
        throw new Error("Downloaded deck file is too large");
      }

      fs.writeFileSync(tempFilePath, fileBuffer);

      return {
        tempFilePath,
        safeFileName,
        byteLength: fileBuffer.byteLength,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const flushPendingImportFileRequests = () => {
    const mainWindow = getMainWindow();

    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (mainWindow.webContents.isLoadingMainFrame()) {
      return;
    }

    if (pendingImportFilePaths.length === 0) {
      return;
    }

    const filePathsToSend = pendingImportFilePaths;
    pendingImportFilePaths = [];

    filePathsToSend.forEach((filePath) => {
      const payload = readDeckImportPayloadFromFilePath(filePath);

      if (!payload) {
        return;
      }

      mainWindow.webContents.send("decks:open-import-file", payload);
    });
  };

  const queueImportFileOpenRequest = (filePath) => {
    const normalizedFilePath = normalizeImportFilePath(filePath);

    if (
      !normalizedFilePath ||
      !isDeckImportFilePath(normalizedFilePath) ||
      !fs.existsSync(normalizedFilePath)
    ) {
      return;
    }

    if (!pendingImportFilePaths.includes(normalizedFilePath)) {
      pendingImportFilePaths.push(normalizedFilePath);
    }

    flushPendingImportFileRequests();
  };

  const getDialogParentWindow = () => {
    return BrowserWindow.getFocusedWindow() || getMainWindow() || undefined;
  };

  const pickDeckImportPayloadFromDialog = async () => {
    const result = await dialog.showOpenDialog(getDialogParentWindow(), {
      title: "Import deck file",
      properties: ["openFile"],
      filters: [
        { name: "Deck files", extensions: ["lioradeck", "lioralang", "json"] },
        { name: "Liora deck package (.lioradeck)", extensions: ["lioradeck"] },
        { name: "Legacy Liora package (.lioralang)", extensions: ["lioralang"] },
        { name: "JSON deck (.json)", extensions: ["json"] },
      ],
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true };
    }

    const payload = readDeckImportPayloadFromFilePath(result.filePaths[0]);

    if (!payload) {
      throw new Error("Selected import file is invalid");
    }

    return payload;
  };

  const requestDeckImportFromMenu = async () => {
    try {
      const payload = await pickDeckImportPayloadFromDialog();

      if (payload?.canceled || typeof payload?.filePath !== "string") {
        return;
      }

      queueImportFileOpenRequest(payload.filePath);
    } catch (error) {
      reportRuntimeError(error, "menu:import-deck");
    }
  };

  return {
    flushPendingImportFileRequests,
    queueImportFileOpenRequest,
    resolveDeckImportFilePathFromArgs,
    readDeckImportPayloadFromFilePath,
    importDeckFromFilePath,
    persistImportTextToTempFile,
    downloadRemoteDeckToTempFile,
    pickDeckImportPayloadFromDialog,
    requestDeckImportFromMenu,
    getSupportedDeckImportExtensions: () => SUPPORTED_DECK_IMPORT_EXTENSIONS,
  };
};
