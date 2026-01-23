const STORAGE_KEY = "lioralang_custom_words";

export function getCustomWords() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error reading custom words from localStorage:", error);
    return [];
  }
}

export function saveCustomWords(words) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    return true;
  } catch (error) {
    console.error("Error saving custom words to localStorage:", error);
    return false;
  }
}

export function addCustomWord(word) {
  const customWords = getCustomWords();

  if (!word.id) {
    const maxId = customWords.reduce((max, w) => {
      const num = parseInt(w.id?.replace("w", "") || "0");
      return num > max ? num : max;
    }, 0);
    word.id = `w${maxId + 1}`;
  }

  // Check if word with same ID already exists
  if (customWords.some((w) => w.id === word.id)) {
    throw new Error(`Word with ID ${word.id} already exists`);
  }

  customWords.push(word);
  saveCustomWords(customWords);
  return word;
}

export function deleteCustomWord(wordId) {
  const customWords = getCustomWords();
  const filtered = customWords.filter((w) => w.id !== wordId);
  saveCustomWords(filtered);
  return filtered.length < customWords.length;
}

export function updateCustomWord(wordId, updates) {
  const customWords = getCustomWords();
  const index = customWords.findIndex((w) => w.id === wordId);

  if (index === -1) {
    throw new Error(`Word with ID ${wordId} not found`);
  }

  customWords[index] = { ...customWords[index], ...updates };
  saveCustomWords(customWords);
  return customWords[index];
}

export function mergeWords(jsonWords, customWords) {
  //   const customWordsMap = new Map(customWords.map((w) => [w.id, w]));
  const merged = [...jsonWords];

  customWords.forEach((customWord) => {
    const index = merged.findIndex((w) => w.id === customWord.id);
    if (index !== -1) {
      merged[index] = customWord;
    } else {
      merged.push(customWord);
    }
  });

  return merged;
}

export function exportWordsAsJSON(words, filename = "words.json") {
  const jsonString = JSON.stringify(words, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function clearCustomWords() {
  localStorage.removeItem(STORAGE_KEY);
}
