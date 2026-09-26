import { memo, useCallback, useContext, useId, useMemo } from "react";
import { FiMinus, FiPlus } from "react-icons/fi";
import { matchesSettingsQuery, splitSettingsQuery } from "./settingsSearch";
import { SettingsSearchContext } from "./settingsSearchContext";
import "./Settings.css";

// ----- search scope -----
// A scope passes the search down. Once a scope's own title matches, every
// row inside it is shown, so searching "shortcuts" shows the whole group.

export const SettingsSearch = memo(({ query = "", children }) => {
  const value = useMemo(() => {
    const words = splitSettingsQuery(query);

    return { words, isMatched: words.length === 0 };
  }, [query]);

  return (
    <SettingsSearchContext.Provider value={value}>{children}</SettingsSearchContext.Provider>
  );
});

SettingsSearch.displayName = "SettingsSearch";

export const SettingsScope = memo(({ title = "", keywords = "", children }) => {
  const parent = useContext(SettingsSearchContext);
  const isMatched = parent.isMatched || matchesSettingsQuery(parent.words, title, keywords);
  const value = useMemo(
    () => (isMatched === parent.isMatched ? parent : { ...parent, isMatched }),
    [isMatched, parent],
  );

  return (
    <SettingsSearchContext.Provider value={value}>{children}</SettingsSearchContext.Provider>
  );
});

SettingsScope.displayName = "SettingsScope";

// ----- group and row -----

export const SettingGroup = memo(({ title = "", description = "", keywords = "", children }) => (
  <SettingsScope title={title} keywords={keywords}>
    <section className="setting-group">
      {title ? (
        <header className="setting-group__head">
          <h3>{title}</h3>
          {description ? <p>{description}</p> : null}
        </header>
      ) : null}
      <div className="setting-group__rows">{children}</div>
    </section>
  </SettingsScope>
));

SettingGroup.displayName = "SettingGroup";

// One setting: what it is on the left, the control on the right. A wide
// control (a text field) goes under the label instead.
export const SettingRow = memo(
  ({ label, hint = "", keywords = "", control, controlId, wide = false, tone = "" }) => {
    const { words, isMatched } = useContext(SettingsSearchContext);

    if (!isMatched && !matchesSettingsQuery(words, label, hint, keywords)) {
      return null;
    }

    const className = [
      "setting-row",
      wide ? "setting-row--wide" : "",
      tone ? `setting-row--${tone}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={className}>
        <div className="setting-row__text">
          {controlId ? (
            <label className="setting-row__label" htmlFor={controlId}>
              {label}
            </label>
          ) : (
            <span className="setting-row__label">{label}</span>
          )}
          {hint ? <span className="setting-row__hint">{hint}</span> : null}
        </div>
        <div className="setting-row__control">{control}</div>
      </div>
    );
  },
);

SettingRow.displayName = "SettingRow";

// Anything in a group that is not a setting (a status card, a button bar).
// While searching it shows only if its group matched the search.
export const SettingContent = memo(({ className = "", children }) => {
  const { isMatched } = useContext(SettingsSearchContext);

  if (!isMatched) {
    return null;
  }

  return <div className={["setting-content", className].filter(Boolean).join(" ")}>{children}</div>;
});

SettingContent.displayName = "SettingContent";

// ----- controls -----

// A checkbox that looks and reads as an on/off switch.
export const SettingSwitch = memo(({ id, name, checked, onChange, disabled = false }) => (
  <input
    id={id}
    className="setting-switch"
    type="checkbox"
    role="switch"
    name={name}
    checked={Boolean(checked)}
    onChange={onChange}
    disabled={disabled}
  />
));

SettingSwitch.displayName = "SettingSwitch";

// A few options side by side; each is a real radio button, so arrow keys
// move between them and the change event carries the name and value.
export const SettingSegmented = memo(
  ({ name, value, options = [], onChange, ariaLabel, disabled = false }) => {
    const groupId = useId();

    return (
      <div className="setting-segmented" role="radiogroup" aria-label={ariaLabel}>
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;

          return (
            <span className="setting-segmented__option" key={option.value}>
              <input
                id={optionId}
                type="radio"
                name={name}
                value={option.value}
                checked={String(value) === String(option.value)}
                onChange={onChange}
                disabled={disabled}
              />
              <label htmlFor={optionId}>{option.label}</label>
            </span>
          );
        })}
      </div>
    );
  },
);

SettingSegmented.displayName = "SettingSegmented";

const clampNumber = (value, min, max) => Math.min(max, Math.max(min, value));

// A number with − and + keys that a thumb can hit, and the field between
// them for typing. Changes go out as { target: { name, value } }, which is
// what the preference handlers read.
export const SettingStepper = memo(
  ({ id, name, value, min = 0, max = 9999, step = 1, onChange, unit = "", ariaLabel }) => {
    const numericValue = Number(value) || 0;
    const emit = useCallback(
      (nextValue) => {
        onChange?.({ target: { name, value: String(clampNumber(nextValue, min, max)) } });
      },
      [max, min, name, onChange],
    );

    return (
      <div className="setting-stepper">
        <button
          type="button"
          className="setting-stepper__key"
          onClick={() => emit(numericValue - step)}
          disabled={numericValue <= min}
          aria-label={`Decrease ${ariaLabel || name}`}
        >
          <FiMinus aria-hidden="true" />
        </button>
        <span className="setting-stepper__field">
          <input
            id={id}
            type="number"
            inputMode="numeric"
            name={name}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={onChange}
            onBlur={(event) => {
              const typed = Number(event.target.value);

              if (!Number.isFinite(typed) || typed !== clampNumber(typed, min, max)) {
                emit(Number.isFinite(typed) ? typed : min);
              }
            }}
          />
          {unit ? <span aria-hidden="true">{unit}</span> : null}
        </span>
        <button
          type="button"
          className="setting-stepper__key"
          onClick={() => emit(numericValue + step)}
          disabled={numericValue >= max}
          aria-label={`Increase ${ariaLabel || name}`}
        >
          <FiPlus aria-hidden="true" />
        </button>
      </div>
    );
  },
);

SettingStepper.displayName = "SettingStepper";

export const SettingSelect = memo(({ id, name, value, onChange, children, disabled = false }) => (
  <span className="setting-select">
    <select id={id} name={name} value={value} onChange={onChange} disabled={disabled}>
      {children}
    </select>
  </span>
));

SettingSelect.displayName = "SettingSelect";
