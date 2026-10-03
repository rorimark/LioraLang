import { memo } from "react";
import { WordImageField } from "@features/word-image-field";
import { SuggestChip, SuggestField } from "@features/word-suggest";
import { SubjectFieldInputs } from "@features/subject-fields";
import { Select } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";

// The fields of one word, for adding and for changing it. The two sides
// come first, in the order the card shows them; a picture side takes a
// picture where a language side takes text. Everything else is details.
// With suggestions on, an empty field may hold one in pencil.

const TextInput = memo(({ name, value, onChange, placeholder, autoFocus = false }) => (
  <input
    type="text"
    name={name}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    autoComplete="off"
    autoCapitalize="off"
    spellCheck="false"
    autoFocus={autoFocus}
  />
));

TextInput.displayName = "TextInput";

const SideInput = memo(({ side, label, draft, onChange, onImageChange, isPicture, otherText, autoFocus, placeholder, suggest, multiline }) => {
  if (isPicture) {
    return (
      <div className="deck-word-fields__side deck-word-fields__side--picture">
        <WordImageField value={draft.image} onChange={onImageChange} word={otherText} isCompact isRequired />
      </div>
    );
  }

  return (
    <label className="deck-word-fields__side">
      <span className="deck-word-fields__label">{label}</span>
      <SuggestField field={side} suggest={suggest} multiline={multiline}>
        {multiline ? (
          <textarea name={side} value={draft[side]} onChange={onChange} placeholder={placeholder} rows={3} className="deck-word-fields__answer" />
        ) : (
          <TextInput name={side} value={draft[side]} onChange={onChange} placeholder={placeholder} autoFocus={autoFocus} />
        )}
      </SuggestField>
    </label>
  );
});

SideInput.displayName = "SideInput";

export const WordSideFields = memo(({
  draft,
  onChange,
  onImageChange,
  pictureSide,
  frontLabel,
  backLabel,
  tertiaryLabel = "",
  frontPlaceholder = "",
  backPlaceholder = "",
  multilineAnswer = false,
  children,
  autoFocus = false,
  suggest = null,
}) => {
  const { t } = useI18n();

  return (
    <div className={`deck-word-fields__sides${multilineAnswer ? " deck-word-fields__sides--stacked" : tertiaryLabel ? " deck-word-fields__sides--three" : ""}`}>
      <SideInput
        side="source"
        label={frontLabel}
        draft={draft}
        onChange={onChange}
        onImageChange={onImageChange}
        isPicture={pictureSide === "source"}
        otherText={draft.target}
        autoFocus={autoFocus}
        placeholder={frontPlaceholder || t("editor.wordPlaceholder")}
        suggest={suggest}
      />
      {children}
      <SideInput
        multiline={multilineAnswer}
        side="target"
        label={backLabel}
        draft={draft}
        onChange={onChange}
        onImageChange={onImageChange}
        isPicture={pictureSide === "target"}
        otherText={draft.source}
        autoFocus={autoFocus && pictureSide === "source"}
        placeholder={backPlaceholder || t(pictureSide === "source" ? "editor.wordPlaceholder" : "editor.translationPlaceholder")}
        suggest={suggest}
      />
      {/* The deck's extra language sits beside the two sides: it is part of
          every word, shown on the back of the card with the translation. */}
      {tertiaryLabel ? (
        <label className="deck-word-fields__side">
          <span className="deck-word-fields__label">{tertiaryLabel}</span>
          <SuggestField field="tertiary" suggest={suggest}>
            <TextInput name="tertiary" value={draft.tertiary} onChange={onChange} placeholder={t("editor.optionalPlaceholder")} />
          </SuggestField>
        </label>
      ) : null}
    </div>
  );
});

WordSideFields.displayName = "WordSideFields";

// The fields a deck's subject adds to an entry, of the given input types.
export const WordSubjectFields = memo(({ fields, draft, onSubjectFieldChange, only = null, section = null }) => (
  <SubjectFieldInputs
    fields={fields}
    values={draft.subjectFields}
    onChange={onSubjectFieldChange}
    only={only}
    section={section}
    fieldClassName="deck-word-fields__field deck-word-fields__field--wide"
    labelClassName="deck-word-fields__label"
  />
));

WordSubjectFields.displayName = "WordSubjectFields";

export const WordDetailFields = memo(({
  draft,
  onChange,
  usesWordLevels,
  usesLanguages = true,
  levelOptions,
  partOfSpeechOptions,
  tagsLabelKey = "editor.wordTags",
  examplesLabel = "",
  examplesPlaceholder = "",
  subjectFields = null,
  onSubjectFieldChange,
  suggest = null,
}) => {
  const { t, partOfSpeechName } = useI18n();
  const levelInked = suggest?.inked?.has("level");
  const partInked = suggest?.inked?.has("part_of_speech");

  return (
    <div className="deck-word-fields__details">
      {subjectFields ? (
        <WordSubjectFields fields={subjectFields} draft={draft} onSubjectFieldChange={onSubjectFieldChange} section="details" />
      ) : null}

      {usesLanguages && usesWordLevels ? (
        <label className="deck-word-fields__field deck-word-fields__field--short">
          <span className="deck-word-fields__label">
            {t("catalog.level")}
            <SuggestChip field="level" suggest={suggest} />
          </span>
          <span className={levelInked ? "suggest-inked deck-word-fields__select" : "deck-word-fields__select"}>
            <Select name="level" value={draft.level} onChange={onChange} label={t("catalog.level")}>
              <option value="">{t("quickAdd.notSet")}</option>
              {levelOptions.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </Select>
          </span>
        </label>
      ) : null}

      {usesLanguages ? <label className="deck-word-fields__field deck-word-fields__field--short">
        <span className="deck-word-fields__label">
          {t("catalog.partOfSpeech")}
          <SuggestChip field="part_of_speech" suggest={suggest} label={partOfSpeechName} />
        </span>
        <span className={partInked ? "suggest-inked deck-word-fields__select" : "deck-word-fields__select"}>
          <Select name="part_of_speech" value={draft.part_of_speech} onChange={onChange} label={t("catalog.partOfSpeech")}>
            <option value="">{t("quickAdd.notSet")}</option>
            {partOfSpeechOptions.map((part) => (
              <option key={part} value={part}>
                {partOfSpeechName(part)}
              </option>
            ))}
          </Select>
        </span>
      </label> : null}

      <label className="deck-word-fields__field deck-word-fields__field--wide">
        <span className="deck-word-fields__label">{examplesLabel || t("flashcard.examples")}</span>
        <SuggestField field="examplesInput" suggest={suggest} multiline>
          <textarea
            name="examplesInput"
            value={draft.examplesInput}
            onChange={onChange}
            placeholder={examplesPlaceholder || t("editor.examplesPlaceholder")}
            rows={3}
          />
        </SuggestField>
      </label>

      <label className="deck-word-fields__field deck-word-fields__field--wide">
        <span className="deck-word-fields__label">{t(tagsLabelKey)}</span>
        <SuggestField field="tagsInput" suggest={suggest}>
          <input
            type="text"
            name="tagsInput"
            value={draft.tagsInput}
            onChange={onChange}
            placeholder={t("editor.wordTagsPlaceholder")}
            autoComplete="off"
          />
        </SuggestField>
      </label>
    </div>
  );
});

WordDetailFields.displayName = "WordDetailFields";
