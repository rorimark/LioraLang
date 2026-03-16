export const LEARN_PROGRESS_SETTINGS_KEY = "learnProgress";
export const LEARN_PROGRESS_SESSION_KEY = "learnProgressSession";

export const DEFAULT_LEARN_PROGRESS = {
  selectedDeckId: "",
  isBackVisible: false,
  viewMode: "srs",
  lastCardWordIdByDeck: {},
};

const normalizeLastCardWordIdByDeck = (value) => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value).reduce((acc, [deckId, wordId]) => {
    const normalizedDeckId = String(deckId || "");
    const normalizedWordId = Number(wordId);

    if (!normalizedDeckId) {
      return acc;
    }

    if (!Number.isInteger(normalizedWordId) || normalizedWordId <= 0) {
      return acc;
    }

    acc[normalizedDeckId] = normalizedWordId;
    return acc;
  }, {});
};

export const normalizeLearnProgress = (value) => {
  const viewMode =
    value?.viewMode === "browse" || value?.viewMode === "srs"
      ? value.viewMode
      : DEFAULT_LEARN_PROGRESS.viewMode;

  return {
    selectedDeckId:
      typeof value?.selectedDeckId === "string" ? value.selectedDeckId : "",
    isBackVisible: Boolean(value?.isBackVisible),
    viewMode,
    lastCardWordIdByDeck: normalizeLastCardWordIdByDeck(
      value?.lastCardWordIdByDeck,
    ),
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
      leftValue.lastCardWordIdByDeck,
      rightValue.lastCardWordIdByDeck,
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

export const readLearnProgressFromSession = () => {
  if (typeof window === "undefined") {
    return DEFAULT_LEARN_PROGRESS;
  }

  try {
    const raw = window.sessionStorage.getItem(LEARN_PROGRESS_SESSION_KEY);
    if (!raw) {
      return DEFAULT_LEARN_PROGRESS;
    }

    return normalizeLearnProgress(JSON.parse(raw));
  } catch {
    return DEFAULT_LEARN_PROGRESS;
  }
};

export const writeLearnProgressToSession = (value) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      LEARN_PROGRESS_SESSION_KEY,
      JSON.stringify(normalizeLearnProgress(value)),
    );
  } catch {
    // ignore storage failures
  }
};
