import process from "node:process";

const normalizeAppVersion = (value) => {
  const normalized = String(value || "").trim();
  return normalized.replace(/^v/i, "");
};

const isSameAppVersion = (left, right) => {
  if (!left || !right) {
    return false;
  }

  return normalizeAppVersion(left) === normalizeAppVersion(right);
};

const compareVersionParts = (leftParts, rightParts) => {
  const maxLength = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
};

const parseVersionParts = (value) => {
  const normalized = normalizeAppVersion(value);
  if (!normalized) {
    return [];
  }

  return normalized
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));
};

const isRemoteVersionNewer = (remoteVersion, currentVersion) => {
  if (!remoteVersion || !currentVersion) {
    return false;
  }

  const remoteParts = parseVersionParts(remoteVersion);
  const currentParts = parseVersionParts(currentVersion);

  if (remoteParts.length === 0 || currentParts.length === 0) {
    return false;
  }

  return compareVersionParts(remoteParts, currentParts) > 0;
};

export const createUpdaterManager = ({
  app,
  autoUpdater,
  BrowserWindow,
  fs,
  path,
  pipeline,
  fetchImpl,
  logDebug,
  logWarn,
  getUpdateChannel,
}) => {
  let isAutoUpdaterInitialized = false;
  let lastUpdateInfo = null;

  const isMissingUpdateArtifactError = (error) => {
    const message = typeof error?.message === "string" ? error.message : "";

    if (!message) {
      return false;
    }

    return (
      message.includes("Cannot find") &&
      (message.includes("latest") || message.includes("stable") || message.includes("beta")) &&
      message.includes(".yml")
    );
  };

  const isUpdateSignatureError = (error) => {
    const message =
      typeof error?.message === "string" ? error.message.toLowerCase() : "";

    if (!message) {
      return false;
    }

    return (
      message.includes("code signature") &&
      message.includes("did not pass validation")
    );
  };

  const resolveUpdaterCacheDirFromError = (error) => {
    const message = typeof error?.message === "string" ? error.message : "";

    if (!message) {
      return "";
    }

    const match = message.match(/file:\/\/([^\s]+\.app)\//i);

    if (!match || !match[1]) {
      return "";
    }

    try {
      const appPath = decodeURIComponent(match[1]);
      return path.dirname(appPath);
    } catch {
      return path.dirname(match[1]);
    }
  };

  const resolveInstallerExtensions = () => {
    if (process.platform === "darwin") {
      return [".dmg"];
    }

    if (process.platform === "win32") {
      return [".exe"];
    }

    return [".dmg", ".exe"];
  };

  const findInstallerInDirectory = (dirPath) => {
    if (!dirPath || !fs.existsSync(dirPath)) {
      return "";
    }

    const allowedExtensions = resolveInstallerExtensions();
    const entries = fs.readdirSync(dirPath);
    const candidates = entries
      .filter((entry) => allowedExtensions.some((ext) => entry.toLowerCase().endsWith(ext)))
      .map((entry) => path.join(dirPath, entry))
      .filter((entry) => fs.existsSync(entry));

    if (candidates.length === 0) {
      return "";
    }

    const sorted = candidates
      .map((candidate) => ({
        path: candidate,
        mtime: fs.statSync(candidate).mtimeMs || 0,
      }))
      .sort((left, right) => right.mtime - left.mtime);

    return sorted[0]?.path || "";
  };

  const resolveUpdateInstallerPath = (error) => {
    const cacheDir = resolveUpdaterCacheDirFromError(error);

    if (!cacheDir) {
      return "";
    }

    return (
      findInstallerInDirectory(cacheDir) ||
      findInstallerInDirectory(path.dirname(cacheDir))
    );
  };

  const resolveInstallerFileName = (version) => {
    if (!version) {
      return "";
    }

    if (process.platform === "darwin") {
      return `LioraLang-${version}-arm64.dmg`;
    }

    if (process.platform === "win32") {
      return `LioraLang Setup ${version}.exe`;
    }

    return "";
  };

  const downloadInstallerToDownloads = async (version) => {
    const fileName = resolveInstallerFileName(version);

    if (!fileName) {
      return "";
    }

    const downloadsPath = app.getPath("downloads");
    const targetPath = path.join(downloadsPath, fileName);

    if (fs.existsSync(targetPath)) {
      return targetPath;
    }

    const encodedName = encodeURIComponent(fileName);
    const url = `https://github.com/rorimark/LioraLang/releases/download/v${version}/${encodedName}`;

    try {
      const response = await fetchImpl(url);
      if (!response.ok || !response.body) {
        logWarn("Failed to download installer", response.status);
        return "";
      }

      const fileStream = fs.createWriteStream(targetPath);
      await pipeline(response.body, fileStream);
      return targetPath;
    } catch (error) {
      logWarn("Failed to download installer", error);
      return "";
    }
  };

  const copyUpdateToDownloads = (sourcePath) => {
    if (!sourcePath || !fs.existsSync(sourcePath)) {
      return "";
    }

    try {
      const downloadsPath = app.getPath("downloads");
      const targetPath = path.join(downloadsPath, path.basename(sourcePath));

      if (fs.existsSync(targetPath)) {
        return targetPath;
      }

      fs.copyFileSync(sourcePath, targetPath);
      logDebug("[Updater] copied installer to Downloads", targetPath);
      return targetPath;
    } catch (error) {
      logWarn("Failed to copy update to Downloads", error);
      return "";
    }
  };

  const broadcastUpdateStatus = (payload) => {
    BrowserWindow.getAllWindows().forEach((targetWindow) => {
      if (targetWindow?.isDestroyed()) {
        return;
      }

      targetWindow.webContents.send("updates:status", payload);
    });
  };

  const handleAutoUpdaterError = async (error) => {
    if (isMissingUpdateArtifactError(error)) {
      broadcastUpdateStatus({
        status: "none",
        message: "No published updates yet.",
      });
      return;
    }

    if (isUpdateSignatureError(error)) {
      let savedPath = copyUpdateToDownloads(resolveUpdateInstallerPath(error));

      if (!savedPath) {
        const version = lastUpdateInfo?.version;
        savedPath = await downloadInstallerToDownloads(version);
        if (savedPath) {
          logDebug("[Updater] downloaded installer to Downloads", savedPath);
        }
      }

      broadcastUpdateStatus({
        status: "error",
        code: "signature",
        downloadsReady: Boolean(savedPath),
        message: savedPath
          ? "Update couldn’t be verified. Installer saved to Downloads."
          : "Update couldn’t be verified. Please install the new version manually or enable code signing.",
      });
      return;
    }

    broadcastUpdateStatus({
      status: "error",
      message: error?.message || "Update check failed",
    });
  };

  const initAutoUpdater = () => {
    if (isAutoUpdaterInitialized) {
      return;
    }

    isAutoUpdaterInitialized = true;
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    autoUpdater.on("checking-for-update", () => {
      broadcastUpdateStatus({ status: "checking" });
    });

    autoUpdater.on("update-available", (info) => {
      logDebug(
        "[Updater] update-available",
        "app",
        app.getVersion(),
        "remote",
        info?.version,
      );
      lastUpdateInfo = info || null;
      const remoteVersion = info?.version;
      const currentVersion = app.getVersion();

      if (
        isSameAppVersion(remoteVersion, currentVersion) ||
        !isRemoteVersionNewer(remoteVersion, currentVersion)
      ) {
        logDebug("[Updater] remote version is not newer, ignoring update.");
        broadcastUpdateStatus({ status: "none" });
        return;
      }

      broadcastUpdateStatus({ status: "available", info });
    });

    autoUpdater.on("update-not-available", () => {
      logDebug("[Updater] update-not-available", "app", app.getVersion());
      broadcastUpdateStatus({ status: "none" });
    });

    autoUpdater.on("download-progress", (progress) => {
      broadcastUpdateStatus({
        status: "downloading",
        progress: {
          percent: Math.round(progress?.percent || 0),
          transferred: progress?.transferred,
          total: progress?.total,
        },
      });
    });

    autoUpdater.on("update-downloaded", (info) => {
      logDebug("[Updater] update-downloaded", "remote", info?.version);
      broadcastUpdateStatus({ status: "downloaded", info });
    });

    autoUpdater.on("error", (error) => {
      logDebug("[Updater] error", error?.message || error);
      void handleAutoUpdaterError(error);
    });
  };

  const configureAutoUpdater = () => {
    const preference = getUpdateChannel() || "stable";
    const channel = preference === "beta" ? "beta" : "latest";

    autoUpdater.channel = channel;
    autoUpdater.allowPrerelease = preference === "beta";
  };

  const checkForUpdates = async () => {
    if (!app.isPackaged) {
      return {
        status: "disabled",
        message: "Updates are available only in packaged builds.",
      };
    }

    initAutoUpdater();
    configureAutoUpdater();

    try {
      logDebug("[Updater] checkForUpdates start", "app", app.getVersion());
      const result = await autoUpdater.checkForUpdates();
      const hasUpdate = Boolean(result?.updateInfo?.version);
      const currentVersion = app.getVersion();
      const remoteVersion = result?.updateInfo?.version;
      logDebug(
        "[Updater] checkForUpdates result",
        "app",
        currentVersion,
        "remote",
        remoteVersion,
        "hasUpdate",
        hasUpdate,
      );
      lastUpdateInfo = result?.updateInfo || null;

      if (
        hasUpdate &&
        (isSameAppVersion(remoteVersion, currentVersion) ||
          !isRemoteVersionNewer(remoteVersion, currentVersion))
      ) {
        return {
          status: "none",
          info: result?.updateInfo || null,
        };
      }

      return {
        status: hasUpdate ? "available" : "none",
        info: result?.updateInfo || null,
      };
    } catch (error) {
      return {
        status: "error",
        message: error?.message || "Update check failed",
      };
    }
  };

  const downloadUpdate = async () => {
    if (!app.isPackaged) {
      return {
        status: "disabled",
        message: "Updates are available only in packaged builds.",
      };
    }

    initAutoUpdater();
    configureAutoUpdater();

    try {
      await autoUpdater.downloadUpdate();
      return { status: "downloading" };
    } catch (error) {
      return {
        status: "error",
        message: error?.message || "Failed to download update",
      };
    }
  };

  return {
    checkForUpdates,
    downloadUpdate,
    initAutoUpdater,
    configureAutoUpdater,
  };
};
