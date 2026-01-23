export default function FilterGroup({ title, children }) {
  return (
    <li>
      {title}
      <ul>{children}</ul>
    </li>
  );
}
