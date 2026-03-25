import { memo, useCallback } from "react";
import "./CardCatalogFilters.css";

const FilterItem = memo(({ name, value, label, checked, onChange }) => {
  const id = `${name}-${value}`;

  return (
    <li className="card-catalog-filter-item">
      <input
        type="checkbox"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
      />
      <label htmlFor={id}>{label}</label>
    </li>
  );
});

FilterItem.displayName = "FilterItem";

const FilterGroup = memo(({ title, children }) => {
  return (
    <li className="card-catalog-filter-group">
      <p className="card-catalog-filter-group__title">{title}</p>
      <ul className="card-catalog-filter-group__list">{children}</ul>
    </li>
  );
});

FilterGroup.displayName = "FilterGroup";

export const CardCatalogFilters = memo(
  ({
    search,
    sort,
    filters,
    resultsCount = 0,
    levelOptions,
    partOfSpeechOptions,
    tagOptions,
    sortOptions,
    onSearchChange,
    onSortChange,
    onToggleFilter,
    onClearFilters,
  }) => {
    const handleSearchChange = useCallback(
      (event) => {
        onSearchChange(event.target.value);
      },
      [onSearchChange],
    );

    const handleSortChange = useCallback(
      (event) => {
        onSortChange(event.target.value);
      },
      [onSortChange],
    );

    const handleFilterToggle = useCallback(
      (event) => {
        onToggleFilter(event.target.name, event.target.value);
      },
      [onToggleFilter],
    );

    return (
      <fieldset className="card-catalog-filters">
        <legend className="sr-only">Card filters</legend>
        <div className="card-catalog-filters__header">
          <h3 className="card-catalog-filters__title">Filters</h3>
          <span className="card-catalog-filters__results">
            {Number.isFinite(Number(resultsCount))
              ? `${Number(resultsCount)} results`
              : "0 results"}
          </span>
        </div>

        <div className="card-catalog-filters__controls">
          <input
            type="text"
            value={search}
            placeholder="Search by word or translation"
            onChange={handleSearchChange}
            aria-label="Search cards"
          />

          <select
            value={sort}
            onChange={handleSortChange}
            aria-label="Sort cards"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="button" onClick={onClearFilters}>
            Clear filters
          </button>
        </div>

        <ul className="card-catalog-filters__groups">
          {levelOptions.length > 0 && (
            <FilterGroup title="Level">
              {levelOptions.map((level) => (
                <FilterItem
                  key={level}
                  name="level"
                  value={level}
                  label={level}
                  checked={filters.level.includes(level)}
                  onChange={handleFilterToggle}
                />
              ))}
            </FilterGroup>
          )}

          <FilterGroup title="Part of speech">
            {partOfSpeechOptions.map((part) => (
              <FilterItem
                key={part}
                name="partOfSpeech"
                value={part}
                label={part}
                checked={filters.partOfSpeech.includes(part)}
                onChange={handleFilterToggle}
              />
            ))}
          </FilterGroup>

          {tagOptions.length > 0 && (
            <FilterGroup title="Tags">
              {tagOptions.map((tag) => (
                <FilterItem
                  key={tag}
                  name="tags"
                  value={tag}
                  label={tag}
                  checked={filters.tags.includes(tag)}
                  onChange={handleFilterToggle}
                />
              ))}
            </FilterGroup>
          )}
        </ul>
      </fieldset>
    );
  },
);

CardCatalogFilters.displayName = "CardCatalogFilters";
