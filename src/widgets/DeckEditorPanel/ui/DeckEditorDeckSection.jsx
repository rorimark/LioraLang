import { memo, useCallback, useId } from "react";
import { FiLock, FiRepeat } from "react-icons/fi";
import { Select, SettingSegmented, SettingSwitch } from "@shared/ui";
import { DeckDescriptionSuggestion } from "@features/word-suggest";
import { SubjectFieldInputs } from "@features/subject-fields";
import { getSubjectProfile } from "@shared/core/usecases/subjects";
import { useI18n } from "@shared/lib/i18n";
import { useDeckEditorPanelContext } from "../model";

// One side of the card: a language from the list, or pictures. Pictures
// are a choice of their own beside the list, never one of its languages.
const DeckSideCard = memo(({ side, face, languageField, value, isPicture, disabled, languageOptions, onLanguageChange, onSideTypeChange }) => {
  const { t, languageName } = useI18n();
  const faceLabel = t(face === "front" ? "editor.sides.front" : "editor.sides.back");
  const handleTypeChange = useCallback(
    (event) => onSideTypeChange(side, event.target.value === "picture"),
    [onSideTypeChange, side],
  );

  return (
    <div className={`deck-side deck-side--${face}`}>
      <span className="deck-side__face">{faceLabel}</span>
      <div className="deck-side__body">
      {/* Once the deck has words a side stays what it is, so the choice
          is not offered at all rather than shown greyed out. */}
      {disabled ? null : (
        <SettingSegmented
          name={`${side}SideType`}
          value={isPicture ? "picture" : "language"}
          ariaLabel={faceLabel}
          onChange={handleTypeChange}
          options={[
            { value: "language", label: t("editor.side.language") },
            { value: "picture", label: t("media.label") },
          ]}
        />
      )}
      {isPicture ? (
        <p className="deck-side__note">{t("editor.side.pictureHint")}</p>
      ) : (
        <Select name={languageField} value={value} onChange={onLanguageChange} label={faceLabel}>
          {languageOptions.map((language) => (
            <option key={language} value={language}>
              {languageName(language)}
            </option>
          ))}
        </Select>
      )}
      </div>
    </div>
  );
});

DeckSideCard.displayName = "DeckSideCard";

export const DeckEditorDeckSection = memo(() => {
  const {
    isEditMode,
    deckForm,
    canChangeSides,
    languageOptions,
    handleDeckFormChange,
    handleSideTypeChange,
    swapSides,
    words,
    applyDeckPatch,
    subject,
    subjectProfile,
    subjectOptions,
    handleSubjectChange,
    handleDeckSubjectFieldChange,
  } = useDeckEditorPanelContext();
  const { t, languageName } = useI18n();
  const levelsId = useId();
  const sideLanguages = new Set(
    [
      deckForm.pictureSide === "source" ? "" : deckForm.sourceLanguage,
      deckForm.pictureSide === "target" ? "" : deckForm.targetLanguage,
    ].filter(Boolean),
  );

  return (
    <section className="deck-editor__deck" aria-label={t("editor.settings")}>
      {/* What the deck is about, chosen while it is empty, like its sides. */}
      {canChangeSides ? (
        <div className="deck-editor__row deck-editor__row--wide">
          <span className="deck-editor__row-text">
            <span>{t("subjects.label")}</span>
            <small>{t("subjects.hint")}</small>
          </span>
          <SettingSegmented
            name="subject"
            value={subject || subjectOptions[0]}
            ariaLabel={t("subjects.label")}
            onChange={handleSubjectChange}
            options={subjectOptions.map((id) => ({ value: id, label: t(getSubjectProfile(id).nameKey) }))}
          />
        </div>
      ) : null}

      <label className="deck-editor__name">
        <span className="deck-editor__eyebrow">{t("editor.nameLabel")}</span>
        <input
          type="text"
          name="name"
          value={deckForm.name}
          onChange={handleDeckFormChange}
          placeholder={t(subjectProfile.deckText?.namePlaceholderKey || "editor.namePlaceholder")}
          autoComplete="off"
          autoFocus={!isEditMode}
          maxLength={120}
        />
      </label>

      <label className="deck-editor__description">
        <span className="sr-only">{t("editor.description")}</span>
        <textarea
          name="description"
          value={deckForm.description}
          onChange={handleDeckFormChange}
          placeholder={t("editor.descriptionPlaceholder")}
          rows={2}
          maxLength={500}
        />
      </label>

      {subjectProfile.usesAssistant ? (
        <DeckDescriptionSuggestion deck={deckForm} words={words} onApply={applyDeckPatch} />
      ) : null}

      {subjectProfile.usesLanguages ? <>
      <div className="deck-editor__block">
        <h3 className="deck-editor__eyebrow">{t("editor.sides.title")}</h3>
        <div className="deck-sides">
          <DeckSideCard
            side="source"
            face="front"
            languageField="sourceLanguage"
            value={deckForm.sourceLanguage}
            isPicture={deckForm.pictureSide === "source"}
            disabled={!canChangeSides}
            languageOptions={languageOptions}
            onLanguageChange={handleDeckFormChange}
            onSideTypeChange={handleSideTypeChange}
          />
          {canChangeSides ? (
            <button
              type="button"
              className="deck-sides__swap"
              onClick={swapSides}
              aria-label={t("editor.sides.swap")}
              title={t("editor.sides.swap")}
            >
              <FiRepeat aria-hidden />
            </button>
          ) : null}
          <DeckSideCard
            side="target"
            face="back"
            languageField="targetLanguage"
            value={deckForm.targetLanguage}
            isPicture={deckForm.pictureSide === "target"}
            disabled={!canChangeSides}
            languageOptions={languageOptions}
            onLanguageChange={handleDeckFormChange}
            onSideTypeChange={handleSideTypeChange}
          />
        </div>
        {canChangeSides ? null : (
          <p className="deck-editor__hint">
            <FiLock aria-hidden />
            <span>{t("editor.sides.locked")}</span>
          </p>
        )}
      </div>
      </> : null}

      <div className="deck-editor__rows">
        {/* The fields the deck's subject adds (a technology). */}
        <SubjectFieldInputs
          fields={subjectProfile.deckFields}
          values={deckForm.subjectFields}
          onChange={handleDeckSubjectFieldChange}
          fieldClassName="deck-editor__row deck-editor__row--stacked"
          labelClassName="deck-editor__row-text"
        />

        {subjectProfile.usesLanguages ? <>
        <label className="deck-editor__row">
          <span className="deck-editor__row-text">
            <span>{t("editor.sides.extra")}</span>
            <small>{t("editor.sides.extraHint")}</small>
          </span>
          <Select name="tertiaryLanguage" value={deckForm.tertiaryLanguage} onChange={handleDeckFormChange} label={t("editor.sides.extra")}>
            <option value="">{t("common.none")}</option>
            {/* A language already on a side is not offered again. */}
            {languageOptions.filter((language) => !sideLanguages.has(language)).map((language) => (
              <option key={language} value={language}>
                {languageName(language)}
              </option>
            ))}
          </Select>
        </label>

        {/* Which language is being learned: hints explain its words. A
            picture deck has one language only, so there is nothing to
            choose. */}
        {deckForm.pictureSide ? null : (
          <div className="deck-editor__row deck-editor__row--wide">
            <span className="deck-editor__row-text">
              <span>{t("editor.learnedSide.label")}</span>
              <small>{t("editor.learnedSide.hint")}</small>
            </span>
            <SettingSegmented
              name="learnedSide"
              value={deckForm.learnedSide}
              ariaLabel={t("editor.learnedSide.label")}
              onChange={handleDeckFormChange}
              options={[
                { value: "source", label: languageName(deckForm.sourceLanguage) },
                { value: "target", label: languageName(deckForm.targetLanguage) },
              ]}
            />
          </div>
        )}

        <div className="deck-editor__row">
          <label className="deck-editor__row-text" htmlFor={levelsId}>
            <span>{t("editor.wordLevels")}</span>
            <small>{t("editor.enableLevels")}</small>
          </label>
          <SettingSwitch
            id={levelsId}
            name="usesWordLevels"
            checked={deckForm.usesWordLevels}
            onChange={handleDeckFormChange}
          />
        </div>
        </> : null}

        <label className="deck-editor__row deck-editor__row--stacked">
          <span className="deck-editor__row-text">
            <span>{t("editor.tags")}</span>
          </span>
          <input
            type="text"
            name="tagsInput"
            value={deckForm.tagsInput}
            onChange={handleDeckFormChange}
            placeholder={t("editor.tagsPlaceholder")}
            autoComplete="off"
          />
        </label>
      </div>
    </section>
  );
});

DeckEditorDeckSection.displayName = "DeckEditorDeckSection";
