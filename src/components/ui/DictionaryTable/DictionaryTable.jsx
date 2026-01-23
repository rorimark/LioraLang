import "./DictionaryTable.css";

export default function DictionaryTable({ words }) {
  return (
    <table className="dictionary-page-table" aria-label="Dictionary words">
      <thead>
        <tr>
          <th>English</th>
          <th className="dictionary-word-level">Level</th>
          <th>Part of speech</th>
          <th>Russian</th>
          <th>Polish</th>
        </tr>
      </thead>
      <tbody>
        {!words.length ? (
          <tr>
            <td
              colSpan={5}
              style={{ textAlign: "center", padding: "2rem", color: "#ffffff" }}
            >
              No words found.
            </td>
          </tr>
        ) : (
          words.map((word) => (
            <tr key={word.id} className="dictionary-word-item">
              <td>{word.eng || "-"}</td>
              <td className="dictionary-word-level">{word.level || "-"}</td>
              <td>{word.part_of_speech || "-"}</td>
              <td>{word.ru || "-"}</td>
              <td>{word.pl || "-"}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
