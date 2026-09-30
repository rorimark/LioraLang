import { memo, useCallback, useId, useRef, useState } from "react";
import { FiAlertTriangle, FiChevronDown, FiCornerDownLeft, FiRepeat, FiTrash2, FiX } from "react-icons/fi";
import { Button, Select } from "@shared/ui";
import { useDialogA11y } from "@shared/lib/a11y";
import { useI18n } from "@shared/lib/i18n";
import {
  DUPLICATE_KIND,
  LEVEL_OPTIONS,
  NEW_DECK_VALUE,
  PART_OF_SPEECH_OPTIONS,
  ROW_STATUS,
  useQuickAddWords,
} from "../model";
import "./QuickAddWordsDialog.css";

const DeckPicker = memo(({ model }) => {
  const { t, languageName } = useI18n();

  return (
    <div className="quick-add__deck">
      <div className="quick-add__deck-row">
        <label className="quick-add__deck-label" htmlFor="quick-add-deck">
          {t("quickAdd.deck")}
        </label>
        <span className="quick-add__deck-select">
          <Select
            id="quick-add-deck"
            label={t("quickAdd.deck")}
            value={model.deckChoice}
            onChange={model.handleDeckChoiceChange}
            disabled={model.isSaving}
          >
            {model.decks.map((deck) => (
              <option key={deck.id} value={String(deck.id)}>
                {deck.name}
              </option>
            ))}
            {model.selectedDeck && !model.decks.some((deck) => deck.id === model.selectedDeck.id) ? (
              <option value={String(model.selectedDeck.id)}>{model.selectedDeck.name}</option>
            ) : null}
            <option value={NEW_DECK_VALUE}>{t("quickAdd.newDeck")}</option>
          </Select>
        </span>
        {model.selectedDeck ? (
          <span className="quick-add__languages">
            {t("quickAdd.direction", {
              from: languageName(model.languages.sourceLanguage),
              to: languageName(model.languages.targetLanguage),
            })}
          </span>
        ) : null}
      </div>

      {model.isNewDeck ? (
        <div className="quick-add__new-deck">
          <label className="quick-add__field quick-add__field--wide">
            <span>{t("quickAdd.deckName")}</span>
            <input
              name="name"
              value={model.newDeck.name}
              onChange={model.handleNewDeckChange}
              placeholder={t("quickAdd.deckNamePlaceholder")}
              autoComplete="off"
            />
          </label>
          <label className="quick-add__field">
            <span>{t("quickAdd.wordsIn")}</span>
            <Select name="sourceLanguage" value={model.newDeck.sourceLanguage} onChange={model.handleNewDeckChange}>
              {model.languageOptions.map((language) => (
                <option key={language} value={language}>
                  {languageName(language)}
                </option>
              ))}
            </Select>
          </label>
          <label className="quick-add__field">
            <span>{t("quickAdd.translationsIn")}</span>
            <Select name="targetLanguage" value={model.newDeck.targetLanguage} onChange={model.handleNewDeckChange}>
              {model.languageOptions.map((language) => (
                <option key={language} value={language}>
                  {languageName(language)}
                </option>
              ))}
            </Select>
          </label>
          <p className="quick-add__hint">{t("quickAdd.newDeckHint")}</p>
        </div>
      ) : null}
    </div>
  );
});

DeckPicker.displayName = "DeckPicker";

const DuplicateHint = memo(({ duplicate }) => {
  const { t } = useI18n();

  if (duplicate.kind === DUPLICATE_KIND.exact) {
    const [match] = duplicate.matches;
    return (
      <p className="quick-add__duplicate quick-add__duplicate--exact">
        <FiAlertTriangle aria-hidden="true" />
        {t("quickAdd.duplicate.exact", { word: match.source, translation: match.target })}
      </p>
    );
  }

  if (duplicate.kind === DUPLICATE_KIND.otherMeaning) {
    return (
      <p className="quick-add__duplicate">
        {t("quickAdd.duplicate.otherMeaning", {
          translations: duplicate.matches.map((match) => match.target || "—").join(", "),
        })}
      </p>
    );
  }

  return null;
});

DuplicateHint.displayName = "DuplicateHint";

const SingleWordForm = memo(({ model, sourceInputRef }) => {
  const { t, languageName, partOfSpeechName } = useI18n();
  const detailsId = useId();
  const { languages } = model;

  const handleDetailsKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        void model.addDraft();
      }
    },
    [model],
  );

  return (
    <form
      className="quick-add__form"
      onSubmit={(event) => {
        event.preventDefault();
        void model.addDraft();
      }}
    >
      <div className="quick-add__pair">
        <label className="quick-add__field">
          <span>{languageName(languages.sourceLanguage)}</span>
          <input
            ref={sourceInputRef}
            name="source"
            value={model.draft.source}
            onChange={model.handleDraftChange}
            onKeyDown={model.handleSourceKeyDown}
            onPaste={model.handleSourcePaste}
            placeholder={t("quickAdd.wordPlaceholder")}
            autoComplete="off"
            autoCapitalize="none"
            enterKeyHint="next"
            data-autofocus
          />
        </label>
        <label className="quick-add__field">
          <span>{languageName(languages.targetLanguage)}</span>
          <input
            name="target"
            value={model.draft.target}
            onChange={model.handleDraftChange}
            onKeyDown={model.handleTargetKeyDown}
            placeholder={t("quickAdd.translationPlaceholder")}
            autoComplete="off"
            autoCapitalize="none"
            enterKeyHint="done"
          />
        </label>
      </div>

      <div aria-live="polite">
        <DuplicateHint duplicate={model.draftDuplicate} />
      </div>

      <button
        type="button"
        className="quick-add__details-toggle"
        aria-expanded={model.isDetailsOpen}
        aria-controls={detailsId}
        onClick={() => model.setIsDetailsOpen(!model.isDetailsOpen)}
      >
        <FiChevronDown aria-hidden="true" />
        {t("quickAdd.details")}
        <span className="quick-add__optional">{t("quickAdd.optional")}</span>
      </button>

      {model.isDetailsOpen ? (
        <div className="quick-add__details" id={detailsId}>
          {languages.tertiaryLanguage ? (
            <label className="quick-add__field quick-add__field--wide">
              <span>{languageName(languages.tertiaryLanguage)}</span>
              <input
                name="tertiary"
                value={model.details.tertiary}
                onChange={model.handleDetailsChange}
                autoComplete="off"
              />
            </label>
          ) : null}
          <label className="quick-add__field quick-add__field--wide">
            <span>{t("flashcard.examples")}</span>
            <textarea
              name="examplesInput"
              rows={3}
              value={model.details.examplesInput}
              onChange={model.handleDetailsChange}
              onKeyDown={handleDetailsKeyDown}
              placeholder={t("quickAdd.examplesPlaceholder")}
            />
          </label>
          <label className="quick-add__field">
            <span>{t("catalog.partOfSpeech")}</span>
            <Select name="part_of_speech" value={model.details.part_of_speech} onChange={model.handleDetailsChange}>
              <option value="">{t("quickAdd.notSet")}</option>
              {PART_OF_SPEECH_OPTIONS.map((part) => (
                <option key={part} value={part}>
                  {partOfSpeechName(part)}
                </option>
              ))}
            </Select>
          </label>
          {model.usesWordLevels ? (
            <label className="quick-add__field">
              <span>{t("catalog.level")}</span>
              <Select name="level" value={model.details.level} onChange={model.handleDetailsChange}>
                <option value="">{t("quickAdd.notSet")}</option>
                {LEVEL_OPTIONS.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
          <label className="quick-add__field quick-add__field--wide">
            <span>{t("editor.wordTags")}</span>
            <input
              name="tagsInput"
              value={model.details.tagsInput}
              onChange={model.handleDetailsChange}
              placeholder={t("editor.wordTagsPlaceholder")}
              autoComplete="off"
            />
          </label>
          <p className="quick-add__hint">{t("quickAdd.tagsKept")}</p>
        </div>
      ) : null}

      <div className="quick-add__submit">
        <Button type="submit" variant="primary" disabled={model.isSaving}>
          {t("quickAdd.addCard")}
        </Button>
        <span className="quick-add__key-hint" aria-hidden="true">
          <FiCornerDownLeft /> {t("quickAdd.enterHint")}
        </span>
      </div>
    </form>
  );
});

SingleWordForm.displayName = "SingleWordForm";

const rowProblemKey = (row) => {
  if (row.status === ROW_STATUS.missingTranslation) return "quickAdd.list.missingTranslation";
  if (row.status === ROW_STATUS.missingWord) return "quickAdd.list.missingWord";
  if (row.duplicate.kind === DUPLICATE_KIND.exact) return "quickAdd.list.exact";
  if (row.duplicate.kind === DUPLICATE_KIND.repeatedInList) return "quickAdd.list.repeated";
  if (row.duplicate.kind === DUPLICATE_KIND.otherMeaning) return "quickAdd.list.otherMeaning";
  return "";
};

const ListRow = memo(({ row, model, sourceLabel, targetLabel }) => {
  const { t } = useI18n();
  const problemKey = rowProblemKey(row);
  const needsFix = row.status !== ROW_STATUS.ready;
  const className = [
    "quick-add__row",
    needsFix ? "is-invalid" : "",
    !needsFix && !row.include ? "is-skipped" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={className}>
      <input
        type="checkbox"
        className="quick-add__row-check"
        checked={row.include && !needsFix}
        disabled={needsFix}
        onChange={(event) => model.toggleRow(row.key, event.target.checked)}
        aria-label={t("quickAdd.list.include", { word: row.source || row.raw })}
      />
      <input
        className="quick-add__row-input"
        value={row.source}
        onChange={(event) => model.handleRowChange(row.key, "source", event.target.value)}
        aria-label={t("quickAdd.list.rowField", { field: sourceLabel, line: row.line })}
        aria-invalid={row.status === ROW_STATUS.missingWord || undefined}
        autoComplete="off"
      />
      <input
        className="quick-add__row-input"
        value={row.target}
        onChange={(event) => model.handleRowChange(row.key, "target", event.target.value)}
        aria-label={t("quickAdd.list.rowField", { field: targetLabel, line: row.line })}
        aria-invalid={row.status === ROW_STATUS.missingTranslation || undefined}
        autoComplete="off"
      />
      <button
        type="button"
        className="quick-add__row-remove"
        onClick={() => model.removeRow(row.key)}
        aria-label={t("quickAdd.list.remove", { word: row.source || row.raw })}
      >
        <FiTrash2 aria-hidden="true" />
      </button>
      {problemKey ? (
        <p className="quick-add__row-note">
          {t(problemKey, {
            line: row.line,
            translations: row.duplicate.matches.map((match) => match.target || "—").join(", "),
          })}
        </p>
      ) : null}
    </li>
  );
});

ListRow.displayName = "ListRow";

const PasteList = memo(({ model }) => {
  const { t, languageName } = useI18n();
  const sourceLabel = languageName(model.languages.sourceLanguage);
  const targetLabel = languageName(model.languages.targetLanguage);

  if (model.rows.length === 0) {
    return (
      <div className="quick-add__paste">
        <label className="quick-add__field quick-add__field--wide">
          <span>{t("quickAdd.list.label")}</span>
          <textarea
            className="quick-add__paste-box"
            rows={8}
            value={model.pasteText}
            onChange={model.handlePasteTextChange}
            onPaste={model.handleListPaste}
            placeholder={t("quickAdd.list.placeholder")}
            data-autofocus
          />
        </label>
        <p className="quick-add__hint">{t("quickAdd.list.help")}</p>
        <div className="quick-add__submit">
          <Button variant="primary" onClick={model.showPreview} disabled={!model.pasteText.trim()}>
            {t("quickAdd.list.preview")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="quick-add__preview">
      <div className="quick-add__preview-bar">
        <p className="quick-add__preview-summary" aria-live="polite">
          {t("quickAdd.list.summary", { count: model.rowsToAdd.length })}
          {model.rowsToFix.length > 0 ? (
            <span className="quick-add__preview-fix">
              {" "}
              {t("quickAdd.list.toFix", { count: model.rowsToFix.length })}
            </span>
          ) : null}
        </p>
        <div className="quick-add__preview-tools">
          <Button size="sm" onClick={model.swapColumns}>
            <FiRepeat aria-hidden="true" />
            {t("quickAdd.list.swap")}
          </Button>
          <Button size="sm" onClick={model.clearList}>
            {t("quickAdd.list.startOver")}
          </Button>
        </div>
      </div>

      <div className="quick-add__columns" aria-hidden="true">
        <span />
        <span>{sourceLabel}</span>
        <span>{targetLabel}</span>
        <span />
      </div>
      <ul className="quick-add__rows">
        {model.rows.map((row) => (
          <ListRow key={row.key} row={row} model={model} sourceLabel={sourceLabel} targetLabel={targetLabel} />
        ))}
      </ul>

      <div className="quick-add__submit quick-add__submit--sticky">
        <Button variant="primary" onClick={model.addRows} disabled={model.isSaving || model.rowsToAdd.length === 0}>
          {t("quickAdd.list.add", { count: model.rowsToAdd.length })}
        </Button>
        {model.rowsToFix.length > 0 ? (
          <span className="quick-add__hint">{t("quickAdd.list.fixStays")}</span>
        ) : null}
      </div>
    </div>
  );
});

PasteList.displayName = "PasteList";

const Notice = memo(({ model }) => {
  const { t } = useI18n();
  const { notice } = model;
  const [lastAdded] = model.recent;

  if (!notice) {
    return <p className="quick-add__notice quick-add__notice--idle" aria-live="polite" />;
  }

  return (
    <p className={`quick-add__notice quick-add__notice--${notice.kind}`} aria-live="polite">
      <span>{t(notice.key, notice.params)}</span>
      {notice.kind === "added" && lastAdded ? (
        <button type="button" className="quick-add__undo" onClick={() => model.undo(lastAdded.id)} disabled={model.isSaving}>
          {t("quickAdd.undo")}
        </button>
      ) : null}
    </p>
  );
});

Notice.displayName = "Notice";

export const QuickAddWordsDialog = memo(({ initialDeckId = "", onClose, onWordsAdded }) => {
  const { t } = useI18n();
  const sourceInputRef = useRef(null);
  const model = useQuickAddWords({ isOpen: true, initialDeckId, onWordsAdded, sourceInputRef });
  const sheetRef = useRef(null);
  const titleId = useId();
  const [isConfirmingClose, setIsConfirmingClose] = useState(false);

  const finish = useCallback(() => {
    onClose?.({ addedTotal: model.addedTotal });
  }, [model.addedTotal, onClose]);

  // Typed words are not thrown away by a stray Escape or tap outside.
  const requestClose = useCallback(() => {
    if (model.hasUnsavedInput && !isConfirmingClose) {
      setIsConfirmingClose(true);
      return;
    }

    finish();
  }, [finish, isConfirmingClose, model.hasUnsavedInput]);

  useDialogA11y({ isOpen: true, containerRef: sheetRef, onClose: requestClose });

  return (
    <div className="quick-add" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="quick-add__overlay" onClick={requestClose} aria-hidden="true" tabIndex={-1} />
      <div className="quick-add__sheet" ref={sheetRef} tabIndex={-1}>
        <header className="quick-add__header">
          <h2 id={titleId}>{t("quickAdd.title")}</h2>
          <button type="button" className="quick-add__close" onClick={requestClose} aria-label={t("common.closeDialog")}>
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="quick-add__body">
          <DeckPicker model={model} />

          <div className="quick-add__tabs" role="tablist" aria-label={t("quickAdd.modeLabel")}>
            {["single", "list"].map((tab) => (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={model.tab === tab}
                className={model.tab === tab ? "is-active" : ""}
                onClick={() => model.setTab(tab)}
              >
                {t(tab === "single" ? "quickAdd.tabs.single" : "quickAdd.tabs.list")}
              </button>
            ))}
          </div>

          {model.tab === "single" ? <SingleWordForm model={model} sourceInputRef={sourceInputRef} /> : <PasteList model={model} />}

          {/* Right under the fields, so a phone keyboard never hides it. */}
          <Notice model={model} />
        </div>

        <footer className="quick-add__footer">
          {isConfirmingClose ? (
            <div className="quick-add__confirm" role="alert">
              <span>{t("quickAdd.unsaved")}</span>
              <Button size="sm" onClick={() => setIsConfirmingClose(false)}>
                {t("quickAdd.keepEditing")}
              </Button>
              <Button size="sm" variant="danger" onClick={finish}>
                {t("quickAdd.discard")}
              </Button>
            </div>
          ) : (
            <>
              <span className="quick-add__footer-count">
                {model.addedTotal > 0 ? t("quickAdd.added.list", { count: model.addedTotal }) : ""}
              </span>
              <Button onClick={requestClose}>
                {model.addedTotal > 0 ? t("quickAdd.doneLabel") : t("common.close")}
              </Button>
            </>
          )}
        </footer>
      </div>
    </div>
  );
});

QuickAddWordsDialog.displayName = "QuickAddWordsDialog";
