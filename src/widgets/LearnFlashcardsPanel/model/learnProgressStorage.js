export const LEARN_PROGRESS_SETTINGS_KEY = "learnProgress";

export const DEFAULT_LEARN_PROGRESS = {
  selectedDeckId: "",
  isBackVisible: false,
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
  return {
    selectedDeckId:
      typeof value?.selectedDeckId === "string" ? value.selectedDeckId : "",
    isBackVisible: Boolean(value?.isBackVisible),
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
