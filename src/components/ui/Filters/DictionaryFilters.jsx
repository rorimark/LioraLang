import "./DictionaryFilters.css";
import { useMemo } from "react";
import { LEVELS, PARTS_OF_SPEECH } from "../../../constants/FILTERS_CONSTS";
import { SORT_OPTIONS, SORT_LABELS, DEBOUNCE_DELAY } from "../../../constants/appConstants";
import { debounce } from "../../../services/debounce";
import FilterGroup from "../FilterGroup/FilterGroup";
import FilterItem from "../FilterItem/FilterItem";

export default function DictionaryFilters({
  search,
  sort,
  filters,
  onSearchChange,
  onSortChange,
  onToggleFilter,
  onClearFilters,
}) {
  const debouncedSearchChange = useMemo(
    () => debounce(onSearchChange, DEBOUNCE_DELAY),
    [onSearchChange],
  );

  return (
    <fieldset className="dictionary-table-filters">
      <legend className="sr-only">Filters</legend>
      <h3 className="filters-title">Filters</h3>

      <div className="sorting-fields">
        <input
          type="text"
          id="dictionary-page-search"
          placeholder="Enter word..."
          defaultValue={search}
          onChange={(e) => debouncedSearchChange(e.target.value)}
          aria-label="Search dictionary"
        />

        <select
          id="dictionary-page-sort"
          name="dictionary-sort"
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          aria-label="Sort dictionary"
        >
          {Object.values(SORT_OPTIONS).map((value) => (
            <option key={value} value={value}>
              {SORT_LABELS[value]}
            </option>
          ))}
        </select>

        <button
          type="button"
          id="clear-filter-btn"
          onClick={onClearFilters}
          aria-label="Clear all filters"
        >
          Clear filters
        </button>
      </div>

      <ul>
        <FilterGroup title="Level">
          {LEVELS.map((level) => (
            <FilterItem
              key={level}
              type="checkbox"
              name="level"
              value={level}
              label={level}
              checked={filters.level.includes(level)}
              onChange={() => onToggleFilter("level", level)}
            />
          ))}
        </FilterGroup>

        <FilterGroup title="Parts of speech">
          {PARTS_OF_SPEECH.map((part) => {
            const normalizedPart = String(part).toLowerCase().trim();
            const isChecked = filters.partOfSpeech.some(
              (p) => String(p).toLowerCase().trim() === normalizedPart
            );
            return (
              <FilterItem
                key={part}
                type="checkbox"
                name="partOfSpeech"
                value={normalizedPart}
                label={part}
                checked={isChecked}
                onChange={() => onToggleFilter("partOfSpeech", normalizedPart)}
              />
            );
          })}
        </FilterGroup>
      </ul>
    </fieldset>
  );
}
