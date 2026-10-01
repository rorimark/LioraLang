import { memo, useCallback, useId } from "react";
import { FiLock, FiRepeat } from "react-icons/fi";
import { Select, SettingSegmented, SettingSwitch } from "@shared/ui";
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
  } = useDeckEditorPanelContext();
  const { t, languageName } = useI18n();
  const levelsId = useId();

  return (
    <section className="deck-editor__deck" aria-label={t("editor.settings")}>
      <label className="deck-editor__name">
        <span className="deck-editor__eyebrow">{t("editor.nameLabel")}</span>
        <input
          type="text"
          name="name"
          value={deckForm.name}
          onChange={handleDeckFormChange}
          placeholder={t("editor.namePlaceholder")}
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

      <div className="deck-editor__rows">
        <label className="deck-editor__row">
          <span className="deck-editor__row-text">
            <span>{t("editor.sides.extra")}</span>
            <small>{t("editor.sides.extraHint")}</small>
          </span>
          <Select name="tertiaryLanguage" value={deckForm.tertiaryLanguage} onChange={handleDeckFormChange} label={t("editor.sides.extra")}>
            <option value="">{t("common.none")}</option>
            {languageOptions.map((language) => (
              <option key={language} value={language}>
                {languageName(language)}
              </option>
            ))}
          </Select>
        </label>

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
