import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { normalizeWord } from "@shared/lib/word";

const LEVEL_ORDER = {
  A1: 1,
  A2: 2,
  B1: 3,
  B2: 4,
  C1: 5,
  C2: 6,
};

export const SORT_OPTIONS = [
  { value: "alpha-asc", label: "A-Z" },
  { value: "alpha-desc", label: "Z-A" },
  { value: "level-asc", label: "Level: easy-hard" },
  { value: "level-desc", label: "Level: hard-easy" },
];

export const PAGE_SIZE_OPTIONS = [10, 20, 50];

const INITIAL_FILTERS = { level: [], partOfSpeech: [] };
const INITIAL_FILTERS_WITH_TAGS = { level: [], partOfSpeech: [], tags: [] };

const searchBlob = (word) =>
  `${word.source} ${word.target} ${word.tertiary} ${word.part_of_speech} ${
    Array.isArray(word.tags) ? word.tags.join(" ") : ""
  }`.toLowerCase();

const compareByLevelValue = (leftLevel, rightLevel) => {
  const leftValue = LEVEL_ORDER[leftLevel] ?? Number.MAX_SAFE_INTEGER;
  const rightValue = LEVEL_ORDER[rightLevel] ?? Number.MAX_SAFE_INTEGER;

  return leftValue - rightValue;
};

const compareByWordLevel = (leftWord, rightWord) =>
  compareByLevelValue(leftWord.level, rightWord.level);

const toggleFilterValue = (values, value) => {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  return [...values, value];
};

export const useCardCatalog = (words) => {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState(SORT_OPTIONS[0].value);
  const [filters, setFilters] = useState(INITIAL_FILTERS_WITH_TAGS);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[1]);

  const deferredSearch = useDeferredValue(search);
  const normalizedSearch = deferredSearch.trim().toLowerCase();

  const sourceWords = useMemo(
    () => words.map((word, index) => normalizeWord(word, `w-${index + 1}`)),
    [words],
  );

  const levelOptions = useMemo(
    () =>
      [...new Set(sourceWords.map((word) => word.level).filter(Boolean))].sort(
        compareByLevelValue,
      ),
    [sourceWords],
  );

  const partOfSpeechOptions = useMemo(
    () => [...new Set(sourceWords.map((word) => word.part_of_speech).filter(Boolean))].sort(),
    [sourceWords],
  );

  const tagOptions = useMemo(
    () =>
      [...new Set(
        sourceWords.flatMap((word) =>
          Array.isArray(word.tags)
            ? word.tags.map((tag) => (typeof tag === "string" ? tag.trim() : "")).filter(Boolean)
            : [],
        ),
      )].sort((left, right) => left.localeCompare(right)),
    [sourceWords],
  );

  const kpiItems = useMemo(
    () => [
      {
        label: "New",
        count: String(
          sourceWords.filter((word) => ["A1", "A2"].includes(word.level)).length,
        ),
      },
      {
        label: "Mature",
        count: String(
          sourceWords.filter((word) => ["B2", "C1", "C2"].includes(word.level))
            .length,
        ),
      },
      {
        label: "Leeches",
        count: String(
          sourceWords.filter((word) => ["C1", "C2"].includes(word.level)).length,
        ),
      },
    ],
    [sourceWords],
  );

  const filteredWords = useMemo(() => {
    const selectedLevels = new Set(filters.level);
    const selectedParts = new Set(filters.partOfSpeech);
    const selectedTags = new Set(filters.tags);

    const matched = sourceWords.filter((word) => {
      if (selectedLevels.size > 0 && !selectedLevels.has(word.level)) {
        return false;
      }

      if (selectedParts.size > 0 && !selectedParts.has(word.part_of_speech)) {
        return false;
      }

      if (selectedTags.size > 0) {
        const wordTagKeys = new Set(
          Array.isArray(word.tags)
            ? word.tags
                .map((tag) => (typeof tag === "string" ? tag.trim() : ""))
                .filter(Boolean)
            : [],
        );

        for (const selectedTag of selectedTags) {
          if (!wordTagKeys.has(selectedTag)) {
            return false;
          }
        }
      }

      if (normalizedSearch && !searchBlob(word).includes(normalizedSearch)) {
        return false;
      }

      return true;
    });

    matched.sort((left, right) => {
      if (sort === "alpha-desc") {
        return right.source.localeCompare(left.source);
      }

      if (sort === "level-asc") {
        const byLevel = compareByWordLevel(left, right);
        return byLevel !== 0 ? byLevel : left.source.localeCompare(right.source);
      }

      if (sort === "level-desc") {
        const byLevel = compareByWordLevel(right, left);
        return byLevel !== 0 ? byLevel : left.source.localeCompare(right.source);
      }

      return left.source.localeCompare(right.source);
    });

    return matched;
  }, [filters.level, filters.partOfSpeech, filters.tags, normalizedSearch, sort, sourceWords]);

  const totalItems = filteredWords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const resolvedPage = Math.min(currentPage, totalPages);

  const paginatedWords = useMemo(() => {
    const startIndex = (resolvedPage - 1) * pageSize;
    return filteredWords.slice(startIndex, startIndex + pageSize);
  }, [filteredWords, pageSize, resolvedPage]);

  const visibleRange = useMemo(() => {
    if (totalItems === 0) {
      return { start: 0, end: 0 };
    }

    const start = (resolvedPage - 1) * pageSize + 1;
    const end = Math.min(start + pageSize - 1, totalItems);

    return { start, end };
  }, [pageSize, resolvedPage, totalItems]);

  const handleSearchChange = useCallback((value) => {
    setSearch(value);
    setCurrentPage(1);
  }, []);

  const handleSortChange = useCallback((value) => {
    setSort(value);
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback(
    (page) => {
      const nextPage = Math.max(1, Math.min(totalPages, page));
      setCurrentPage(nextPage);
    },
    [totalPages],
  );

  const handlePageSizeChange = useCallback((value) => {
    setPageSize(value);
    setCurrentPage(1);
  }, []);

  const handleToggleFilter = useCallback((group, value) => {
    setCurrentPage(1);
    setFilters((prevFilters) => ({
      ...prevFilters,
      [group]: toggleFilterValue(prevFilters[group], value),
    }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setSort(SORT_OPTIONS[0].value);
    setFilters(INITIAL_FILTERS_WITH_TAGS);
    setCurrentPage(1);
  }, []);

  return {
    kpiItems,
    search,
    sort,
    filters,
    levelOptions,
    partOfSpeechOptions,
    tagOptions,
    paginatedWords,
    totalItems,
    totalPages,
    resolvedPage,
    pageSize,
    visibleRange,
    handleSearchChange,
    handleSortChange,
    handlePageChange,
    handlePageSizeChange,
    handleToggleFilter,
    handleClearFilters,
  };
};
