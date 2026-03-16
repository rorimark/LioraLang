import { Fragment, memo } from "react";
import { useWordsTable } from "../../model/useWordsTable";
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

const resolveExamples = (word) => {
  const list = Array.isArray(word?.examples) ? word.examples : [];
  const fallback = typeof word?.example === "string" ? word.example.trim() : "";
  const rawExamples = list.length > 0 ? list.slice() : [];

  if (!rawExamples.length && fallback) {
    rawExamples.push(fallback);
  } else if (fallback && !rawExamples.includes(fallback)) {
    rawExamples.push(fallback);
  }

  const seen = new Set();

  return rawExamples
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => {
      if (!item) {
        return false;
      }
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
};
export const WordsTable = memo(({ words, languageLabels }) => {
  const labels = resolveLanguageLabels(languageLabels);
  const totalColumns = labels.hasTertiaryLanguage ? 6 : 5;
  const { expandedRowId, handleToggleRow } = useWordsTable();

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
          <th className="words-table__examples">Examples</th>
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
          words.map((word) => {
            const examples = resolveExamples(word);
            const isExpanded = String(expandedRowId) === String(word.id);

            return (
              <Fragment key={word.id}>
                <tr
                  data-word-id={word.id}
                  onClick={handleToggleRow}
                  className={
                    isExpanded
                      ? "words-table__row words-table__row--expanded"
                      : "words-table__row"
                  }
                >
                  <td data-label={labels.sourceLanguage}>
                    <span className="words-table__cell-text">
                      {word.source || "-"}
                    </span>
                  </td>
                  <td className="words-table__level" data-label="Level">
                    {word.level || "-"}
                  </td>
                  <td data-label="Part of speech">
                    {word.part_of_speech || "-"}
                  </td>
                  <td data-label={labels.targetLanguage}>{word.target || "-"}</td>
                  {labels.hasTertiaryLanguage && (
                    <td data-label={labels.tertiaryLanguage}>
                      {word.tertiary || "-"}
                    </td>
                  )}
                  <td className="words-table__examples" data-label="Examples">
                    {examples.length === 0 ? (
                      "-"
                    ) : (
                      <ul className="words-table__examples-list">
                        {examples.map((example, index) => (
                          <li
                            key={`${word.id}-example-${index}`}
                            className="words-table__example"
                          >
                            {example}
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="words-table__row-details">
                    <td colSpan={totalColumns}>
                      <div className="words-table__details">
                        <div className="words-table__details-head">
                          <span className="words-table__details-label">
                            {labels.sourceLanguage}
                          </span>
                          <span className="words-table__details-value">
                            {word.source || "-"}
                          </span>
                        </div>
                        <div className="words-table__details-grid">
                          <div>
                            <span className="words-table__details-label">Level</span>
                            <span className="words-table__details-value">
                              {word.level || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="words-table__details-label">
                              Part of speech
                            </span>
                            <span className="words-table__details-value">
                              {word.part_of_speech || "-"}
                            </span>
                          </div>
                          <div>
                            <span className="words-table__details-label">
                              {labels.targetLanguage}
                            </span>
                            <span className="words-table__details-value">
                              {word.target || "-"}
                            </span>
                          </div>
                          {labels.hasTertiaryLanguage && (
                            <div>
                              <span className="words-table__details-label">
                                {labels.tertiaryLanguage}
                              </span>
                              <span className="words-table__details-value">
                                {word.tertiary || "-"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="words-table__details-examples">
                          <span className="words-table__details-label">
                            Examples
                          </span>
                          {examples.length === 0 ? (
                            <span className="words-table__details-value">-</span>
                          ) : (
                            <ul className="words-table__details-list">
                              {examples.map((example, index) => (
                                <li
                                  key={`${word.id}-expanded-example-${index}`}
                                >
                                  {example}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })
        )}
      </tbody>
    </table>
  );
});

WordsTable.displayName = "WordsTable";
