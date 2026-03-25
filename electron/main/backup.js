const BACKUP_INTERVAL_MS = {
  off: 0,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export const createBackupManager = ({
  fs,
  path,
  getDatabasePath,
  getDatabase,
  getBackupSettings,
  trackAnalyticsEvent,
  reportRuntimeError,
}) => {
  let backupTimerId = null;
  let isBackupInFlight = false;
  let backupScheduleSignature = "";

  const clearBackupSchedule = () => {
    if (backupTimerId !== null) {
      clearInterval(backupTimerId);
      backupTimerId = null;
    }

    backupScheduleSignature = "";
  };

  const getBackupDirectoryPath = (dbPath) => {
    return path.join(path.dirname(dbPath), "backups");
  };

  const backupFilePrefix = (dbPath) => {
    return `${path.basename(dbPath, path.extname(dbPath))}.backup-`;
  };

  const createBackupTimestamp = () => {
    return new Date()
      .toISOString()
      .replaceAll("-", "")
      .replaceAll(":", "")
      .replaceAll(".", "");
  };

  const listBackupFiles = (dbPath) => {
    const backupDirectory = getBackupDirectoryPath(dbPath);

    if (!fs.existsSync(backupDirectory)) {
      return [];
    }

    const prefix = backupFilePrefix(dbPath);

    return fs
      .readdirSync(backupDirectory)
      .filter((fileName) => fileName.startsWith(prefix) && fileName.endsWith(".db"))
      .sort((left, right) => left.localeCompare(right))
      .map((fileName) => path.join(backupDirectory, fileName));
  };

  const pruneOldBackups = (dbPath, maxBackups) => {
    const safeMaxBackups = Math.max(1, Number(maxBackups) || 1);
    const backupFiles = listBackupFiles(dbPath);

    if (backupFiles.length <= safeMaxBackups) {
      return;
    }

    const filesToDelete = backupFiles.slice(0, backupFiles.length - safeMaxBackups);

    filesToDelete.forEach((filePath) => {
      try {
        fs.unlinkSync(filePath);
      } catch {
        // Keep backup cleanup best-effort.
      }
    });
  };

  const createDatabaseBackupSnapshot = (maxBackups) => {
    const dbPath = getDatabasePath();

    if (!dbPath || !fs.existsSync(dbPath)) {
      return null;
    }

    const backupDirectory = getBackupDirectoryPath(dbPath);
    const backupPath = path.join(
      backupDirectory,
      `${backupFilePrefix(dbPath)}${createBackupTimestamp()}.db`,
    );

    try {
      const db = getDatabase();
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      // checkpoint is best-effort only
    }

    fs.mkdirSync(backupDirectory, { recursive: true });
    fs.copyFileSync(dbPath, backupPath);
    pruneOldBackups(dbPath, maxBackups);

    return backupPath;
  };

  const runScheduledBackup = () => {
    if (isBackupInFlight) {
      return;
    }

    isBackupInFlight = true;

    try {
      const backupSettings = getBackupSettings();
      const backupPath = createDatabaseBackupSnapshot(backupSettings.maxBackups);

      if (backupPath) {
        trackAnalyticsEvent("database.backup.created", {
          backupPath,
        });
      }
    } catch (error) {
      reportRuntimeError(error, "backup");
    } finally {
      isBackupInFlight = false;
    }
  };

  const syncBackupSchedule = () => {
    const backupSettings = getBackupSettings();
    const intervalKey = backupSettings.autoBackupInterval;
    const intervalMs = BACKUP_INTERVAL_MS[intervalKey] || 0;
    const dbPath = getDatabasePath() || "";
    const nextSignature = [
      intervalKey,
      String(backupSettings.maxBackups),
      dbPath,
    ].join("|");

    if (backupTimerId !== null && backupScheduleSignature === nextSignature) {
      return;
    }

    clearBackupSchedule();
    backupScheduleSignature = nextSignature;

    if (intervalMs <= 0) {
      return;
    }

    backupTimerId = setInterval(() => {
      runScheduledBackup();
    }, intervalMs);

    if (typeof backupTimerId?.unref === "function") {
      backupTimerId.unref();
    }

    const hasBackups = (() => {
      try {
        const currentDbPath = getDatabasePath();
        if (!currentDbPath) {
          return false;
        }
        return listBackupFiles(currentDbPath).length > 0;
      } catch {
        return false;
      }
    })();

    if (!hasBackups) {
      runScheduledBackup();
    }
  };

  return {
    clearBackupSchedule,
    syncBackupSchedule,
  };
};
