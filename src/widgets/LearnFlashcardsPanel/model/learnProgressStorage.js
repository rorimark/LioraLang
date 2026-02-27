const LEARN_PROGRESS_STORAGE_KEY = "lioralang-learn-progress-v1";

const DEFAULT_LEARN_PROGRESS = {
  selectedDeckId: "",
  isBackVisible: false,
  indexByDeckId: {},
};

const isBrowser = typeof window !== "undefined";

const normalizeIndexByDeckId = (value) => {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.entries(value).reduce((acc, [deckId, index]) => {
    const normalizedDeckId = String(deckId || "");
    const normalizedIndex = Number(index);

    if (!normalizedDeckId) {
      return acc;
    }

    if (!Number.isFinite(normalizedIndex) || normalizedIndex < 0) {
      return acc;
    }

    acc[normalizedDeckId] = Math.floor(normalizedIndex);
    return acc;
  }, {});
};

export const readLearnProgress = () => {
  if (!isBrowser) {
    return DEFAULT_LEARN_PROGRESS;
  }

  try {
    const rawValue = window.localStorage.getItem(LEARN_PROGRESS_STORAGE_KEY);

    if (!rawValue) {
      return DEFAULT_LEARN_PROGRESS;
    }

    const parsedValue = JSON.parse(rawValue);

    return {
      selectedDeckId:
        typeof parsedValue?.selectedDeckId === "string"
          ? parsedValue.selectedDeckId
          : "",
      isBackVisible: Boolean(parsedValue?.isBackVisible),
      indexByDeckId: normalizeIndexByDeckId(parsedValue?.indexByDeckId),
    };
  } catch {
    return DEFAULT_LEARN_PROGRESS;
  }
};

export const saveLearnProgress = (value) => {
  if (!isBrowser) {
    return;
  }

  const normalizedPayload = {
    selectedDeckId:
      typeof value?.selectedDeckId === "string" ? value.selectedDeckId : "",
    isBackVisible: Boolean(value?.isBackVisible),
    indexByDeckId: normalizeIndexByDeckId(value?.indexByDeckId),
  };

  try {
    window.localStorage.setItem(
      LEARN_PROGRESS_STORAGE_KEY,
      JSON.stringify(normalizedPayload),
    );
  } catch {
    // Ignore storage write failures.
  }
};
