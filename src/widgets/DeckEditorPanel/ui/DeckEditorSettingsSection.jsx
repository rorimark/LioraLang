import { memo } from "react";
import { useDeckEditorPanelContext } from "../model";

export const DeckEditorSettingsSection = memo(() => {
  const {
    deckForm,
    languageOptions,
    words,
    handleDeckFormChange,
  } = useDeckEditorPanelContext();

  return (
    <section className="deck-editor-panel__section">
      <header className="deck-editor-panel__section-header">
        <h3>Deck settings</h3>
        <p>Define deck name and translation directions.</p>
      </header>

      <div className="deck-editor-panel__settings-grid">
        <label className="deck-editor-panel__field">
          <span>Deck name</span>
          <input
            type="text"
            name="name"
            value={deckForm.name}
            onChange={handleDeckFormChange}
            placeholder="Everyday Phrases"
          />
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide">
          <span>Description</span>
          <input
            type="text"
            name="description"
            value={deckForm.description}
            onChange={handleDeckFormChange}
            placeholder="Short summary of what this deck is for"
          />
        </label>

        <label className="deck-editor-panel__field">
          <span>Source language</span>
          <select
            name="sourceLanguage"
            value={deckForm.sourceLanguage}
            onChange={handleDeckFormChange}
          >
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label className="deck-editor-panel__field">
          <span>Target language</span>
          <select
            name="targetLanguage"
            value={deckForm.targetLanguage}
            onChange={handleDeckFormChange}
          >
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label className="deck-editor-panel__field">
          <span>Optional language</span>
          <select
            name="tertiaryLanguage"
            value={deckForm.tertiaryLanguage}
            onChange={handleDeckFormChange}
          >
            <option value="">None</option>
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide deck-editor-panel__field--toggle">
          <span>Word levels</span>
          <span className="deck-editor-panel__toggle">
            <input
              type="checkbox"
              name="usesWordLevels"
              checked={deckForm.usesWordLevels}
              onChange={handleDeckFormChange}
            />
            <span className="deck-editor-panel__toggle-copy">
              <strong>Enable CEFR levels</strong>
              <small>Show and edit word difficulty levels for this deck.</small>
            </span>
          </span>
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide">
          <span>Tags (comma separated)</span>
          <input
            type="text"
            name="tagsInput"
            value={deckForm.tagsInput}
            onChange={handleDeckFormChange}
            placeholder="travel, phrasal verbs, business"
          />
        </label>
      </div>

      <p className="deck-editor-panel__section-meta">{words.length} words in deck</p>
    </section>
  );
});

DeckEditorSettingsSection.displayName = "DeckEditorSettingsSection";
