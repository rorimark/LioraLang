export default function FilterItem({
  type,
  name,
  value,
  label,
  checked,
  onChange,
}) {
  const id = `${name}-${value}`;

  return (
    <li>
      <input
        type={type}
        name={name}
        id={id}
        value={value}
        checked={checked}
        onChange={onChange}
        aria-label={label}
      />
      <label htmlFor={id}>{label}</label>
    </li>
  );
}
