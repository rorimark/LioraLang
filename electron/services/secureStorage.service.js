import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";

const AUTH_STORAGE_DIRECTORY = "auth";
const AUTH_STORAGE_FILE_NAME = "secure-store.json";

const memoryFallbackStore = new Map();

const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const ensureDirectory = (directoryPath) => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

const readJsonFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeJsonFile = (filePath, value) => {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf8");
};

export const createSecureStorageService = ({ app, safeStorage }) => {
  const resolveStorageFilePath = () => {
    const userDataPath = app.getPath("userData");
    const directoryPath = path.join(userDataPath, AUTH_STORAGE_DIRECTORY);
    ensureDirectory(directoryPath);
    return path.join(directoryPath, AUTH_STORAGE_FILE_NAME);
  };

  const isEncryptionAvailable = () => {
    return typeof safeStorage?.isEncryptionAvailable === "function"
      ? safeStorage.isEncryptionAvailable()
      : false;
  };

  const readStore = () => {
    return readJsonFile(resolveStorageFilePath());
  };

  const writeStore = (value) => {
    writeJsonFile(resolveStorageFilePath(), value);
  };

  const encodeValue = (plainText) => {
    if (!isEncryptionAvailable()) {
      return {
        mode: "plain",
        value: plainText,
      };
    }

    return {
      mode: "encrypted",
      value: safeStorage.encryptString(plainText).toString("base64"),
    };
  };

  const decodeValue = (record) => {
    if (!record || typeof record !== "object") {
      return "";
    }

    if (record.mode === "encrypted") {
      try {
        return safeStorage.decryptString(Buffer.from(record.value || "", "base64"));
      } catch {
        return "";
      }
    }

    return typeof record.value === "string" ? record.value : "";
  };

  return {
    getItem(key) {
      const normalizedKey = toCleanString(key);

      if (!normalizedKey) {
        return null;
      }

      if (memoryFallbackStore.has(normalizedKey)) {
        return memoryFallbackStore.get(normalizedKey) ?? null;
      }

      const store = readStore();
      const value = decodeValue(store[normalizedKey]);
      return value || null;
    },
    setItem(key, value) {
      const normalizedKey = toCleanString(key);

      if (!normalizedKey) {
        return false;
      }

      const normalizedValue = typeof value === "string" ? value : JSON.stringify(value ?? null);
      memoryFallbackStore.set(normalizedKey, normalizedValue);

      const store = readStore();
      store[normalizedKey] = encodeValue(normalizedValue);
      writeStore(store);

      return isEncryptionAvailable();
    },
    removeItem(key) {
      const normalizedKey = toCleanString(key);

      if (!normalizedKey) {
        return false;
      }

      memoryFallbackStore.delete(normalizedKey);

      const store = readStore();
      delete store[normalizedKey];
      writeStore(store);

      return true;
    },
    isEncryptionAvailable() {
      return isEncryptionAvailable();
    },
  };
};
