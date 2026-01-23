import { useMemo, useState } from "react";

export function useFilter(words = []) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("eng-asc");

  const [filters, setFilters] = useState({
    level: [],
    partOfSpeech: [],
    tags: [],
  });

  const filteredWords = useMemo(() => {
    let result = [...words];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((w) => {
        const eng = w.eng ?? "";
        const ru = w.ru ?? "";
        const pl = w.pl ?? "";
        return (
          eng.toLowerCase().includes(q) ||
          ru.toLowerCase().includes(q) ||
          pl.toLowerCase().includes(q)
        );
      });
    }

    if (filters.level.length) {
      result = result.filter((w) => filters.level.includes(w.level));
    }

    if (filters.partOfSpeech.length) {
      result = result.filter((w) =>
        filters.partOfSpeech.includes(w.part_of_speech),
      );
    }

    if (filters.tags.length) {
      result = result.filter((w) =>
        w.tags?.some((tag) => filters.tags.includes(tag)),
      );
    }

    const localeOptions = { sensitivity: "base" };

    switch (sort) {
      case "eng-asc":
        result.sort((a, b) =>
          (a.eng ?? "").localeCompare(b.eng ?? "", "en", localeOptions),
        );
        break;
      case "eng-desc":
        result.sort((a, b) =>
          (b.eng ?? "").localeCompare(a.eng ?? "", "en", localeOptions),
        );
        break;
      case "ru-asc":
        result.sort((a, b) =>
          (a.ru ?? "").localeCompare(b.ru ?? "", "ru", localeOptions),
        );
        break;
      case "ru-desc":
        result.sort((a, b) =>
          (b.ru ?? "").localeCompare(a.ru ?? "", "ru", localeOptions),
        );
        break;
      case "pl-asc":
        result.sort((a, b) =>
          (a.pl ?? "").localeCompare(b.pl ?? "", "pl", localeOptions),
        );
        break;
      case "pl-desc":
        result.sort((a, b) =>
          (b.pl ?? "").localeCompare(a.pl ?? "", "pl", localeOptions),
        );
        break;
      case "level-asc":
        result.sort((a, b) => (a.level ?? "").localeCompare(b.level ?? ""));
        break;
      case "level-desc":
        result.sort((a, b) => (b.level ?? "").localeCompare(a.level ?? ""));
        break;
      default:
        break;
    }

    return result;
  }, [words, search, sort, filters]);

  const toggleFilterValue = (key, value) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);

      return {
        ...prev,
        [key]: exists
          ? prev[key].filter((v) => v !== value)
          : [...prev[key], value],
      };
    });
  };

  const clearFilters = () => {
    setSearch("");
    setSort("eng-asc");
    setFilters({
      level: [],
      partOfSpeech: [],
      tags: [],
    });
  };

  return {
    filteredWords,
    search,
    sort,
    filters,
    setSearch,
    setSort,
    toggleFilterValue,
    clearFilters,
  };
}

export const useFilters = useFilter;
