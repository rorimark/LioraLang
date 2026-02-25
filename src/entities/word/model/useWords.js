import { useCallback, useEffect, useState } from "react";
import { fetchWords } from "../api/wordsApi";
import { getCustomWords, mergeWords } from "../lib/wordsStorage";

export const useWords = () => {
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const baseWords = await fetchWords();
      const customWords = getCustomWords();
      const mergedWords = mergeWords(baseWords, customWords);

      setWords(mergedWords);
    } catch (loadError) {
      setError(loadError.message || "Failed to load words");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const baseWords = await fetchWords();
        const customWords = getCustomWords();
        const mergedWords = mergeWords(baseWords, customWords);

        if (!isCancelled) {
          setWords(mergedWords);
        }
      } catch (loadError) {
        if (!isCancelled) {
          setError(loadError.message || "Failed to load words");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      isCancelled = true;
    };
  }, []);

  return {
    words,
    isLoading,
    error,
    refreshWords: loadWords,
  };
};
