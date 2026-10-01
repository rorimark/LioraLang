import { memo, useCallback, useEffect, useId, useRef, useState } from "react";
import { FiCheck, FiChevronDown, FiClipboard, FiPlus, FiRotateCcw, FiTrash2, FiX } from "react-icons/fi";
import { QuickAddWordsDialog } from "@features/quick-add-words";
import { WordImage } from "@entities/word";
import { SearchField } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import { useDeckEditorPanelContext } from "../model";
import { WordDetailFields, WordSideFields } from "./WordFields";

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
    levelOptions,
    partOfSpeechOptions,
    addDraft,
    addError,
    handleAddDraftChange,
    handleAddDraftImageChange,
    submitAddDraft,
  } = useDeckEditorPanelContext();
  const { t } = useI18n();
  const formRef = useRef(null);
  const detailsId = useId();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [autoFocus] = useState(() => isEditMode && hasFinePointer());

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();

      if (submitAddDraft()) {
        focusFirstField(formRef.current);
      }
    },
    [submitAddDraft],
  );

  return (
    <form ref={formRef} className="deck-composer" onSubmit={handleSubmit} noValidate>
      <div className="deck-composer__main">
        <WordSideFields
          draft={addDraft}
          onChange={handleAddDraftChange}
          onImageChange={handleAddDraftImageChange}
          pictureSide={pictureSide}
          frontLabel={labels.front}
          backLabel={labels.back}
          tertiaryLabel={hasTertiary ? labels.tertiary : ""}
          autoFocus={autoFocus}
        />
        <button type="submit" className="deck-composer__add">
          <FiPlus aria-hidden />
          <span>{t("editor.addWord")}</span>
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
        </button>
        {addError ? (
          <p className="deck-composer__error" role="alert">
            {addError}
          </p>
        ) : (
          <p className="deck-composer__hint">{t("editor.enterHint")}</p>
        )}
      </div>

      <div id={detailsId} hidden={!isDetailsOpen}>
        {isDetailsOpen ? (
          <WordDetailFields
            draft={addDraft}
            onChange={handleAddDraftChange}
            usesWordLevels={deckForm.usesWordLevels}
            levelOptions={levelOptions}
            partOfSpeechOptions={partOfSpeechOptions}
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
    levelOptions,
    partOfSpeechOptions,
    editDraft,
    editError,
    handleEditDraftChange,
    handleEditDraftImageChange,
    submitEditDraft,
    cancelEdit,
    deleteWord,
  } = useDeckEditorPanelContext();
  const { t } = useI18n();
  const formRef = useRef(null);

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
      if (event.key === "Escape") {
        event.stopPropagation();
        cancelEdit();
      }
    },
    [cancelEdit],
  );

  return (
    <form ref={formRef} className="deck-word-editor" onSubmit={handleSubmit} onKeyDown={handleKeyDown} noValidate>
      <WordSideFields
        draft={editDraft}
        onChange={handleEditDraftChange}
        onImageChange={handleEditDraftImageChange}
        pictureSide={pictureSide}
        frontLabel={labels.front}
        backLabel={labels.back}
        tertiaryLabel={hasTertiary ? labels.tertiary : ""}
      />
      <WordDetailFields
        draft={editDraft}
        onChange={handleEditDraftChange}
        usesWordLevels={deckForm.usesWordLevels}
        levelOptions={levelOptions}
        partOfSpeechOptions={partOfSpeechOptions}
      />
      {editError ? (
        <p className="deck-composer__error" role="alert">
          {editError}
        </p>
      ) : null}
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

const WordRow = memo(({ word, labels, pictureSide, isEditing, onEdit, onDelete }) => {
  const { t, partOfSpeechName } = useI18n();
  const name = word.source || word.image?.alt || word.target || "—";

  if (isEditing) {
    return (
      <li className="deck-word deck-word--editing">
        <WordEditor word={word} labels={labels} />
      </li>
    );
  }

  const meta = [word.level, word.part_of_speech && partOfSpeechName(word.part_of_speech)]
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
          {labels.tertiary && word.tertiary ? (
            <span className="deck-word__tertiary">{word.tertiary}</span>
          ) : null}
          {meta ? <span className="deck-word__meta">{meta}</span> : null}
        </span>
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
  } = useDeckEditorPanelContext();
  const { t } = useI18n();
  const headingId = useId();
  const clearQuery = useCallback(
    () => handleWordsQueryChange({ target: { value: "" } }),
    [handleWordsQueryChange],
  );
  // A pasted list is text; a picture deck takes its words one by one.
  const canPaste = isEditMode && !pictureSide;
  const deletedName = lastDeleted
    ? lastDeleted.word.source || lastDeleted.word.image?.alt || lastDeleted.word.target
    : "";

  return (
    <section className="deck-editor__words" aria-labelledby={headingId}>
      <header className="deck-editor__words-head">
        <h3 id={headingId}>
          {t("editor.wordsTable")}
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
        <p className="deck-editor__empty">{t(isEditMode ? "editor.empty" : "editor.emptyNew")}</p>
      ) : filteredCount === 0 ? (
        <p className="deck-editor__empty">{t("editor.noMatches", { query: wordsQuery.trim() })}</p>
      ) : (
        <>
          <div className="deck-words__columns" aria-hidden>
            <span>{labels.front}</span>
            <span>{labels.back}</span>
          </div>
          <ul className="deck-words">
            {visibleWords.map((word) => (
              <WordRow
                key={word.externalId}
                word={word}
                labels={labels}
                pictureSide={pictureSide}
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
