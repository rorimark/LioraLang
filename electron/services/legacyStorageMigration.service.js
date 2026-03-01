import fs from "node:fs";
import path from "node:path";
import { readStoredDbPath, writeStoredDbPath } from "./dbPath.service.js";

const LEGACY_USER_DATA_DIR_NAMES = [
  "app",
  "App",
  "liora-lang",
  "lioralang",
  "LioraLang",
];

const DB_SIDE_CAR_SUFFIXES = ["", "-wal", "-shm"];

const toResolvedPath = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "";
  }

  return path.resolve(value.trim());
};

const isExistingFile = (filePath) => {
  if (!filePath || !fs.existsSync(filePath)) {
    return false;
  }

  try {
    return fs.statSync(filePath).isFile();
  } catch {
    return false;
  }
};

const resolveDefaultDbPath = (userDataPath, dbFileName) => {
  return path.join(userDataPath, "data", dbFileName);
};

const resolveDbPathForUserDataPath = (userDataPath, dbFileName) => {
  const storedDbPath = readStoredDbPath(userDataPath);

  if (isExistingFile(storedDbPath)) {
    return toResolvedPath(storedDbPath);
  }

  const defaultDbPath = resolveDefaultDbPath(userDataPath, dbFileName);

  if (isExistingFile(defaultDbPath)) {
    return toResolvedPath(defaultDbPath);
  }

  return "";
};

const listLegacyUserDataCandidates = (appDataPath, currentUserDataPath) => {
  const resolvedCurrentUserDataPath = toResolvedPath(currentUserDataPath);
  const candidates = [];
  const seen = new Set();

  LEGACY_USER_DATA_DIR_NAMES.forEach((folderName) => {
    const candidatePath = toResolvedPath(path.join(appDataPath, folderName));

    if (!candidatePath || candidatePath === resolvedCurrentUserDataPath) {
      return;
    }

    if (seen.has(candidatePath)) {
      return;
    }

    seen.add(candidatePath);
    candidates.push(candidatePath);
  });

  return candidates;
};

const copyFileIfExists = (sourcePath, targetPath) => {
  if (!isExistingFile(sourcePath)) {
    return false;
  }

  const targetDirPath = path.dirname(targetPath);

  if (!fs.existsSync(targetDirPath)) {
    fs.mkdirSync(targetDirPath, { recursive: true });
  }

  fs.copyFileSync(sourcePath, targetPath);
  return true;
};

const copyDatabaseFiles = (sourceDbPath, targetDbPath) => {
  let copiedAtLeastOne = false;

  DB_SIDE_CAR_SUFFIXES.forEach((suffix) => {
    const sourcePath = `${sourceDbPath}${suffix}`;
    const targetPath = `${targetDbPath}${suffix}`;
    const copied = copyFileIfExists(sourcePath, targetPath);

    if (copied) {
      copiedAtLeastOne = true;
    }
  });

  return copiedAtLeastOne;
};

const persistDbPathForCurrentUserData = (userDataPath, dbPath) => {
  if (!dbPath) {
    return false;
  }

  try {
    writeStoredDbPath(userDataPath, dbPath);
    return true;
  } catch {
    return false;
  }
};

export const migrateLegacyDbStorage = ({
  appDataPath,
  currentUserDataPath,
  dbFileName,
}) => {
  const resolvedAppDataPath = toResolvedPath(appDataPath);
  const resolvedCurrentUserDataPath = toResolvedPath(currentUserDataPath);
  const normalizedDbFileName =
    typeof dbFileName === "string" && dbFileName.trim()
      ? dbFileName.trim()
      : "lioralang.db";

  if (!resolvedAppDataPath || !resolvedCurrentUserDataPath) {
    return {
      migrated: false,
      dbPath: "",
      sourceDbPath: "",
      reason: "invalid-paths",
    };
  }

  const currentDbPath = resolveDbPathForUserDataPath(
    resolvedCurrentUserDataPath,
    normalizedDbFileName,
  );

  if (currentDbPath) {
    persistDbPathForCurrentUserData(resolvedCurrentUserDataPath, currentDbPath);

    return {
      migrated: false,
      dbPath: currentDbPath,
      sourceDbPath: "",
      reason: "current-data-present",
    };
  }

  const legacyCandidates = listLegacyUserDataCandidates(
    resolvedAppDataPath,
    resolvedCurrentUserDataPath,
  );
  const foundLegacyDbPath = legacyCandidates
    .map((candidatePath) =>
      resolveDbPathForUserDataPath(candidatePath, normalizedDbFileName),
    )
    .find(Boolean);

  if (!foundLegacyDbPath) {
    return {
      migrated: false,
      dbPath: "",
      sourceDbPath: "",
      reason: "legacy-data-not-found",
    };
  }

  const targetDbPath = resolveDefaultDbPath(
    resolvedCurrentUserDataPath,
    normalizedDbFileName,
  );

  try {
    copyDatabaseFiles(foundLegacyDbPath, targetDbPath);
  } catch {
    const persistedLegacyPath = persistDbPathForCurrentUserData(
      resolvedCurrentUserDataPath,
      foundLegacyDbPath,
    );

    return {
      migrated: false,
      dbPath: persistedLegacyPath ? foundLegacyDbPath : "",
      sourceDbPath: foundLegacyDbPath,
      reason: persistedLegacyPath
        ? "legacy-path-linked"
        : "legacy-path-link-failed",
    };
  }

  const linkedToTarget = persistDbPathForCurrentUserData(
    resolvedCurrentUserDataPath,
    targetDbPath,
  );

  return {
    migrated: linkedToTarget && isExistingFile(targetDbPath),
    dbPath: linkedToTarget ? targetDbPath : "",
    sourceDbPath: foundLegacyDbPath,
    reason: linkedToTarget ? "legacy-data-copied" : "target-path-link-failed",
  };
};
