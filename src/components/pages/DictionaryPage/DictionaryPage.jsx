import "./DictionaryPage.css";
import { useWords } from "../../../hooks/useWords";
import { useFilter } from "../../../hooks/useFilters";
import { useState, useEffect } from "react";
import DictionaryTable from "../../ui/DictionaryTable/DictionaryTable";
import DictionaryFilters from "../../ui/Filters/DictionaryFilters";

export default function DictionaryPage() {
  const { words, isLoading, error } = useWords();
  const {
    filteredWords,
    search,
    sort,
    filters,
    setSearch,
    setSort,
    toggleFilterValue,
    clearFilters,
  } = useFilter(words);

  // Состояние для мобильных фильтров
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Определяем мобильное устройство
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    // Слушаем событие открытия фильтров из App.jsx
    const handleOpenFilters = () => {
      if (isMobile) {
        setMobileFiltersOpen(true);
      }
    };

    // Слушаем событие закрытия фильтров
    const handleCloseFilters = () => {
      setMobileFiltersOpen(false);
    };

    window.addEventListener("openDictionaryFilters", handleOpenFilters);
    window.addEventListener("closeDictionaryFilters", handleCloseFilters);

    return () => {
      window.removeEventListener("resize", checkMobile);
      window.removeEventListener("openDictionaryFilters", handleOpenFilters);
      window.removeEventListener("closeDictionaryFilters", handleCloseFilters);
    };
  }, [isMobile]);

  const handleCloseFilters = () => {
    setMobileFiltersOpen(false);
    // Диспатчим событие для App.jsx
    const event = new CustomEvent("closeDictionaryFilters");
    window.dispatchEvent(event);
  };

  if (error) {
    return (
      <main className="dictionary-page-content">
        <div style={{ color: "#ff6b6b", padding: "1rem" }}>
          Error loading dictionary: {error}
        </div>
      </main>
    );
  }

  return (
    <main className="dictionary-page-content">
      {isLoading ? (
        <div style={{ color: "#ffffff", padding: "1rem" }}>Loading...</div>
      ) : (
        <div className="table-filter">
          <DictionaryTable words={filteredWords} />

          {/* Обертка для фильтров */}
          <div
            className={`filters-wrapper ${mobileFiltersOpen ? "mobile-open" : ""}`}
          >
            <DictionaryFilters
              search={search}
              sort={sort}
              filters={filters}
              onSearchChange={setSearch}
              onSortChange={setSort}
              onToggleFilter={toggleFilterValue}
              onClearFilters={() => {
                clearFilters();
                handleCloseFilters();
              }}
            />

            {/* Кнопка закрытия фильтров на мобильных */}
            {/* {mobileFiltersOpen && (
              <button
                className="mobile-filters-close"
                onClick={handleCloseFilters}
                aria-label="Close filters"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M18 6L6 18M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            )} */}
          </div>
        </div>
      )}
    </main>
  );
}
