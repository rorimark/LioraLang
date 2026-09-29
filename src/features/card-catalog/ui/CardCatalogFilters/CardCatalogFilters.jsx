import { memo, useCallback } from "react";
import "./CardCatalogFilters.css";
import { Select } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";

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
    const { t, partOfSpeechName } = useI18n();
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
        <legend className="sr-only">{t("catalog.filtersLegend")}</legend>
        <div className="card-catalog-filters__header">
          <h3 className="card-catalog-filters__title">{t("catalog.filters")}</h3>
          <span className="card-catalog-filters__results">
            {t("catalog.results", { count: Number(resolvedCatalog.resultsCount) || 0 })}
          </span>
        </div>

        <div className="card-catalog-filters__controls">
          <input
            type="text"
            value={resolvedCatalog.search || ""}
            placeholder={t("catalog.searchPlaceholder")}
            onChange={handleSearchChange}
            aria-label={t("catalog.search")}
          />

          <Select
            value={resolvedCatalog.sort || ""}
            onChange={handleSortChange}
            aria-label={t("catalog.sortLabel")}
          >
            {resolvedSortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.labelKey ? t(option.labelKey) : option.label}
              </option>
            ))}
          </Select>

          <button type="button" onClick={resolvedCatalog.onClearFilters}>
            {t("catalog.clear")}
          </button>
        </div>

        <ul className="card-catalog-filters__groups">
          {resolvedLevelOptions.length > 0 && (
            <FilterGroup title={t("catalog.level")}>
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

          <FilterGroup title={t("catalog.partOfSpeech")}>
            {resolvedPartOfSpeechOptions.map((part) => (
              <FilterItem
                key={part}
                name="partOfSpeech"
                value={part}
                label={partOfSpeechName(part)}
                checked={resolvedFilters.partOfSpeech.includes(part)}
                onChange={handleFilterToggle}
              />
            ))}
          </FilterGroup>

          {resolvedTagOptions.length > 0 && (
            <FilterGroup title={t("catalog.tags")}>
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
