import { memo } from "react";
import { WordImageField } from "@features/word-image-field";
import { Select } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";

// The fields of one word, for adding and for changing it. The two sides
// come first, in the order the card shows them; a picture side takes a
// picture where a language side takes text. Everything else is details.
const SideInput = memo(({ side, label, draft, onChange, onImageChange, isPicture, otherText, autoFocus, placeholder }) => {
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
      <input
        type="text"
        name={side}
        value={draft[side]}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck="false"
        autoFocus={autoFocus}
      />
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
  autoFocus = false,
}) => {
  const { t } = useI18n();

  return (
    <div className="deck-word-fields__sides">
      <SideInput
        side="source"
        label={frontLabel}
        draft={draft}
        onChange={onChange}
        onImageChange={onImageChange}
        isPicture={pictureSide === "source"}
        otherText={draft.target}
        autoFocus={autoFocus}
        placeholder={t("editor.wordPlaceholder")}
      />
      <SideInput
        side="target"
        label={backLabel}
        draft={draft}
        onChange={onChange}
        onImageChange={onImageChange}
        isPicture={pictureSide === "target"}
        otherText={draft.source}
        autoFocus={autoFocus && pictureSide === "source"}
        placeholder={t(pictureSide === "source" ? "editor.wordPlaceholder" : "editor.translationPlaceholder")}
      />
    </div>
  );
});

WordSideFields.displayName = "WordSideFields";

export const WordDetailFields = memo(({
  draft,
  onChange,
  hasTertiary,
  tertiaryLabel,
  usesWordLevels,
  levelOptions,
  partOfSpeechOptions,
}) => {
  const { t, partOfSpeechName } = useI18n();

  return (
    <div className="deck-word-fields__details">
      {hasTertiary ? (
        <label className="deck-word-fields__field">
          <span className="deck-word-fields__label">{tertiaryLabel}</span>
          <input
            type="text"
            name="tertiary"
            value={draft.tertiary}
            onChange={onChange}
            placeholder={t("editor.optionalPlaceholder")}
            autoComplete="off"
          />
        </label>
      ) : null}

      {usesWordLevels ? (
        <label className="deck-word-fields__field deck-word-fields__field--short">
          <span className="deck-word-fields__label">{t("catalog.level")}</span>
          <Select name="level" value={draft.level} onChange={onChange} label={t("catalog.level")}>
            <option value="">{t("quickAdd.notSet")}</option>
            {levelOptions.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </Select>
        </label>
      ) : null}

      <label className="deck-word-fields__field deck-word-fields__field--short">
        <span className="deck-word-fields__label">{t("catalog.partOfSpeech")}</span>
        <Select name="part_of_speech" value={draft.part_of_speech} onChange={onChange} label={t("catalog.partOfSpeech")}>
          <option value="">{t("quickAdd.notSet")}</option>
          {partOfSpeechOptions.map((part) => (
            <option key={part} value={part}>
              {partOfSpeechName(part)}
            </option>
          ))}
        </Select>
      </label>

      <label className="deck-word-fields__field deck-word-fields__field--wide">
        <span className="deck-word-fields__label">{t("flashcard.examples")}</span>
        <textarea
          name="examplesInput"
          value={draft.examplesInput}
          onChange={onChange}
          placeholder={t("editor.examplesPlaceholder")}
          rows={3}
        />
      </label>

      <label className="deck-word-fields__field deck-word-fields__field--wide">
        <span className="deck-word-fields__label">{t("editor.wordTags")}</span>
        <input
          type="text"
          name="tagsInput"
          value={draft.tagsInput}
          onChange={onChange}
          placeholder={t("editor.wordTagsPlaceholder")}
          autoComplete="off"
        />
      </label>
    </div>
  );
});

WordDetailFields.displayName = "WordDetailFields";
