import { debugLogData } from "@shared/lib/debug";

export const LEARN_PROGRESS_SETTINGS_KEY = "learnProgress";
export const LEARN_PROGRESS_SESSION_KEY = "learnProgressSession";
export const LEARN_PROGRESS_LOCAL_KEY = "learnProgressLocal";
export const LEARN_BROWSE_PROGRESS_KEY = "learnBrowseProgress";

export const DEFAULT_LEARN_PROGRESS = {
  selectedDeckId: "",
  isBackVisible: false,
  viewMode: "srs",
  lastSrsCardWordIdByDeck: {},
  lastBrowseWordIdByDeck: {},
};

const isStoredViewMode = (value) => value === "browse" || value === "srs";

const resolveNormalizedViewMode = (
  value,
  fallbackViewMode = DEFAULT_LEARN_PROGRESS.viewMode,
) => {
  if (isStoredViewMode(value)) {
    return value;
  }

  return isStoredViewMode(fallbackViewMode)
    ? fallbackViewMode
    : DEFAULT_LEARN_PROGRESS.viewMode;
};

const normalizeWordId = (wordId) => {
  if (typeof wordId === "string") {
    const normalized = wordId.trim();
    return normalized ? normalized : null;
  }

  if (typeof wordId === "number" && Number.isFinite(wordId) && wordId > 0) {
    return String(wordId);
  }

  return null;
};

const normalizeLastCardWordIdByDeck = (value) => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value).reduce((acc, [deckId, wordId]) => {
    const normalizedDeckId = String(deckId || "");
    const normalizedWordId = normalizeWordId(wordId);

    if (!normalizedDeckId) {
      return acc;
    }

    if (!normalizedWordId) {
      return acc;
    }

    acc[normalizedDeckId] = normalizedWordId;
    return acc;
  }, {});
};

const readStoredLearnProgressPayload = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(LEARN_PROGRESS_SESSION_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore storage failures
  }

  try {
    const raw = window.localStorage.getItem(LEARN_PROGRESS_LOCAL_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore storage failures
  }

  return null;
};

export const normalizeLearnProgress = (
  value,
  fallbackViewMode = DEFAULT_LEARN_PROGRESS.viewMode,
) => {
  const viewMode = resolveNormalizedViewMode(
    value?.viewMode,
    fallbackViewMode,
  );

  const legacyMap = normalizeLastCardWordIdByDeck(
    value?.lastCardWordIdByDeck,
  );
  const lastSrsCardWordIdByDeck = normalizeLastCardWordIdByDeck(
    value?.lastSrsCardWordIdByDeck,
  );
  const lastBrowseWordIdByDeck = normalizeLastCardWordIdByDeck(
    value?.lastBrowseWordIdByDeck,
  );

  return {
    selectedDeckId:
      typeof value?.selectedDeckId === "string" ? value.selectedDeckId : "",
    isBackVisible: Boolean(value?.isBackVisible),
    viewMode,
    lastSrsCardWordIdByDeck:
      Object.keys(lastSrsCardWordIdByDeck).length > 0
        ? lastSrsCardWordIdByDeck
        : legacyMap,
    lastBrowseWordIdByDeck:
      Object.keys(lastBrowseWordIdByDeck).length > 0
        ? lastBrowseWordIdByDeck
        : legacyMap,
  };
};

const areWordIdMapsEqual = (left, right) => {
  const leftEntries = Object.entries(left || {});
  const rightEntries = Object.entries(right || {});

  if (leftEntries.length !== rightEntries.length) {
    return false;
  }

  return leftEntries.every(([deckId, wordId]) => right?.[deckId] === wordId);
};

export const areLearnProgressEqual = (left, right) => {
  const leftValue = normalizeLearnProgress(left);
  const rightValue = normalizeLearnProgress(right);

  return (
    leftValue.selectedDeckId === rightValue.selectedDeckId &&
    leftValue.isBackVisible === rightValue.isBackVisible &&
    leftValue.viewMode === rightValue.viewMode &&
    areWordIdMapsEqual(
      leftValue.lastSrsCardWordIdByDeck,
      rightValue.lastSrsCardWordIdByDeck,
    ) &&
    areWordIdMapsEqual(
      leftValue.lastBrowseWordIdByDeck,
      rightValue.lastBrowseWordIdByDeck,
    )
  );
};

export const readLearnProgressFromSettings = (settings) => {
  return normalizeLearnProgress(settings?.[LEARN_PROGRESS_SETTINGS_KEY]);
};

export const createLearnProgressSettingsPatch = (value) => {
  return {
    [LEARN_PROGRESS_SETTINGS_KEY]: normalizeLearnProgress(value),
  };
};

export const hasStoredLearnProgressViewMode = () => {
  const payload = readStoredLearnProgressPayload();
  return isStoredViewMode(payload?.viewMode);
};

export const readLearnProgressFromSession = (
  fallbackViewMode = DEFAULT_LEARN_PROGRESS.viewMode,
) => {
  const payload = readStoredLearnProgressPayload();

  if (!payload) {
    return {
      ...DEFAULT_LEARN_PROGRESS,
      viewMode: resolveNormalizedViewMode(undefined, fallbackViewMode),
    };
  }

  const storageKey =
    typeof window !== "undefined" &&
    window.sessionStorage.getItem(LEARN_PROGRESS_SESSION_KEY)
      ? LEARN_PROGRESS_SESSION_KEY
      : LEARN_PROGRESS_LOCAL_KEY;
  const parsed = normalizeLearnProgress(payload, fallbackViewMode);

  debugLogData("learn.session.read", {
    key: storageKey,
    source: storageKey === LEARN_PROGRESS_SESSION_KEY ? "session" : "local",
    value: parsed,
  });

  return parsed;
};

export const writeLearnProgressToSession = (value) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const normalized = normalizeLearnProgress(value);
    window.sessionStorage.setItem(
      LEARN_PROGRESS_SESSION_KEY,
      JSON.stringify(normalized),
    );
    window.localStorage.setItem(
      LEARN_PROGRESS_LOCAL_KEY,
      JSON.stringify(normalized),
    );
    debugLogData("learn.session.write", {
      key: LEARN_PROGRESS_SESSION_KEY,
      value: normalized,
    });
  } catch {
    // ignore storage failures
  }
};

export const readBrowseProgressFromStorage = () => {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(LEARN_BROWSE_PROGRESS_KEY);
    if (!raw) {
      return {};
    }

    const parsed = normalizeLastCardWordIdByDeck(JSON.parse(raw));
    debugLogData("learn.browse.read", {
      key: LEARN_BROWSE_PROGRESS_KEY,
      value: parsed,
    });
    return parsed;
  } catch {
    return {};
  }
};

export const writeBrowseProgressToStorage = (value) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      LEARN_BROWSE_PROGRESS_KEY,
      JSON.stringify(normalizeLastCardWordIdByDeck(value)),
    );
    debugLogData("learn.browse.write", {
      key: LEARN_BROWSE_PROGRESS_KEY,
      value: normalizeLastCardWordIdByDeck(value),
    });
  } catch {
    // ignore storage failures
  }
};
