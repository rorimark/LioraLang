import { getCustomWords, mergeWords } from "./wordsManager";

export async function importWords() {
  const response = await fetch("/data/words.json");

  if (!response.ok) {
    throw new Error("Failed to load words");
  }

  const jsonWords = await response.json();
  const customWords = getCustomWords();

  return mergeWords(jsonWords, customWords);
}
