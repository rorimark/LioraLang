import { useEffect, useState, useCallback } from "react";
import { importWords } from "../services/wordImporter";

export function useWords() {
  const [words, setWords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadWords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await importWords();
      setWords(data);
      setIsLoading(false);
    } catch (err) {
      setError(err.message || "Failed to load words");
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    importWords()
      .then((data) => {
        if (!cancelled) {
          setWords(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load words");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshWords = useCallback(() => {
    loadWords();
  }, [loadWords]);

  return { words, isLoading, error, refreshWords };
}
