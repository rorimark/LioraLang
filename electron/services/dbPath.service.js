import fs from "node:fs";
import path from "node:path";

const DB_PATH_CONFIG_RELATIVE_PATH = path.join("settings", "storage.json");

const isValidDbFilePath = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return false;
  }

  if (!path.isAbsolute(trimmedValue)) {
    return false;
  }

  return path.extname(trimmedValue).toLowerCase() === ".db";
};

const getConfigFilePath = (userDataPath) => {
  return path.join(userDataPath, DB_PATH_CONFIG_RELATIVE_PATH);
};

const readConfig = (userDataPath) => {
  const configFilePath = getConfigFilePath(userDataPath);

  if (!fs.existsSync(configFilePath)) {
    return {};
  }

  try {
    const content = fs.readFileSync(configFilePath, "utf8");
    const parsed = JSON.parse(content);

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    return parsed;
  } catch {
    return {};
  }
};

export const readStoredDbPath = (userDataPath) => {
  const config = readConfig(userDataPath);
  const storedDbPath = config.dbPath;

  if (!isValidDbFilePath(storedDbPath)) {
    return "";
  }

  return storedDbPath.trim();
};

export const writeStoredDbPath = (userDataPath, dbPath) => {
  if (!isValidDbFilePath(dbPath)) {
    throw new Error("Invalid database path");
  }

  const configFilePath = getConfigFilePath(userDataPath);
  const configDirPath = path.dirname(configFilePath);

  if (!fs.existsSync(configDirPath)) {
    fs.mkdirSync(configDirPath, { recursive: true });
  }

  const nextConfig = {
    ...readConfig(userDataPath),
    dbPath: dbPath.trim(),
  };

  fs.writeFileSync(configFilePath, JSON.stringify(nextConfig, null, 2), "utf8");
};

