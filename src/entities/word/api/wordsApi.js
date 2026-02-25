export const WORDS_DATA_URL = "/data/words.json";

export const fetchWords = async () => {
  const response = await fetch(WORDS_DATA_URL);

  if (!response.ok) {
    throw new Error("Failed to load words");
  }

  const words = await response.json();

  return Array.isArray(words) ? words : [];
};
