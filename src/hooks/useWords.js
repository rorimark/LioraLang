import { useEffect, useState } from "react";
import { importWords } from "../services/wordImporter/wordImporter";

export function useWords() {
  const [words, setWords] = useState([]);

  useEffect(() => {
    importWords().then(setWords);
  }, []);

  return words;
}
