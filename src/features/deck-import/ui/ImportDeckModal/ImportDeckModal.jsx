import { memo } from "react";
import { ActionModal } from "@shared/ui";
import "./ImportDeckModal.css";

export const ImportDeckModal = memo(({ modal }) => {
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
          title: "Import deck file",
          description:
            "Supports .lioradeck, .lioralang and .json. Review import details and confirm language mapping.",
          confirmLabel: "Import",
          isConfirming: resolvedModal.isImporting,
          onConfirm: actions.onConfirm,
          onClose: actions.onClose,
        }}
      >
        <label className="import-deck-modal__label" htmlFor="import-deck-name">
          Deck name in Decks (optional)
        </label>
        <input
          id="import-deck-name"
          className="import-deck-modal__input"
          type="text"
          value={selection.deckNameDraft || ""}
          onChange={actions.onDeckNameChange}
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
              languageReview.isOpen
                ? actions.onCloseLanguageReview || actions.onToggleLanguageReview
                : actions.onOpenLanguageReview || actions.onToggleLanguageReview
            }
          >
            {languageReview.isOpen
              ? "Hide language check"
              : "Check or adjust languages"}
          </button>
        </div>

        {languageReview.isOpen ? (
          <div className="import-deck-modal__languages">
            <label className="import-deck-modal__label" htmlFor="import-source-language">
              Source language
            </label>
            <select
              id="import-source-language"
              className="import-deck-modal__input"
              name="sourceLanguage"
              value={sourceLanguage}
              onChange={actions.onLanguageChange}
            >
              {(languageReview.languageOptions || []).map((language) => (
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
              onChange={actions.onLanguageChange}
            >
              {(languageReview.languageOptions || []).map((language) => (
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
              onChange={actions.onLanguageChange}
            >
              <option value="">None</option>
              {(languageReview.languageOptions || []).map((language) => (
                <option key={`tertiary-${language}`} value={language}>
                  {language}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <p className="import-deck-modal__preview">
          Selected file: {selection.selectedFileName || "-"}
        </p>
        {Number.isInteger(selection.selectedWordsCount) && (
          <p className="import-deck-modal__preview">
            Words in file: {selection.selectedWordsCount}
          </p>
        )}
        <p className="import-deck-modal__preview">
          Deck in DB: {normalizedDeckName || "Use filename from package"}
        </p>
      </ActionModal>
    );
  });

ImportDeckModal.displayName = "ImportDeckModal";
