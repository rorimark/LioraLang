import { memo } from "react";
import { ActionModal, Select } from "@shared/ui";
import "./ImportDeckModal.css";
import { useI18n } from "@shared/lib/i18n";

export const ImportDeckModal = memo(({ modal }) => {
    const { t, languageName } = useI18n();
    const resolvedModal = modal || {};
    const selection = resolvedModal.selection || resolvedModal;
    const languageReview = resolvedModal.languageReview || {
      isOpen: resolvedModal.isLanguageReviewOpen,
      importLanguages: resolvedModal.importLanguages,
      languageOptions: resolvedModal.languageOptions,
    };
    const actions = resolvedModal.actions || {
      onConfirm: resolvedModal.onConfirm,
      onClose: resolvedModal.onClose,
      onDeckNameChange: resolvedModal.onDeckNameChange,
      onLanguageChange: resolvedModal.onLanguageChange,
      onOpenLanguageReview: resolvedModal.onOpenLanguageReview,
      onCloseLanguageReview: resolvedModal.onCloseLanguageReview,
      onToggleLanguageReview: resolvedModal.onToggleLanguageReview,
    };
    const normalizedDeckName = selection.deckNameDraft?.trim() || "";
    const sourceLanguage = languageReview.importLanguages?.sourceLanguage || "";
    const targetLanguage = languageReview.importLanguages?.targetLanguage || "";
    const tertiaryLanguage =
      languageReview.importLanguages?.tertiaryLanguage || "";
    const detectedLanguages = [
      sourceLanguage,
      targetLanguage,
      tertiaryLanguage,
    ].filter(Boolean);

    return (
      <ActionModal
        dialog={{
          isOpen: resolvedModal.isOpen,
          title: t("decks.import"),
          description: t("import.file.description"),
          confirmLabel: t("import.file.confirm"),
          isConfirming: resolvedModal.isImporting,
          onConfirm: actions.onConfirm,
          onClose: actions.onClose,
        }}
      >
        <label className="import-deck-modal__label" htmlFor="import-deck-name">
          {t("import.deckNameOptional")}
        </label>
        <input
          id="import-deck-name"
          className="import-deck-modal__input"
          type="text"
          value={selection.deckNameDraft || ""}
          onChange={actions.onDeckNameChange}
          placeholder={t("import.file.namePlaceholder")}
        />
        <div className="import-deck-modal__language-review">
          <p className="import-deck-modal__language-summary">
            {t("import.file.detected")}{" "}
            {detectedLanguages.length > 0 ? (
              detectedLanguages.map((language, index) => (
                <span key={`${language}-${index}`}>
                  {index > 0 ? ", " : ""}
                  <strong>{languageName(language)}</strong>
                </span>
              ))
            ) : (
              <strong>-</strong>
            )}
          </p>
          <button
            type="button"
            className="import-deck-modal__language-toggle"
            onClick={
              languageReview.isOpen
                ? actions.onCloseLanguageReview || actions.onToggleLanguageReview
                : actions.onOpenLanguageReview || actions.onToggleLanguageReview
            }
          >
            {languageReview.isOpen
              ? t("import.file.hideLanguages")
              : t("import.file.checkLanguages")}
          </button>
        </div>

        {languageReview.isOpen ? (
          <div className="import-deck-modal__languages">
            <label className="import-deck-modal__label" htmlFor="import-source-language">
              {t("import.file.source")}
            </label>
            <Select
              id="import-source-language"
              className="import-deck-modal__select"
              name="sourceLanguage"
              value={sourceLanguage}
              onChange={actions.onLanguageChange}
            >
              {(languageReview.languageOptions || []).map((language) => (
                <option key={`source-${language}`} value={language}>
                  {languageName(language)}
                </option>
              ))}
            </Select>

            <label className="import-deck-modal__label" htmlFor="import-target-language">
              {t("import.file.target")}
            </label>
            <Select
              id="import-target-language"
              className="import-deck-modal__select"
              name="targetLanguage"
              value={targetLanguage}
              onChange={actions.onLanguageChange}
            >
              {(languageReview.languageOptions || []).map((language) => (
                <option key={`target-${language}`} value={language}>
                  {languageName(language)}
                </option>
              ))}
            </Select>

            <label className="import-deck-modal__label" htmlFor="import-tertiary-language">
              {t("import.file.optional")}
            </label>
            <Select
              id="import-tertiary-language"
              className="import-deck-modal__select"
              name="tertiaryLanguage"
              value={tertiaryLanguage}
              onChange={actions.onLanguageChange}
            >
              <option value="">{t("common.none")}</option>
              {(languageReview.languageOptions || []).map((language) => (
                <option key={`tertiary-${language}`} value={language}>
                  {languageName(language)}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <p className="import-deck-modal__preview">
          {t("import.file.selected", { name: selection.selectedFileName || "-" })}
        </p>
        {Number.isInteger(selection.selectedWordsCount) && (
          <p className="import-deck-modal__preview">
            {t("import.file.wordsInFile", { count: selection.selectedWordsCount })}
          </p>
        )}
        <p className="import-deck-modal__preview">
          {t("import.file.savedAs", { name: normalizedDeckName || t("import.file.nameFromPackage") })}
        </p>
      </ActionModal>
    );
  });

ImportDeckModal.displayName = "ImportDeckModal";
