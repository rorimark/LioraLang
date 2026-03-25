import { memo, useCallback } from "react";
import "./CardCatalogFilters.css";

const EMPTY_FILTERS = Object.freeze({
  level: [],
  partOfSpeech: [],
  tags: [],
});
const EMPTY_OBJECT = Object.freeze({});
const EMPTY_OPTIONS = Object.freeze([]);

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

export const CardCatalogFilters = memo(({ catalog = EMPTY_OBJECT }) => {
    const resolvedCatalog = catalog;
    const resolvedFilters = resolvedCatalog.filters || EMPTY_FILTERS;
    const resolvedLevelOptions = Array.isArray(resolvedCatalog.levelOptions)
      ? resolvedCatalog.levelOptions
      : EMPTY_OPTIONS;
    const resolvedPartOfSpeechOptions = Array.isArray(
      resolvedCatalog.partOfSpeechOptions,
    )
      ? resolvedCatalog.partOfSpeechOptions
      : EMPTY_OPTIONS;
    const resolvedTagOptions = Array.isArray(resolvedCatalog.tagOptions)
      ? resolvedCatalog.tagOptions
      : EMPTY_OPTIONS;
    const resolvedSortOptions = Array.isArray(resolvedCatalog.sortOptions)
      ? resolvedCatalog.sortOptions
      : EMPTY_OPTIONS;

    const handleSearchChange = useCallback(
      (event) => {
        resolvedCatalog.onSearchChange?.(event.target.value);
      },
      [resolvedCatalog],
    );

    const handleSortChange = useCallback(
      (event) => {
        resolvedCatalog.onSortChange?.(event.target.value);
      },
      [resolvedCatalog],
    );

    const handleFilterToggle = useCallback(
      (event) => {
        resolvedCatalog.onToggleFilter?.(event.target.name, event.target.value);
      },
      [resolvedCatalog],
    );

    return (
      <fieldset className="card-catalog-filters">
        <legend className="sr-only">Card filters</legend>
        <div className="card-catalog-filters__header">
          <h3 className="card-catalog-filters__title">Filters</h3>
          <span className="card-catalog-filters__results">
            {Number.isFinite(Number(resolvedCatalog.resultsCount))
              ? `${Number(resolvedCatalog.resultsCount)} results`
              : "0 results"}
          </span>
        </div>

        <div className="card-catalog-filters__controls">
          <input
            type="text"
            value={resolvedCatalog.search || ""}
            placeholder="Search by word or translation"
            onChange={handleSearchChange}
            aria-label="Search cards"
          />

          <select
            value={resolvedCatalog.sort || ""}
            onChange={handleSortChange}
            aria-label="Sort cards"
          >
            {resolvedSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="button" onClick={resolvedCatalog.onClearFilters}>
            Clear filters
          </button>
        </div>

        <ul className="card-catalog-filters__groups">
          {resolvedLevelOptions.length > 0 && (
            <FilterGroup title="Level">
              {resolvedLevelOptions.map((level) => (
                <FilterItem
                  key={level}
                  name="level"
                  value={level}
                  label={level}
                  checked={resolvedFilters.level.includes(level)}
                  onChange={handleFilterToggle}
                />
              ))}
            </FilterGroup>
          )}

          <FilterGroup title="Part of speech">
            {resolvedPartOfSpeechOptions.map((part) => (
              <FilterItem
                key={part}
                name="partOfSpeech"
                value={part}
                label={part}
                checked={resolvedFilters.partOfSpeech.includes(part)}
                onChange={handleFilterToggle}
              />
            ))}
          </FilterGroup>

          {resolvedTagOptions.length > 0 && (
            <FilterGroup title="Tags">
              {resolvedTagOptions.map((tag) => (
                <FilterItem
                  key={tag}
                  name="tags"
                  value={tag}
                  label={tag}
                  checked={resolvedFilters.tags.includes(tag)}
                  onChange={handleFilterToggle}
                />
              ))}
            </FilterGroup>
          )}
        </ul>
      </fieldset>
    );
  });

CardCatalogFilters.displayName = "CardCatalogFilters";
