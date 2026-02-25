const STORAGE_KEY = "lioralang_custom_words";

const parseJSON = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

export const getCustomWords = () => {
  if (typeof window === "undefined") {
    return [];
  }

  const rawValue = window.localStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return [];
  }

  const parsed = parseJSON(rawValue);

  return Array.isArray(parsed) ? parsed : [];
};

export const mergeWords = (baseWords, customWords) => {
  const mergedWords = [...baseWords];

  customWords.forEach((customWord) => {
    const index = mergedWords.findIndex((word) => word.id === customWord.id);

    if (index >= 0) {
      mergedWords[index] = customWord;
      return;
    }

    mergedWords.push(customWord);
  });

  return mergedWords;
};
