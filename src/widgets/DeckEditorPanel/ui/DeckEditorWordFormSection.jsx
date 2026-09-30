import { memo, useState } from "react";
import { FiEdit3, FiPlus, FiRotateCcw, FiSave } from "react-icons/fi";
import { QuickAddWordsDialog } from "@features/quick-add-words";
import { WordImageField } from "@features/word-image-field";
import { useDeckEditorPanelContext } from "../model";
import { Select } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";

export const WORD_FORM_ID = "deck-editor-word-form";

// A saved deck takes new words through the add dialog, which stores each
// card at once. The form below is for changing one word, and for the words
// of a deck that does not exist yet.
const QuickAddSection = memo(() => {
  const { deckId, handleQuickAddWords } = useDeckEditorPanelContext();
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section id={WORD_FORM_ID} className="deck-editor-panel__section deck-editor-panel__quick-add">
      <header className="deck-editor-panel__section-header">
        <div className="deck-editor-panel__section-title">
          <span className="deck-editor-panel__section-icon" aria-hidden>
            <FiPlus />
          </span>
          <h3>{t("editor.addWords")}</h3>
        </div>
      </header>
      <p className="deck-editor-panel__quick-add-text">{t("quickAdd.editorHint")}</p>
      <div className="deck-editor-panel__word-actions">
        <button type="button" onClick={() => setIsOpen(true)} aria-haspopup="dialog">
          <FiPlus aria-hidden />
          <span>{t("quickAdd.open")}</span>
        </button>
      </div>
      {isOpen ? (
        <QuickAddWordsDialog
          initialDeckId={deckId}
          onWordsAdded={handleQuickAddWords}
          onClose={() => setIsOpen(false)}
        />
      ) : null}
    </section>
  );
});

QuickAddSection.displayName = "QuickAddSection";

export const DeckEditorWordFormSection = memo(() => {
  const {
    deckId,
    wordDraft,
    editingWordId,
    languageLabels,
    usesWordLevels,
    levelOptions,
    partOfSpeechOptions,
    handleWordDraftChange,
    handleWordDraftImageChange,
    handleUpsertWordDraft,
    resetWordDraft,
  } = useDeckEditorPanelContext();
  const { t, languageName, partOfSpeechName } = useI18n();

  if (deckId && !editingWordId) {
    return <QuickAddSection />;
  }

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
        {/* A picture side takes a picture where a language side takes a word. */}
        {languageLabels.pictureSide === "source" ? (
          <WordImageField
            value={wordDraft.image}
            onChange={handleWordDraftImageChange}
            word={wordDraft.target}
            isRequired
          />
        ) : (
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
        )}

        {languageLabels.pictureSide === "target" ? (
          <WordImageField
            value={wordDraft.image}
            onChange={handleWordDraftImageChange}
            word={wordDraft.source}
            isRequired
          />
        ) : (
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
        )}

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
              <option value="">{t("quickAdd.notSet")}</option>
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
            <option value="">{t("quickAdd.notSet")}</option>
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
