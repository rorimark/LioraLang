import "./DictionaryPage.css";
import { useWords } from "../../../hooks/useWords";
import { useFilter } from "../../../hooks/useFilters";
import { pageContainerStyle, mainContentStyle } from "../../../styles/commonStyles";
import Header from "../../layout/Header/Header";
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

  if (error) {
    return (
      <div style={pageContainerStyle}>
        <Header headerTitle="Dictionary" />
        <main className="dictionary-page-content" style={mainContentStyle}>
          <div style={{ color: "#ff6b6b", padding: "1rem" }}>
            Error loading dictionary: {error}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={pageContainerStyle}>
      <Header headerTitle="Dictionary" />
      <main className="dictionary-page-content" style={mainContentStyle}>
        {isLoading ? (
          <div style={{ color: "#ffffff", padding: "1rem" }}>Loading...</div>
        ) : (
          <div className="table-filter">
            <DictionaryTable words={filteredWords} />
            <DictionaryFilters
              search={search}
              sort={sort}
              filters={filters}
              onSearchChange={setSearch}
              onSortChange={setSort}
              onToggleFilter={toggleFilterValue}
              onClearFilters={clearFilters}
            />
          </div>
        )}
      </main>
    </div>
  );
}
