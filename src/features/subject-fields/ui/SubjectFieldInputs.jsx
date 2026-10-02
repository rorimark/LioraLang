import { memo, useId } from "react";
import { Select, SettingSegmented } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import "./SubjectFieldInputs.css";

// The fields a subject adds to a deck or an entry, drawn from the specs in
// its profile: a line of text, a block of code, or one value from a list.
// Labels and placeholders are the profile's message keys; nothing here
// knows which subject it is.

const CodeInput = ({ id, name, value, onChange, placeholder, maxLength }) => (
  <textarea
    className="subject-field__code"
    id={id}
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    maxLength={maxLength}
    rows={6}
    wrap="soft"
    spellCheck="false"
    autoCapitalize="off"
    autoComplete="off"
    autoCorrect="off"
    translate="no"
  />
);

const ChoiceInput = ({ id, name, value, onChange, spec, label }) => {
  const { t } = useI18n();

  return (
    <span className="subject-field__select">
      <Select id={id} name={name} value={value} onChange={onChange} label={label}>
        <option value="">{t("quickAdd.notSet")}</option>
        {spec.values.map((option) => (
          <option key={option} value={option}>
            {spec.valueKey ? t(`${spec.valueKey}.${option}`) : option}
          </option>
        ))}
      </Select>
    </span>
  );
};

const TextInput = ({ id, name, value, onChange, placeholder, maxLength }) => (
  <input
    type="text"
    id={id}
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    maxLength={maxLength}
    autoComplete="off"
  />
);

const INPUTS = { code: CodeInput, choice: ChoiceInput, text: TextInput };

export const SubjectFieldInputs = memo(({
  fields = {},
  values = {},
  onChange,
  fieldClassName = "",
  labelClassName = "",
  only = null,
}) => {
  const { t } = useI18n();
  const id = useId();
  const entries = Object.entries(fields).filter(([, spec]) => !spec.attachedTo && (!only || only.includes(spec.type)));

  return entries.map(([name, spec]) => {
    const Input = INPUTS[spec.type] || TextInput;
    const label = t(spec.labelKey);
    const placement = fields[spec.placementField];
    const inputId = `${id}-${name}`;
    const handleChange = (event) => onChange?.(name, event.target.value);

    return (
      <div
        key={name}
        className={`subject-field subject-field--${spec.type} ${fieldClassName}`.trim()}
      >
        <label htmlFor={inputId} className={`subject-field__label ${labelClassName}`.trim()}>{label}</label>
        {placement ? (
          <SettingSegmented
            name={spec.placementField}
            value={values?.[spec.placementField] || placement.defaultValue}
            ariaLabel={t(placement.labelKey)}
            onChange={(event) => onChange?.(spec.placementField, event.target.value)}
            options={placement.values.map((value) => ({ value, label: t(`${placement.valueKey}.${value}`) }))}
          />
        ) : null}
        <Input
          id={inputId}
          name={name}
          value={values?.[name] ?? ""}
          onChange={handleChange}
          placeholder={spec.placeholderKey ? t(spec.placeholderKey) : ""}
          maxLength={spec.maxLength}
          spec={spec}
          label={label}
        />
        {spec.hintKey ? <small className="subject-field__hint">{t(spec.hintKey)}</small> : null}
      </div>
    );
  });
});

SubjectFieldInputs.displayName = "SubjectFieldInputs";
