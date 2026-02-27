import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./ImportDeckModal.css";

export const ImportDeckModal = memo(
  ({
    isOpen,
    isImporting,
    selectedFileName,
    selectedWordsCount = null,
    deckNameDraft,
    importLanguages,
    languageOptions,
    isLanguageReviewOpen = false,
    onDeckNameChange,
    onLanguageChange,
    onOpenLanguageReview,
    onCloseLanguageReview,
    onToggleLanguageReview,
    onConfirm,
    onClose,
  }) => {
    const normalizedDeckName = deckNameDraft?.trim() || "";
    const sourceLanguage = importLanguages?.sourceLanguage || "";
    const targetLanguage = importLanguages?.targetLanguage || "";
    const tertiaryLanguage = importLanguages?.tertiaryLanguage || "";
    const detectedLanguages = [
      sourceLanguage,
      targetLanguage,
      tertiaryLanguage,
    ].filter(Boolean);

    return (
      <ActionModal
        isOpen={isOpen}
        title="Import deck package"
        description="Review import details. Language mapping is pre-filled from the package and usually does not need changes."
        confirmLabel="Import"
        isConfirming={isImporting}
        onConfirm={onConfirm}
        onClose={onClose}
      >
        <label className="import-deck-modal__label" htmlFor="import-deck-name">
          Deck name in Decks (optional)
        </label>
        <input
          id="import-deck-name"
          className="import-deck-modal__input"
          type="text"
          value={deckNameDraft}
          onChange={onDeckNameChange}
          placeholder="Use filename if empty"
        />
        <div className="import-deck-modal__language-review">
          <p className="import-deck-modal__language-summary">
            Detected languages in package:{" "}
            {detectedLanguages.length > 0 ? (
              detectedLanguages.map((language, index) => (
                <span key={`${language}-${index}`}>
                  {index > 0 ? ", " : ""}
                  <strong>{language}</strong>
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
              isLanguageReviewOpen
                ? onCloseLanguageReview || onToggleLanguageReview
                : onOpenLanguageReview || onToggleLanguageReview
            }
          >
            {isLanguageReviewOpen
              ? "Hide language check"
              : "Check or adjust languages"}
          </button>
        </div>

        {isLanguageReviewOpen ? (
          <div className="import-deck-modal__languages">
            <label className="import-deck-modal__label" htmlFor="import-source-language">
              Source language
            </label>
            <select
              id="import-source-language"
              className="import-deck-modal__input"
              name="sourceLanguage"
              value={sourceLanguage}
              onChange={onLanguageChange}
            >
              {languageOptions.map((language) => (
                <option key={`source-${language}`} value={language}>
                  {language}
                </option>
              ))}
            </select>

            <label className="import-deck-modal__label" htmlFor="import-target-language">
              Target language
            </label>
            <select
              id="import-target-language"
              className="import-deck-modal__input"
              name="targetLanguage"
              value={targetLanguage}
              onChange={onLanguageChange}
            >
              {languageOptions.map((language) => (
                <option key={`target-${language}`} value={language}>
                  {language}
                </option>
              ))}
            </select>

            <label className="import-deck-modal__label" htmlFor="import-tertiary-language">
              Optional language
            </label>
            <select
              id="import-tertiary-language"
              className="import-deck-modal__input"
              name="tertiaryLanguage"
              value={tertiaryLanguage}
              onChange={onLanguageChange}
            >
              <option value="">None</option>
              {languageOptions.map((language) => (
                <option key={`tertiary-${language}`} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <p className="import-deck-modal__preview">
          Selected file: {selectedFileName || "-"}
        </p>
        {Number.isInteger(selectedWordsCount) && (
          <p className="import-deck-modal__preview">
            Words in file: {selectedWordsCount}
          </p>
        )}
        <p className="import-deck-modal__preview">
          Deck in DB: {normalizedDeckName || "Use filename from package"}
        </p>
      </ActionModal>
    );
  },
);

ImportDeckModal.displayName = "ImportDeckModal";
