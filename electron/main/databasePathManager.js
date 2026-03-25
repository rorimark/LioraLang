export const createDatabasePathManager = ({
  fs,
  path,
  app,
  closeDatabaseConnection,
  getDatabase,
  getDatabasePath,
  initDatabaseConnection,
  initDb,
  writeStoredDbPath,
}) => {
  const moveFileSafely = (sourcePath, targetPath) => {
    if (!fs.existsSync(sourcePath)) {
      return false;
    }

    const targetDirectoryPath = path.dirname(targetPath);

    if (!fs.existsSync(targetDirectoryPath)) {
      fs.mkdirSync(targetDirectoryPath, { recursive: true });
    }

    try {
      fs.renameSync(sourcePath, targetPath);
    } catch (moveError) {
      if (moveError?.code !== "EXDEV") {
        throw moveError;
      }

      fs.copyFileSync(sourcePath, targetPath);
      fs.unlinkSync(sourcePath);
    }

    return true;
  };

  const moveDatabaseFiles = (sourceDbPath, targetDbPath) => {
    if (!sourceDbPath || !targetDbPath || sourceDbPath === targetDbPath) {
      return {
        moved: false,
        movedCount: 0,
      };
    }

    const fileSuffixes = ["", "-wal", "-shm"];
    const fileMappings = fileSuffixes
      .map((suffix) => ({
        sourcePath: `${sourceDbPath}${suffix}`,
        targetPath: `${targetDbPath}${suffix}`,
      }))
      .filter((mapping) => fs.existsSync(mapping.sourcePath));

    if (fileMappings.length === 0) {
      return {
        moved: false,
        movedCount: 0,
      };
    }

    const conflictingTarget = fileMappings.find((mapping) =>
      fs.existsSync(mapping.targetPath),
    );

    if (conflictingTarget) {
      throw new Error(
        `Target database file already exists: ${conflictingTarget.targetPath}`,
      );
    }

    const movedMappings = [];

    try {
      fileMappings.forEach(({ sourcePath, targetPath }) => {
        const moved = moveFileSafely(sourcePath, targetPath);

        if (moved) {
          movedMappings.push({ sourcePath, targetPath });
        }
      });
    } catch (moveError) {
      movedMappings.reverse().forEach(({ sourcePath, targetPath }) => {
        try {
          if (fs.existsSync(targetPath) && !fs.existsSync(sourcePath)) {
            moveFileSafely(targetPath, sourcePath);
          }
        } catch {
          // Rollback is best-effort here.
        }
      });

      throw moveError;
    }

    return {
      moved: true,
      movedCount: fileMappings.length,
    };
  };

  const changeDatabasePath = (targetDbPath) => {
    if (typeof targetDbPath !== "string" || !targetDbPath.trim()) {
      throw new Error("Invalid database path");
    }

    const normalizedTargetDbPath = path.resolve(targetDbPath.trim());
    const currentDbPath = getDatabasePath();

    if (currentDbPath && path.resolve(currentDbPath) === normalizedTargetDbPath) {
      return {
        dbPath: normalizedTargetDbPath,
        migrated: false,
      };
    }

    const dbFileExtension = path.extname(normalizedTargetDbPath).toLowerCase();

    if (dbFileExtension !== ".db") {
      throw new Error("Database file must have .db extension");
    }

    try {
      const db = getDatabase();
      db.pragma("wal_checkpoint(TRUNCATE)");
    } catch {
      // Connection may be unavailable during startup or previous recovery steps.
    }

    closeDatabaseConnection();

    try {
      const moveResult = moveDatabaseFiles(currentDbPath, normalizedTargetDbPath);
      initDatabaseConnection(normalizedTargetDbPath);
      initDb();
      writeStoredDbPath(app.getPath("userData"), normalizedTargetDbPath);

      return {
        dbPath: normalizedTargetDbPath,
        migrated: moveResult.moved,
      };
    } catch (changeError) {
      if (currentDbPath) {
        try {
          initDatabaseConnection(currentDbPath);
          initDb();
        } catch {
          // Failed to restore original connection; propagate original error.
        }
      }

      throw changeError;
    }
  };

  return {
    changeDatabasePath,
  };
};
