import { memo } from "react";
import { Select } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import "./SubjectFieldInputs.css";

// The fields a subject adds to a deck or an entry, drawn from the specs in
// its profile: a line of text, a block of code, or one value from a list.
// Labels and placeholders are the profile's message keys; nothing here
// knows which subject it is.

const CodeInput = ({ name, value, onChange, placeholder, maxLength }) => (
  <textarea
    className="subject-field__code"
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    maxLength={maxLength}
    rows={6}
    wrap="off"
    spellCheck="false"
    autoCapitalize="off"
    autoComplete="off"
    autoCorrect="off"
    translate="no"
  />
);

const ChoiceInput = ({ name, value, onChange, spec, label }) => {
  const { t } = useI18n();

  return (
    <span className="subject-field__select">
      <Select name={name} value={value} onChange={onChange} label={label}>
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

const TextInput = ({ name, value, onChange, placeholder, maxLength }) => (
  <input
    type="text"
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
  const entries = Object.entries(fields).filter(([, spec]) => !only || only.includes(spec.type));

  return entries.map(([name, spec]) => {
    const Input = INPUTS[spec.type] || TextInput;
    const label = t(spec.labelKey);
    const handleChange = (event) => onChange?.(name, event.target.value);

    return (
      <label
        key={name}
        className={`subject-field subject-field--${spec.type} ${fieldClassName}`.trim()}
      >
        <span className={`subject-field__label ${labelClassName}`.trim()}>{label}</span>
        <Input
          name={name}
          value={values?.[name] ?? ""}
          onChange={handleChange}
          placeholder={spec.placeholderKey ? t(spec.placeholderKey) : ""}
          maxLength={spec.maxLength}
          spec={spec}
          label={label}
        />
        {spec.hintKey ? <small className="subject-field__hint">{t(spec.hintKey)}</small> : null}
      </label>
    );
  });
});

SubjectFieldInputs.displayName = "SubjectFieldInputs";
