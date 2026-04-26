import { memo } from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { TextInput } from "../TextInput/TextInput";
import "./SearchField.css";

const resolveClassName = (className = "") => {
  return ["ui-search-field", className].filter(Boolean).join(" ");
};

export const SearchField = memo(({
  id = "",
  value = "",
  onChange,
  onClear,
  placeholder = "",
  ariaLabel = "Search",
  disabled = false,
  className = "",
}) => {
  const hasValue = typeof value === "string" && value.trim().length > 0;

  return (
    <div className={resolveClassName(className)}>
      <span className="ui-search-field__icon" aria-hidden>
        <FiSearch />
      </span>
      <TextInput
        id={id}
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={ariaLabel}
        disabled={disabled}
        className="ui-search-field__input"
      />
      {hasValue ? (
        <button
          type="button"
          className="ui-search-field__clear"
          onClick={onClear}
          aria-label="Clear search"
          disabled={disabled}
        >
          <FiX aria-hidden />
        </button>
      ) : null}
    </div>
  );
});

SearchField.displayName = "SearchField";
