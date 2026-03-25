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

const toSingleLine = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
};

const quoteText = (value) => {
  const normalizedValue = toSingleLine(value);

  if (!normalizedValue) {
    return "";
  }

  return `"${normalizedValue}"`;
};

const formatHotkey = (payload) => {
  const segments = [];

  if (payload?.meta) {
    segments.push("Cmd");
  }

  if (payload?.ctrl) {
    segments.push("Ctrl");
  }

  if (payload?.alt) {
    segments.push("Alt");
  }

  if (payload?.shift) {
    segments.push("Shift");
  }

  const keyLabel = toSingleLine(payload?.key || payload?.code || "");

  if (keyLabel) {
    if (keyLabel === " ") {
      segments.push("Space");
    } else if (keyLabel.length === 1) {
      segments.push(keyLabel.toUpperCase());
    } else {
      segments.push(keyLabel);
    }
  }

  return segments.join("+");
};

const summarizeLearnProgressValue = (value) => {
  if (!value || typeof value !== "object") {
    return "";
  }

  const segments = [];

  if (value.selectedDeckId) {
    segments.push(`deck=${value.selectedDeckId}`);
  }

  if (value.viewMode) {
    segments.push(`mode=${value.viewMode}`);
  }

  segments.push(`back=${value.isBackVisible ? "shown" : "hidden"}`);

  const srsCount = Object.keys(value.lastSrsCardWordIdByDeck || {}).length;
  const browseCount = Object.keys(value.lastBrowseWordIdByDeck || {}).length;

  if (srsCount > 0) {
    segments.push(`srs=${srsCount}`);
  }

  if (browseCount > 0) {
    segments.push(`browse=${browseCount}`);
  }

  return segments.join(" ");
};

const summarizePayload = (event, payload) => {
  if (payload === undefined || payload === null) {
    return "";
  }

  if (typeof payload !== "object") {
    return toSingleLine(String(payload));
  }

  switch (event) {
    case "ui.click":
    case "ui.submit":
    case "ui.change": {
      const targetText =
        quoteText(payload.text) ||
        quoteText(payload.ariaLabel) ||
        quoteText(payload.title) ||
        (payload.name ? `name=${payload.name}` : "") ||
        (payload.id ? `#${payload.id}` : "");
      const tag = toSingleLine(payload.tag || "unknown");
      const type = toSingleLine(payload.type);
      const value =
        event === "ui.change" && payload.value
          ? ` value=${quoteText(payload.value) || payload.value}`
          : "";
      const path = payload.path ? ` @ ${payload.path}` : "";

      return `${tag}${type ? `(${type})` : ""}${targetText ? ` ${targetText}` : ""}${value}${path}`.trim();
    }
    case "ui.keydown": {
      const hotkey = formatHotkey(payload);
      return `${hotkey || "key"}${payload.path ? ` @ ${payload.path}` : ""}`;
    }
    case "nav.pushState":
    case "nav.replaceState": {
      return `${payload.to || ""}${payload.path ? ` from ${payload.path}` : ""}`.trim();
    }
    case "nav.popState": {
      return payload.path ? `to ${payload.path}` : "";
    }
    case "app.visibility": {
      return `${payload.state || ""}${payload.path ? ` @ ${payload.path}` : ""}`.trim();
    }
    case "learn.session.read":
    case "learn.session.write": {
      const summary = summarizeLearnProgressValue(payload.value);
      return `${payload.key || ""}${summary ? ` ${summary}` : ""}${payload.source ? ` source=${payload.source}` : ""}`.trim();
    }
    case "learn.browse.read":
    case "learn.browse.write": {
      const count = Object.keys(payload.value || {}).length;
      return `${payload.key || ""} decks=${count}`.trim();
    }
    case "deck.words.load.start": {
      return payload.deckId ? `deck=${payload.deckId}` : "";
    }
    case "deck.words.load.success": {
      const segments = [];
      if (payload.deckId) {
        segments.push(`deck=${payload.deckId}`);
      }
      if (Number.isFinite(Number(payload.count))) {
        segments.push(`count=${Number(payload.count)}`);
      }
      return segments.join(" ");
    }
    default: {
      const preferredKeys = [
        "path",
        "to",
        "state",
        "deckId",
        "count",
        "key",
        "value",
      ];

      const parts = preferredKeys
        .filter((key) => key in payload)
        .map((key) => {
          if (key === "value" && typeof payload[key] === "object") {
            return "";
          }

          return `${key}=${toSingleLine(String(payload[key]))}`;
        })
        .filter(Boolean);

      return parts.join(" ");
    }
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
  const summary = summarizePayload(entry.event, entry.payload);
  const stylePrefix = "color:#6ea8ff;font-weight:600;";
  const styleTime = "color:#8a92a6;";
  const styleEvent = "color:#e5e9f2;font-weight:600;";
  const styleSummary = "color:#c5cfdd;";
  const styleLevel =
    entry.level === "error"
      ? "color:#ff6b6b;font-weight:700;"
      : entry.level === "warn"
        ? "color:#f6b26b;font-weight:700;"
        : "color:#9aa4b2;font-weight:700;";

  const header = summary
    ? `%cLioraLang%c ${time} %c${eventLabel} %c${entry.level}%c ${summary}`
    : `%cLioraLang%c ${time} %c${eventLabel} %c${entry.level}`;
  const styles = summary
    ? [stylePrefix, styleTime, styleEvent, styleLevel, styleSummary]
    : [stylePrefix, styleTime, styleEvent, styleLevel];
  const printMethod =
    entry.level === "error"
      ? console.error
      : entry.level === "warn"
        ? console.warn
        : console.info;

  if (entry.payload === undefined) {
    printMethod(header, ...styles);
    return;
  }

  printMethod(header, ...styles, entry.payload);
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
