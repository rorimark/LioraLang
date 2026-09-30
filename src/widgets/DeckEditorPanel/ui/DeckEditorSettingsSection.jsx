import { memo } from "react";
import { FiBookOpen, FiSettings } from "react-icons/fi";
import { useDeckEditorPanelContext } from "../model";
import { Select, SettingSegmented } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";

// One side of the deck: a language from the list, or pictures. Pictures
// are a choice of their own beside the list, never one of its languages.
const DeckSideField = memo(({ side, label, languageName: languageField, value, isPicture, languageOptions, onLanguageChange, onSideTypeChange }) => {
  const { t, languageName } = useI18n();

  return (
    <div className="deck-editor-panel__field deck-editor-panel__side">
      <span className="deck-editor-panel__side-head">
        <span>{label}</span>
        <SettingSegmented
          name={`${side}SideType`}
          value={isPicture ? "picture" : "language"}
          ariaLabel={label}
          onChange={(event) => onSideTypeChange(side, event.target.value === "picture")}
          options={[
            { value: "language", label: t("editor.side.language") },
            { value: "picture", label: t("media.label") },
          ]}
        />
      </span>
      {isPicture ? (
        <p className="deck-editor-panel__side-note">{t("editor.side.pictureHint")}</p>
      ) : (
        <Select name={languageField} value={value} onChange={onLanguageChange} label={label}>
          {languageOptions.map((language) => (
            <option key={language} value={language}>
              {languageName(language)}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
});

DeckSideField.displayName = "DeckSideField";

export const DeckEditorSettingsSection = memo(() => {
  const {
    deckForm,
    languageOptions,
    words,
    handleDeckFormChange,
    handleSideTypeChange,
  } = useDeckEditorPanelContext();
  const { t, languageName } = useI18n();

  return (
    <section className="deck-editor-panel__section">
      <header className="deck-editor-panel__section-header">
        <div className="deck-editor-panel__section-title">
          <span className="deck-editor-panel__section-icon" aria-hidden>
            <FiSettings />
          </span>
          <h3>{t("editor.settings")}</h3>
        </div>
      </header>

      <div className="deck-editor-panel__settings-grid">
        <label className="deck-editor-panel__field">
          <span>{t("renameDeck.label")}</span>
          <input
            type="text"
            name="name"
            value={deckForm.name}
            onChange={handleDeckFormChange}
            placeholder={t("editor.namePlaceholder")}
          />
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide">
          <span>{t("editor.description")}</span>
          <input
            type="text"
            name="description"
            value={deckForm.description}
            onChange={handleDeckFormChange}
            placeholder={t("editor.descriptionPlaceholder")}
          />
        </label>

        <DeckSideField
          side="source"
          label={t("import.file.source")}
          languageName="sourceLanguage"
          value={deckForm.sourceLanguage}
          isPicture={deckForm.pictureSide === "source"}
          languageOptions={languageOptions}
          onLanguageChange={handleDeckFormChange}
          onSideTypeChange={handleSideTypeChange}
        />

        <DeckSideField
          side="target"
          label={t("import.file.target")}
          languageName="targetLanguage"
          value={deckForm.targetLanguage}
          isPicture={deckForm.pictureSide === "target"}
          languageOptions={languageOptions}
          onLanguageChange={handleDeckFormChange}
          onSideTypeChange={handleSideTypeChange}
        />

        <label className="deck-editor-panel__field">
          <span>{t("import.file.optional")}</span>
          <Select
            name="tertiaryLanguage"
            value={deckForm.tertiaryLanguage}
            onChange={handleDeckFormChange}
          >
            <option value="">{t("common.none")}</option>
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                {languageName(language)}
              </option>
            ))}
          </Select>
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide deck-editor-panel__field--toggle">
          <span>{t("editor.wordLevels")}</span>
          <span className="deck-editor-panel__toggle">
            <input
              type="checkbox"
              name="usesWordLevels"
              checked={deckForm.usesWordLevels}
              onChange={handleDeckFormChange}
            />
            <span className="deck-editor-panel__toggle-copy">
              <strong>{t("editor.enableLevels")}</strong>
            </span>
          </span>
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide">
          <span>{t("editor.tags")}</span>
          <input
            type="text"
            name="tagsInput"
            value={deckForm.tagsInput}
            onChange={handleDeckFormChange}
            placeholder={t("editor.tagsPlaceholder")}
          />
        </label>
      </div>

      <p className="deck-editor-panel__section-meta">
        <FiBookOpen aria-hidden />
        <span>{t("editor.wordsInDeck", { count: words.length })}</span>
      </p>
    </section>
  );
});

DeckEditorSettingsSection.displayName = "DeckEditorSettingsSection";
