import { getDatabase } from "../db.js";

const toSettingKey = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const parseSettingValue = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const toSerializableSettingValue = (value) => {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify(null);
  }
};

export const getAppSettings = () => {
  const db = getDatabase();
  const rows = db
    .prepare(
      `
        SELECT key, value
        FROM app_settings
      `,
    )
    .all();

  return rows.reduce((acc, row) => {
    const key = toSettingKey(row?.key);

    if (!key) {
      return acc;
    }

    acc[key] = parseSettingValue(row?.value);
    return acc;
  }, {});
};

export const updateAppSettings = (nextSettings = {}) => {
  if (!nextSettings || typeof nextSettings !== "object" || Array.isArray(nextSettings)) {
    return getAppSettings();
  }

  const db = getDatabase();
  const entries = Object.entries(nextSettings).filter(([key]) => toSettingKey(key));

  if (entries.length === 0) {
    return getAppSettings();
  }

  const upsertStatement = db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = CURRENT_TIMESTAMP
  `);

  const applyTransaction = db.transaction((items) => {
    items.forEach(([rawKey, rawValue]) => {
      upsertStatement.run(
        toSettingKey(rawKey),
        toSerializableSettingValue(rawValue),
      );
    });
  });

  applyTransaction(entries);

  return getAppSettings();
};
