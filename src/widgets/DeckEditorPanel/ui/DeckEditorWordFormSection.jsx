import { memo } from "react";
import { FiEdit3, FiPlus, FiRotateCcw, FiSave } from "react-icons/fi";
import { useDeckEditorPanelContext } from "../model";

export const DeckEditorWordFormSection = memo(() => {
  const {
    wordDraft,
    editingWordId,
    languageLabels,
    usesWordLevels,
    levelOptions,
    partOfSpeechOptions,
    handleWordDraftChange,
    handleUpsertWordDraft,
    resetWordDraft,
  } = useDeckEditorPanelContext();

  return (
    <section className="deck-editor-panel__section">
      <header className="deck-editor-panel__section-header">
        <div className="deck-editor-panel__section-title">
          <span className="deck-editor-panel__section-icon" aria-hidden>
            {editingWordId ? <FiEdit3 /> : <FiPlus />}
          </span>
          <h3>{editingWordId ? "Edit word" : "Add words"}</h3>
        </div>
        <p>Add one word card at a time and keep quality high.</p>
      </header>

      <div className="deck-editor-panel__word-grid">
        <label className="deck-editor-panel__field">
          <span>{languageLabels.sourceLanguage}</span>
          <input
            type="text"
            name="source"
            value={wordDraft.source}
            onChange={handleWordDraftChange}
            placeholder={`Word in ${languageLabels.sourceLanguage}`}
          />
        </label>

        <label className="deck-editor-panel__field">
          <span>{languageLabels.targetLanguage}</span>
          <input
            type="text"
            name="target"
            value={wordDraft.target}
            onChange={handleWordDraftChange}
            placeholder={`Translation in ${languageLabels.targetLanguage}`}
          />
        </label>

        {languageLabels.hasTertiaryLanguage && (
          <label className="deck-editor-panel__field">
            <span>{languageLabels.tertiaryLanguage}</span>
            <input
              type="text"
              name="tertiary"
              value={wordDraft.tertiary}
              onChange={handleWordDraftChange}
              placeholder={`Optional in ${languageLabels.tertiaryLanguage}`}
            />
          </label>
        )}

        {usesWordLevels && (
          <label className="deck-editor-panel__field">
            <span>Level</span>
            <select
              name="level"
              value={wordDraft.level}
              onChange={handleWordDraftChange}
            >
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="deck-editor-panel__field">
          <span>Part of speech</span>
          <select
            name="part_of_speech"
            value={wordDraft.part_of_speech}
            onChange={handleWordDraftChange}
          >
            {partOfSpeechOptions.map((part) => (
              <option key={part} value={part}>
                {part}
              </option>
            ))}
          </select>
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide">
          <span>Examples</span>
          <textarea
            name="examplesInput"
            value={wordDraft.examplesInput}
            onChange={handleWordDraftChange}
            placeholder={"One example per line\nA short sentence with this word"}
            rows={4}
          />
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide">
          <span>Word tags (comma separated)</span>
          <input
            type="text"
            name="tagsInput"
            value={wordDraft.tagsInput}
            onChange={handleWordDraftChange}
            placeholder="school, grammar, php"
          />
        </label>
      </div>

      <div className="deck-editor-panel__word-actions">
        <button type="button" onClick={handleUpsertWordDraft}>
          {editingWordId ? <FiSave aria-hidden /> : <FiPlus aria-hidden />}
          <span>{editingWordId ? "Save word changes" : "Add word"}</span>
        </button>
        <button
          type="button"
          className="deck-editor-panel__button--secondary"
          onClick={resetWordDraft}
        >
          <FiRotateCcw aria-hidden />
          <span>Clear form</span>
        </button>
      </div>
    </section>
  );
});

DeckEditorWordFormSection.displayName = "DeckEditorWordFormSection";
