const DEFAULT_MAX_ENTRIES = 500;
const LEVELS = ["error", "warn", "info", "debug"];

const state = {
  enabled: false,
  level: "debug",
  maxEntries: DEFAULT_MAX_ENTRIES,
  entries: [],
};

const getLevelRank = (level) => LEVELS.indexOf(level);

const shouldLog = (level) => {
  if (!state.enabled) {
    return false;
  }

  const levelRank = getLevelRank(level);
  const currentRank = getLevelRank(state.level);

  if (levelRank === -1 || currentRank === -1) {
    return false;
  }

  return levelRank <= currentRank;
};

const truncateValue = (value, limit = 200) => {
  if (typeof value !== "string") {
    return value;
  }

  if (value.length <= limit) {
    return value;
  }

  return `${value.slice(0, limit)}…`;
};

const formatTime = (date) => {
  const pad = (value, size = 2) => String(value).padStart(size, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds(),
  )}.${pad(date.getMilliseconds(), 3)}`;
};

const pushEntry = (entry) => {
  state.entries.push(entry);
  if (state.entries.length > state.maxEntries) {
    state.entries.splice(0, state.entries.length - state.maxEntries);
  }
};

const toSafePayload = (payload) => {
  if (payload && typeof payload === "object") {
    return Object.entries(payload).reduce((acc, [key, value]) => {
      acc[key] = truncateValue(value);
      return acc;
    }, {});
  }

  return truncateValue(payload);
};

const printEntry = (entry) => {
  const time = formatTime(entry.timestamp);
  const eventLabel = entry.event || "event";
  const stylePrefix = "color:#6ea8ff;font-weight:600;";
  const styleTime = "color:#8a92a6;";
  const styleEvent = "color:#e5e9f2;font-weight:600;";
  const styleLevel =
    entry.level === "error"
      ? "color:#ff6b6b;font-weight:700;"
      : entry.level === "warn"
        ? "color:#f6b26b;font-weight:700;"
        : "color:#9aa4b2;font-weight:700;";

  const header = `%cLioraLang%c ${time} %c${eventLabel} %c${entry.level}`;
  const styles = [stylePrefix, styleTime, styleEvent, styleLevel];

  if (entry.payload === undefined) {
    console.info(header, ...styles);
    return;
  }

  console.groupCollapsed(header, ...styles);
  console.info(entry.payload);
  console.groupEnd();
};

export const setDebugEnabled = (value) => {
  state.enabled = Boolean(value);
  if (typeof window !== "undefined") {
    window.__LIORA_DEBUG_ENABLED__ = state.enabled;
  }
};

export const setDebugLevel = (level) => {
  if (!LEVELS.includes(level)) {
    return;
  }

  state.level = level;
};

export const setDebugMaxEntries = (value) => {
  const next = Number(value);
  if (!Number.isFinite(next) || next <= 0) {
    return;
  }

  state.maxEntries = Math.round(next);
  if (state.entries.length > state.maxEntries) {
    state.entries.splice(0, state.entries.length - state.maxEntries);
  }
};

export const clearDebugLog = () => {
  state.entries = [];
  console.clear();
  console.info("%cLioraLang", "color:#6ea8ff;font-weight:700;", "log cleared");
};

export const getDebugEntries = () => state.entries.slice();

export const debugLog = (event, payload, level = "debug") => {
  if (!shouldLog(level)) {
    return;
  }

  const entry = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date(),
    event,
    level,
    payload,
  };

  pushEntry(entry);
  printEntry(entry);
};

export const debugLogData = (event, payload, level = "debug") => {
  if (!shouldLog(level)) {
    return;
  }

  debugLog(event, toSafePayload(payload), level);
};

// Debug controls intentionally removed: logging is managed via settings only.
