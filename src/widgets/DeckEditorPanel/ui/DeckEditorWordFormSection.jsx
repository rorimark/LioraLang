import { memo } from "react";
import { FiEdit3, FiPlus, FiRotateCcw, FiSave } from "react-icons/fi";
import { useDeckEditorPanelContext } from "../model";
import { Select } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";

export const WORD_FORM_ID = "deck-editor-word-form";

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
  const { t, languageName, partOfSpeechName } = useI18n();

  return (
    <section id={WORD_FORM_ID} className="deck-editor-panel__section">
      <header className="deck-editor-panel__section-header">
        <div className="deck-editor-panel__section-title">
          <span className="deck-editor-panel__section-icon" aria-hidden>
            {editingWordId ? <FiEdit3 /> : <FiPlus />}
          </span>
          <h3>{editingWordId ? t("editor.editWord") : t("editor.addWords")}</h3>
        </div>
      </header>

      <div className="deck-editor-panel__word-grid">
        <label className="deck-editor-panel__field">
          <span>{languageName(languageLabels.sourceLanguage)}</span>
          <input
            type="text"
            name="source"
            value={wordDraft.source}
            onChange={handleWordDraftChange}
            placeholder={t("editor.wordPlaceholder")}
          />
        </label>

        <label className="deck-editor-panel__field">
          <span>{languageName(languageLabels.targetLanguage)}</span>
          <input
            type="text"
            name="target"
            value={wordDraft.target}
            onChange={handleWordDraftChange}
            placeholder={t("editor.translationPlaceholder")}
          />
        </label>

        {languageLabels.hasTertiaryLanguage && (
          <label className="deck-editor-panel__field">
            <span>{languageName(languageLabels.tertiaryLanguage)}</span>
            <input
              type="text"
              name="tertiary"
              value={wordDraft.tertiary}
              onChange={handleWordDraftChange}
              placeholder={t("editor.optionalPlaceholder")}
            />
          </label>
        )}

        {usesWordLevels && (
          <label className="deck-editor-panel__field">
            <span>{t("catalog.level")}</span>
            <Select
              name="level"
              value={wordDraft.level}
              onChange={handleWordDraftChange}
            >
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </label>
        )}

        <label className="deck-editor-panel__field">
          <span>{t("catalog.partOfSpeech")}</span>
          <Select
            name="part_of_speech"
            value={wordDraft.part_of_speech}
            onChange={handleWordDraftChange}
          >
            {partOfSpeechOptions.map((part) => (
              <option key={part} value={part}>
                {partOfSpeechName(part)}
              </option>
            ))}
          </Select>
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide">
          <span>{t("flashcard.examples")}</span>
          <textarea
            name="examplesInput"
            value={wordDraft.examplesInput}
            onChange={handleWordDraftChange}
            placeholder={t("editor.examplesPlaceholder")}
            rows={4}
          />
        </label>

        <label className="deck-editor-panel__field deck-editor-panel__field--wide">
          <span>{t("editor.wordTags")}</span>
          <input
            type="text"
            name="tagsInput"
            value={wordDraft.tagsInput}
            onChange={handleWordDraftChange}
            placeholder={t("editor.wordTagsPlaceholder")}
          />
        </label>
      </div>

      <div className="deck-editor-panel__word-actions">
        <button type="button" onClick={handleUpsertWordDraft}>
          {editingWordId ? <FiSave aria-hidden /> : <FiPlus aria-hidden />}
          <span>{editingWordId ? t("editor.saveWord") : t("editor.addWord")}</span>
        </button>
        <button
          type="button"
          className="deck-editor-panel__button--secondary"
          onClick={resetWordDraft}
        >
          <FiRotateCcw aria-hidden />
          <span>{t("editor.clearForm")}</span>
        </button>
      </div>
    </section>
  );
});

DeckEditorWordFormSection.displayName = "DeckEditorWordFormSection";
