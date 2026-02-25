import { memo } from "react";
import "./WordsTable.css";

export const WordsTable = memo(({ words }) => {
  return (
    <table className="words-table" aria-label="Dictionary words">
      <caption className="sr-only">Filtered dictionary cards</caption>
      <thead>
        <tr>
          <th>English</th>
          <th className="words-table__level">Level</th>
          <th>Part of speech</th>
          <th>Russian</th>
          <th>Polish</th>
        </tr>
      </thead>

      <tbody>
        {words.length === 0 ? (
          <tr>
            <td className="words-table__empty" colSpan={5}>
              No words found.
            </td>
          </tr>
        ) : (
          words.map((word) => (
            <tr key={word.id} className="words-table__row">
              <td data-label="English">{word.eng || "-"}</td>
              <td className="words-table__level" data-label="Level">
                {word.level || "-"}
              </td>
              <td data-label="Part of speech">{word.part_of_speech || "-"}</td>
              <td data-label="Russian">{word.ru || "-"}</td>
              <td data-label="Polish">{word.pl || "-"}</td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
});

WordsTable.displayName = "WordsTable";
