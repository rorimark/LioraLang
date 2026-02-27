import { memo } from "react";
import "./WordsTable.css";

const resolveLanguageLabels = (languageLabels) => {
  const sourceLanguage = languageLabels?.sourceLanguage?.trim() || "English";
  const targetLanguage = languageLabels?.targetLanguage?.trim() || "Russian";
  const tertiaryLanguage = languageLabels?.tertiaryLanguage?.trim() || "";

  return {
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage,
    hasTertiaryLanguage: Boolean(tertiaryLanguage),
  };
};

export const WordsTable = memo(({ words, languageLabels }) => {
  const labels = resolveLanguageLabels(languageLabels);
  const totalColumns = labels.hasTertiaryLanguage ? 5 : 4;

  return (
    <table className="words-table" aria-label="Dictionary words">
      <caption className="sr-only">Filtered dictionary cards</caption>
      <thead>
        <tr>
          <th>{labels.sourceLanguage}</th>
          <th className="words-table__level">Level</th>
          <th>Part of speech</th>
          <th>{labels.targetLanguage}</th>
          {labels.hasTertiaryLanguage && <th>{labels.tertiaryLanguage}</th>}
        </tr>
      </thead>

      <tbody>
        {words.length === 0 ? (
          <tr>
            <td className="words-table__empty" colSpan={totalColumns}>
              No words found.
            </td>
          </tr>
        ) : (
          words.map((word) => (
            <tr key={word.id} className="words-table__row">
              <td data-label={labels.sourceLanguage}>{word.source || "-"}</td>
              <td className="words-table__level" data-label="Level">
                {word.level || "-"}
              </td>
              <td data-label="Part of speech">{word.part_of_speech || "-"}</td>
              <td data-label={labels.targetLanguage}>{word.target || "-"}</td>
              {labels.hasTertiaryLanguage && (
                <td data-label={labels.tertiaryLanguage}>{word.tertiary || "-"}</td>
              )}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
});

WordsTable.displayName = "WordsTable";
