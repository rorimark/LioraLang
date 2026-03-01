import { memo, useCallback } from "react";
import { CardCatalogPagination } from "@features/card-catalog";
import { useDeckEditorPanelContext } from "../model";

const renderWordCell = (value) => {
  return value ? value : "-";
};

export const DeckEditorWordsTableSection = memo(() => {
  const {
    words,
    paginatedWords,
    previewWord,
    languageLabels,
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
                  <th>Level</th>
                  <th>Part</th>
                  <th>Example</th>
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
                    <td data-label="Level">{renderWordCell(word.level)}</td>
                    <td data-label="Part">{renderWordCell(word.part_of_speech)}</td>
                    <td
                      data-label="Example"
                      className="deck-editor-panel__cell--example"
                    >
                      {renderWordCell(word.example)}
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

          <CardCatalogPagination
            currentPage={wordsPage}
            totalPages={wordsTotalPages}
            pageSize={wordsPageSize}
            pageSizeOptions={wordsPageSizeOptions}
            totalItems={words.length}
            rangeStart={wordsRangeStart}
            rangeEnd={wordsRangeEnd}
            onPageChange={handleWordsPageChange}
            onPageSizeChange={handleWordsPageSizeChange}
          />

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
                <strong>Example:</strong> {renderWordCell(previewWord.example)}
              </p>
            </div>
          )}
        </>
      )}
    </section>
  );
});

DeckEditorWordsTableSection.displayName = "DeckEditorWordsTableSection";
