import { memo, useCallback, useMemo } from "react";
import { CardCatalogPagination } from "@features/card-catalog";
import { useDeckEditorPanelContext } from "../model";

const renderWordCell = (value) => {
  return value ? value : "-";
};

const resolveExamples = (word) => {
  const examples = [];
  const seen = new Set();
  const pushExample = (value) => {
    if (typeof value !== "string") {
      return;
    }

    const example = value.trim();

    if (!example || seen.has(example)) {
      return;
    }

    seen.add(example);
    examples.push(example);
  };

  if (Array.isArray(word?.examples)) {
    word.examples.forEach(pushExample);
  }

  pushExample(word?.example);

  return examples;
};

const renderWordTags = (tags) => {
  if (!Array.isArray(tags) || tags.length === 0) {
    return "-";
  }

  return tags.join(", ");
};

const renderExamplesPreview = (word) => {
  const examples = resolveExamples(word);

  if (examples.length === 0) {
    return "-";
  }

  if (examples.length === 1) {
    return examples[0];
  }

  return `${examples[0]} (+${examples.length - 1})`;
};

export const DeckEditorWordsTableSection = memo(() => {
  const {
    words,
    paginatedWords,
    previewWord,
    languageLabels,
    usesWordLevels,
    wordsPage,
    wordsPageSize,
    wordsPageSizeOptions,
    wordsTotalPages,
    wordsRangeStart,
    wordsRangeEnd,
    handleEditWord,
    handleDeleteWord,
    handleWordsPageChange,
    handleWordsPageSizeChange,
  } = useDeckEditorPanelContext();

  const onEditClick = useCallback(
    (event) => {
      handleEditWord(event.currentTarget.dataset.wordId);
    },
    [handleEditWord],
  );

  const onDeleteClick = useCallback(
    (event) => {
      handleDeleteWord(event.currentTarget.dataset.wordId);
    },
    [handleDeleteWord],
  );
  const pagination = useMemo(
    () => ({
      currentPage: wordsPage,
      totalPages: wordsTotalPages,
      pageSize: wordsPageSize,
      pageSizeOptions: wordsPageSizeOptions,
      totalItems: words.length,
      rangeStart: wordsRangeStart,
      rangeEnd: wordsRangeEnd,
      onPageChange: handleWordsPageChange,
      onPageSizeChange: handleWordsPageSizeChange,
    }),
    [
      handleWordsPageChange,
      handleWordsPageSizeChange,
      words.length,
      wordsPage,
      wordsPageSize,
      wordsPageSizeOptions,
      wordsRangeEnd,
      wordsRangeStart,
      wordsTotalPages,
    ],
  );

  return (
    <section className="deck-editor-panel__section">
      <header className="deck-editor-panel__section-header">
        <h3>Words table</h3>
        <p>Review all entries and keep deck clean.</p>
      </header>

      {words.length === 0 ? (
        <div className="deck-editor-panel__empty">
          Add your first word to start building this deck.
        </div>
      ) : (
        <>
          <div className="deck-editor-panel__table-wrap">
            <table className="deck-editor-panel__table" aria-label="Editable words">
              <thead>
                <tr>
                  <th>{languageLabels.sourceLanguage}</th>
                  <th>{languageLabels.targetLanguage}</th>
                  {languageLabels.hasTertiaryLanguage && (
                    <th>{languageLabels.tertiaryLanguage}</th>
                  )}
                  {usesWordLevels && <th>Level</th>}
                  <th>Part</th>
                  <th>Examples</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedWords.map((word) => (
                  <tr
                    key={word.id}
                    className={
                      String(previewWord?.id) === String(word.id)
                        ? "deck-editor-panel__table-row deck-editor-panel__table-row--active"
                        : "deck-editor-panel__table-row"
                    }
                  >
                    <td data-label={languageLabels.sourceLanguage}>
                      {renderWordCell(word.source)}
                    </td>
                    <td data-label={languageLabels.targetLanguage}>
                      {renderWordCell(word.target)}
                    </td>
                    {languageLabels.hasTertiaryLanguage && (
                      <td data-label={languageLabels.tertiaryLanguage}>
                        {renderWordCell(word.tertiary)}
                      </td>
                    )}
                    {usesWordLevels && (
                      <td data-label="Level">{renderWordCell(word.level)}</td>
                    )}
                    <td data-label="Part">{renderWordCell(word.part_of_speech)}</td>
                    <td
                      data-label="Examples"
                      className="deck-editor-panel__cell--example"
                    >
                      {renderExamplesPreview(word)}
                    </td>
                    <td
                      data-label="Actions"
                      className="deck-editor-panel__cell--actions"
                    >
                      <div className="deck-editor-panel__table-actions">
                        <button
                          type="button"
                          data-word-id={word.id}
                          onClick={onEditClick}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="deck-editor-panel__button--danger"
                          data-word-id={word.id}
                          onClick={onDeleteClick}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <CardCatalogPagination pagination={pagination} />

          {previewWord && (
            <div className="deck-editor-panel__preview">
              <h4>Preview</h4>
              <p>
                <strong>{languageLabels.sourceLanguage}:</strong>{" "}
                {renderWordCell(previewWord.source)}
              </p>
              <p>
                <strong>{languageLabels.targetLanguage}:</strong>{" "}
                {renderWordCell(previewWord.target)}
              </p>
              {languageLabels.hasTertiaryLanguage && (
                <p>
                  <strong>{languageLabels.tertiaryLanguage}:</strong>{" "}
                  {renderWordCell(previewWord.tertiary)}
                </p>
              )}
              <p>
                <strong>Examples:</strong>
              </p>
              {resolveExamples(previewWord).length === 0 ? (
                <p>-</p>
              ) : (
                <ul className="deck-editor-panel__preview-list">
                  {resolveExamples(previewWord).map((example, index) => (
                    <li key={`${previewWord.id}-preview-example-${index}`}>{example}</li>
                  ))}
                </ul>
              )}
              <p>
                <strong>Tags:</strong> {renderWordTags(previewWord.tags)}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
});

DeckEditorWordsTableSection.displayName = "DeckEditorWordsTableSection";
