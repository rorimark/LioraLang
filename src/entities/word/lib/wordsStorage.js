export const getCustomWords = () => {
  return [];
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
