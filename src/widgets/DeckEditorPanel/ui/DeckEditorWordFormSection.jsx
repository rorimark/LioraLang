import { memo } from "react";
import { useDeckEditorPanelContext } from "../model";

export const DeckEditorWordFormSection = memo(() => {
  const {
    wordDraft,
    editingWordId,
    languageLabels,
    levelOptions,
    partOfSpeechOptions,
    handleWordDraftChange,
    handleUpsertWordDraft,
    resetWordDraft,
  } = useDeckEditorPanelContext();

  return (
    <section className="deck-editor-panel__section">
      <header className="deck-editor-panel__section-header">
        <h3>{editingWordId ? "Edit word" : "Add words"}</h3>
        <p>Add one word card at a time and keep quality high.</p>
      </header>

      <div className="deck-editor-panel__word-grid">
        <label className="deck-editor-panel__field">
          <span>{languageLabels.sourceLanguage}</span>
          <input
            type="text"
            name="eng"
            value={wordDraft.eng}
            onChange={handleWordDraftChange}
            placeholder={`Word in ${languageLabels.sourceLanguage}`}
          />
        </label>

        <label className="deck-editor-panel__field">
          <span>{languageLabels.targetLanguage}</span>
          <input
            type="text"
            name="ru"
            value={wordDraft.ru}
            onChange={handleWordDraftChange}
            placeholder={`Translation in ${languageLabels.targetLanguage}`}
          />
        </label>

        {languageLabels.hasTertiaryLanguage && (
          <label className="deck-editor-panel__field">
            <span>{languageLabels.tertiaryLanguage}</span>
            <input
              type="text"
              name="pl"
              value={wordDraft.pl}
              onChange={handleWordDraftChange}
              placeholder={`Optional in ${languageLabels.tertiaryLanguage}`}
            />
          </label>
        )}

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
          <span>Example</span>
          <input
            type="text"
            name="example"
            value={wordDraft.example}
            onChange={handleWordDraftChange}
            placeholder="A short sentence with this word"
          />
        </label>
      </div>

      <div className="deck-editor-panel__word-actions">
        <button type="button" onClick={handleUpsertWordDraft}>
          {editingWordId ? "Save word changes" : "Add word"}
        </button>
        <button
          type="button"
          className="deck-editor-panel__button--secondary"
          onClick={resetWordDraft}
        >
          Clear form
        </button>
      </div>
    </section>
  );
});

DeckEditorWordFormSection.displayName = "DeckEditorWordFormSection";
