import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiClipboard, FiPlus, FiRotateCcw, FiTrash2, FiX } from "react-icons/fi";
import { WordImageField } from "@features/word-image-field";
import { QuickAddWordsDialog } from "@features/quick-add-words";
import { ConceptSuggestion, SparkIcon, SuggestionBar, useSuggestionSummary, useWordSuggestion } from "@features/word-suggest";
import { WordImage } from "@entities/word";
import { SearchField } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import { useDeckEditorPanelContext } from "../model";
import { WordDetailFields, WordSideFields, WordSubjectFields } from "./WordFields";

// A mouse and a keyboard mean the cursor can wait in the first field; on a
// phone that would open the keyboard over the page.
const hasFinePointer = () =>
  typeof window !== "undefined" && Boolean(window.matchMedia?.("(pointer: fine)").matches);

const focusFirstField = (form) => {
  form?.querySelector("input[type='text'], textarea")?.focus({ preventScroll: true });
};

const WordPicture = memo(({ word, fallbackAlt }) =>
  word.image ? (
    <span className="deck-word__picture">
      <WordImage image={word.image} alt={word.image.alt || fallbackAlt} variant="thumb" />
    </span>
  ) : (
    <span className="deck-word__text">—</span>
  ),
);

WordPicture.displayName = "WordPicture";

// ——— Adding ———

const WordComposer = memo(({ labels }) => {
  const {
    isEditMode,
    pictureSide,
    hasTertiary,
    deckForm,
    suggestDeck,
    levelOptions,
    partOfSpeechOptions,
    addDraft,
    addDraftDefaults,
    addError,
    handleAddDraftChange,
    handleAddDraftImageChange,
    handleAddDraftSubjectFieldChange,
    applyAddDraftPatch,
    submitAddDraft,
    subjectProfile,
  } = useDeckEditorPanelContext();
  const { t } = useI18n();
  const formRef = useRef(null);
  const detailsId = useId();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [autoFocus] = useState(() => isEditMode && hasFinePointer());
  const suggest = useWordSuggestion({
    draft: addDraft,
    deck: suggestDeck,
    defaults: addDraftDefaults,
    onFill: applyAddDraftPatch,
    // Suggestions are for subjects the assistant knows.
    enabled: subjectProfile.assistant?.entry === "word",
  });
  const summary = useSuggestionSummary(suggest);
  // Details the suggestion filled while they were folded away.
  const detailsInked = ["level", "part_of_speech", "examplesInput", "tagsInput"].filter((field) => suggest.inked.has(field)).length;

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();

      if (submitAddDraft(suggest.suggestedFields)) {
        focusFirstField(formRef.current);
      }
    },
    [submitAddDraft, suggest.suggestedFields],
  );

  const handleKeyDown = (event) => {
    suggest.handleKeyDown(event);
    if (!event.defaultPrevented && !event.nativeEvent.isComposing && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      handleSubmit(event);
    }
  };

  return (
    <form
      ref={formRef}
      className={`deck-composer${subjectProfile.entryText?.target.multiline ? " deck-composer--structured" : ""}`}
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate
    >
      <div className="deck-composer__main">
        <WordSideFields
          suggest={suggest}
          draft={addDraft}
          onChange={handleAddDraftChange}
          onImageChange={handleAddDraftImageChange}
          pictureSide={pictureSide}
          frontLabel={labels.front}
          backLabel={labels.back}
          tertiaryLabel={hasTertiary ? labels.tertiary : ""}
          frontPlaceholder={labels.frontPlaceholder}
          backPlaceholder={labels.backPlaceholder}
          autoFocus={autoFocus}
          multilineAnswer={subjectProfile.entryText?.target.multiline}
        >
          <WordSubjectFields fields={subjectProfile.entryFields} draft={addDraft} onSubjectFieldChange={handleAddDraftSubjectFieldChange} section="main" />
        </WordSideFields>
        <button type="submit" className="deck-composer__add">
          <FiPlus aria-hidden />
          <span>{t(subjectProfile.entryText?.addKey || "editor.addWord")}</span>
        </button>
      </div>
      <div className="deck-composer__foot">
        <button
          type="button"
          className="deck-composer__more"
          aria-expanded={isDetailsOpen}
          aria-controls={detailsId}
          onClick={() => setIsDetailsOpen((value) => !value)}
        >
          <FiChevronDown aria-hidden />
          <span>{t(isDetailsOpen ? "editor.lessDetails" : "editor.moreDetails")}</span>
          {!isDetailsOpen && detailsInked ? (
            <span className="deck-composer__filled" aria-label={t("suggest.detailsFilled", { count: detailsInked })}>
              <SparkIcon />
              {detailsInked}
            </span>
          ) : null}
        </button>
        {addError ? (
          <p className="deck-composer__error" role="alert">
            {addError}
          </p>
        ) : (
          <SuggestionBar suggest={suggest} summary={summary}>
            <p className="deck-composer__hint">{t(subjectProfile.entryText?.enterHintKey || "editor.enterHint")}</p>
          </SuggestionBar>
        )}
      </div>

      {!pictureSide && subjectProfile.media?.optionalImage ? <details className="deck-composer__image" open={addDraft.image ? true : undefined}>
        <summary>{t("studyPresentation.addImage")}</summary>
        <WordImageField value={addDraft.image} onChange={handleAddDraftImageChange} word={addDraft.source} isCompact />
      </details> : null}
      <ConceptSuggestion deck={suggestDeck} draft={addDraft} onApply={applyAddDraftPatch} />

      <div id={detailsId} hidden={!isDetailsOpen}>
        {isDetailsOpen ? (
          <WordDetailFields
            suggest={suggest}
            draft={addDraft}
            onChange={handleAddDraftChange}
            usesWordLevels={deckForm.usesWordLevels}
            usesLanguages={subjectProfile.usesLanguages}
            tagsLabelKey={subjectProfile.entryText?.tagsKey || "editor.wordTags"}
            levelOptions={levelOptions}
            partOfSpeechOptions={partOfSpeechOptions}
            examplesLabel={labels.examples}
            examplesPlaceholder={labels.examplesPlaceholder}
            subjectFields={subjectProfile.entryFields}
            onSubjectFieldChange={handleAddDraftSubjectFieldChange}
          />
        ) : null}
      </div>
    </form>
  );
});

WordComposer.displayName = "WordComposer";

// ——— Changing one word ———

const WordEditor = memo(({ word, labels }) => {
  const {
    pictureSide,
    hasTertiary,
    deckForm,
    suggestDeck,
    addDraftDefaults,
    levelOptions,
    partOfSpeechOptions,
    editDraft,
    editError,
    handleEditDraftChange,
    handleEditDraftImageChange,
    handleEditDraftSubjectFieldChange,
    applyEditDraftPatch,
    submitEditDraft,
    cancelEdit,
    deleteWord,
    subjectProfile,
  } = useDeckEditorPanelContext();
  const { t } = useI18n();
  const formRef = useRef(null);
  // The deck's defaults count as untouched here too: a word saved with the
  // default level A1 may still be offered the level it really has.
  const suggest = useWordSuggestion({
    draft: editDraft,
    deck: suggestDeck,
    defaults: addDraftDefaults,
    onFill: applyEditDraftPatch,
    enabled: subjectProfile.assistant?.entry === "word",
  });
  const summary = useSuggestionSummary(suggest);

  useEffect(() => {
    focusFirstField(formRef.current);
  }, []);

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      submitEditDraft();
    },
    [submitEditDraft],
  );

  const handleKeyDown = useCallback(
    (event) => {
      suggest.handleKeyDown(event);

      if (!event.defaultPrevented && !event.nativeEvent.isComposing && event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        handleSubmit(event);
      }

      if (event.key === "Escape" && !event.defaultPrevented) {
        event.stopPropagation();
        cancelEdit();
      }
    },
    [cancelEdit, handleSubmit, suggest],
  );

  return (
    <form ref={formRef} className="deck-word-editor" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
      <WordSideFields
        suggest={suggest}
        draft={editDraft}
        onChange={handleEditDraftChange}
        onImageChange={handleEditDraftImageChange}
        pictureSide={pictureSide}
        frontLabel={labels.front}
        backLabel={labels.back}
        tertiaryLabel={hasTertiary ? labels.tertiary : ""}
        frontPlaceholder={labels.frontPlaceholder}
        backPlaceholder={labels.backPlaceholder}
        multilineAnswer={subjectProfile.entryText?.target.multiline}
      >
        <WordSubjectFields
          fields={subjectProfile.entryFields}
          draft={editDraft}
          onSubjectFieldChange={handleEditDraftSubjectFieldChange}
          section="main"
        />
      </WordSideFields>
      <WordDetailFields
        suggest={suggest}
        draft={editDraft}
        onChange={handleEditDraftChange}
        usesWordLevels={deckForm.usesWordLevels}
        usesLanguages={subjectProfile.usesLanguages}
        tagsLabelKey={subjectProfile.entryText?.tagsKey || "editor.wordTags"}
        levelOptions={levelOptions}
        partOfSpeechOptions={partOfSpeechOptions}
        examplesLabel={labels.examples}
        examplesPlaceholder={labels.examplesPlaceholder}
        subjectFields={subjectProfile.entryFields}
        onSubjectFieldChange={handleEditDraftSubjectFieldChange}
      />
      {!pictureSide && subjectProfile.media?.optionalImage ? <details className="deck-composer__image" open={editDraft.image ? true : undefined}>
        <summary>{t("studyPresentation.addImage")}</summary>
        <WordImageField value={editDraft.image} onChange={handleEditDraftImageChange} word={editDraft.source} isCompact />
      </details> : null}
      <ConceptSuggestion deck={suggestDeck} draft={editDraft} onApply={applyEditDraftPatch} />
      {editError ? (
        <p className="deck-composer__error" role="alert">
          {editError}
        </p>
      ) : (
        <SuggestionBar suggest={suggest} summary={summary} />
      )}
      <div className="deck-word-editor__actions">
        <button type="submit" className="deck-editor__button deck-editor__button--primary">
          <FiCheck aria-hidden />
          <span>{t("editor.saveWord")}</span>
        </button>
        <button type="button" className="deck-editor__button" onClick={cancelEdit}>
          <FiX aria-hidden />
          <span>{t("common.cancel")}</span>
        </button>
        <button type="button" className="deck-editor__button deck-editor__button--danger" onClick={() => deleteWord(word)}>
          <FiTrash2 aria-hidden />
          <span>{t("common.delete")}</span>
        </button>
      </div>
    </form>
  );
});

WordEditor.displayName = "WordEditor";

// ——— The list ———

const WordRow = memo(({ word, labels, pictureSide, entryFields, isEditing, onEdit, onDelete }) => {
  const { t, partOfSpeechName } = useI18n();
  const name = word.source || word.image?.alt || word.target || "—";

  if (isEditing) {
    return (
      <li className="deck-word deck-word--editing">
        <WordEditor word={word} labels={labels} />
      </li>
    );
  }

  // A subject's values from a fixed list (a difficulty) join the meta.
  const subjectMeta = Object.entries(entryFields || {})
    .filter(([key, spec]) => spec.type === "choice" && !spec.attachedTo && word.subjectFields?.[key])
    .map(([key, spec]) => t(`${spec.valueKey}.${word.subjectFields[key]}`));
  const meta = [word.level, word.part_of_speech && partOfSpeechName(word.part_of_speech), ...subjectMeta]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="deck-word">
      <button
        type="button"
        className="deck-word__open"
        onClick={() => onEdit(word)}
        aria-label={t("editor.editNamed", { word: name })}
      >
        <span className="deck-word__side">
          {pictureSide === "source" ? (
            <WordPicture word={word} fallbackAlt={word.target} />
          ) : (
            <span className="deck-word__text">{word.source}</span>
          )}
        </span>
        <span className="deck-word__side deck-word__side--back">
          {pictureSide === "target" ? (
            <WordPicture word={word} fallbackAlt={word.source} />
          ) : (
            <span className="deck-word__text">{word.target}</span>
          )}
          {meta ? <span className="deck-word__meta">{meta}</span> : null}
        </span>
        {/* The extra language has a column of its own. */}
        {labels.tertiary ? (
          <span className={`deck-word__side deck-word__side--extra${word.tertiary ? "" : " is-empty"}`}>
            <span className="deck-word__text">{word.tertiary || "—"}</span>
          </span>
        ) : null}
      </button>
      <button
        type="button"
        className="deck-word__delete"
        onClick={() => onDelete(word)}
        aria-label={t("editor.deleteNamed", { word: name })}
        title={t("common.delete")}
      >
        <FiTrash2 aria-hidden />
      </button>
    </li>
  );
});

WordRow.displayName = "WordRow";

export const DeckEditorWordsSection = memo(({ labels }) => {
  const {
    isEditMode,
    deckId,
    pictureSide,
    totalWords,
    filteredCount,
    visibleWords,
    hasMoreWords,
    showMoreWords,
    wordsQuery,
    handleWordsQueryChange,
    editingWordId,
    startEditWord,
    deleteWord,
    lastDeleted,
    undoDelete,
    isPasteOpen,
    openPaste,
    closePaste,
    subjectProfile,
  } = useDeckEditorPanelContext();
  const { t } = useI18n();
  const headingId = useId();
  const clearQuery = useCallback(
    () => handleWordsQueryChange({ target: { value: "" } }),
    [handleWordsQueryChange],
  );
  // A pasted list is words of a language; a picture deck, or a deck about
  // something else, takes its entries one by one.
  const canPaste = isEditMode && !pictureSide && subjectProfile.usesLanguages;
  const deletedName = lastDeleted
    ? lastDeleted.word.source || lastDeleted.word.image?.alt || lastDeleted.word.target
    : "";

  return (
    <section className="deck-editor__words" aria-labelledby={headingId}>
      <header className="deck-editor__words-head">
        <h3 id={headingId}>
          {t(subjectProfile.entryText?.listKey || "editor.wordsTable")}
          <span className="deck-editor__count">{totalWords}</span>
        </h3>
        {canPaste ? (
          <button type="button" className="deck-editor__button deck-editor__button--quiet" onClick={openPaste} aria-haspopup="dialog">
            <FiClipboard aria-hidden />
            <span>{t("quickAdd.tabs.list")}</span>
          </button>
        ) : null}
      </header>

      <WordComposer labels={labels} />

      {lastDeleted ? (
        <div className="deck-editor__undo" role="status">
          <span>{t("editor.status.deleted", { word: deletedName || "—" })}</span>
          <button type="button" onClick={undoDelete}>
            <FiRotateCcw aria-hidden />
            <span>{t("quickAdd.undo")}</span>
          </button>
        </div>
      ) : null}

      {totalWords > 8 ? (
        <SearchField
          value={wordsQuery}
          onChange={handleWordsQueryChange}
          onClear={clearQuery}
          placeholder={t("editor.searchPlaceholder")}
          className="deck-editor__search"
        />
      ) : null}

      {totalWords === 0 ? (
        <p className="deck-editor__empty">{t(subjectProfile.entryText?.emptyKey || (isEditMode ? "editor.empty" : "editor.emptyNew"))}</p>
      ) : filteredCount === 0 ? (
        <p className="deck-editor__empty">{t("editor.noMatches", { query: wordsQuery.trim() })}</p>
      ) : (
        <>
          <div className={`deck-words__columns${labels.tertiary ? " has-extra" : ""}`} aria-hidden>
            <span>{labels.front}</span>
            <span>{labels.back}</span>
            {labels.tertiary ? <span>{labels.tertiary}</span> : null}
          </div>
          <ul className={`deck-words${labels.tertiary ? " has-extra" : ""}`}>
            {visibleWords.map((word) => (
              <WordRow
                key={word.externalId}
                word={word}
                labels={labels}
                pictureSide={pictureSide}
                entryFields={subjectProfile.entryFields}
                isEditing={editingWordId === word.externalId}
                onEdit={startEditWord}
                onDelete={deleteWord}
              />
            ))}
          </ul>
          {hasMoreWords ? (
            <button type="button" className="deck-editor__more" onClick={showMoreWords}>
              {t("editor.showMore", { shown: visibleWords.length, total: filteredCount })}
            </button>
          ) : null}
        </>
      )}

      {isPasteOpen ? (
        <QuickAddWordsDialog initialDeckId={deckId} initialTab="list" onClose={closePaste} />
      ) : null}
    </section>
  );
});

DeckEditorWordsSection.displayName = "DeckEditorWordsSection";
