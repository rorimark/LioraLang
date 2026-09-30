import { Fragment, memo } from "react";
import { useWordsTable } from "../../model/useWordsTable";
import { WordImage } from "../WordImage/WordImage";
import "./WordsTable.css";
import { useI18n } from "@shared/lib/i18n";

const resolveLanguageLabels = (languageLabels, languageName) => {
  const sourceLanguage = languageName(languageLabels?.sourceLanguage?.trim() || "English");
  const targetLanguage = languageName(languageLabels?.targetLanguage?.trim() || "Russian");
  const tertiaryLanguage = languageName(languageLabels?.tertiaryLanguage?.trim() || "");

  return {
    sourceLanguage,
    targetLanguage,
    tertiaryLanguage,
    hasTertiaryLanguage: Boolean(tertiaryLanguage),
  };
};

const resolveExamples = (word) => {
  const list = Array.isArray(word?.examples) ? word.examples : [];
  const fallback = typeof word?.example === "string" ? word.example.trim() : "";
  const rawExamples = list.length > 0 ? list.slice() : [];

  if (!rawExamples.length && fallback) {
    rawExamples.push(fallback);
  } else if (fallback && !rawExamples.includes(fallback)) {
    rawExamples.push(fallback);
  }

  const seen = new Set();

  return rawExamples
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => {
      if (!item) {
        return false;
      }
      if (seen.has(item)) {
        return false;
      }
      seen.add(item);
      return true;
    });
};
// `imageSources` shows pictures that are not stored on this device (a hub
// deck's preview): asset id → URL. Without it pictures come from storage.
export const WordsTable = memo(({ words, languageLabels, showLevelColumn = true, imageSources = null }) => {
  const { t, languageName, partOfSpeechName } = useI18n();
  const pictureSide = languageLabels?.pictureSide || "";
  const labels = {
    ...resolveLanguageLabels(languageLabels, languageName),
    ...(pictureSide === "source" ? { sourceLanguage: t("media.label") } : {}),
    ...(pictureSide === "target" ? { targetLanguage: t("media.label") } : {}),
  };
  // A picture side shows the small picture and its description; a word
  // outside a picture deck shows no picture at all.
  const renderPicture = (word, fallbackAlt) => {
    const isShown = word.image && (!imageSources || imageSources.has(word.image.assetId));

    return (
      <>
        {isShown ? (
          <span className="words-table__thumb">
            <WordImage
              image={word.image}
              alt={word.image.alt || fallbackAlt}
              variant="thumb"
              src={imageSources?.get(word.image.assetId)}
            />
          </span>
        ) : null}
        {word.image?.alt || (isShown ? "" : "-")}
      </>
    );
  };
  const totalColumns =
    4 +
    (showLevelColumn ? 1 : 0) +
    (labels.hasTertiaryLanguage ? 1 : 0);
  const { expandedRowId, handleToggleRow } = useWordsTable();

  return (
    <table className="words-table" aria-label={t("wordsTable.label")}>
      <caption className="sr-only">{t("wordsTable.caption")}</caption>
      <thead>
        <tr>
          <th>{labels.sourceLanguage}</th>
          {showLevelColumn && <th className="words-table__level">{t("catalog.level")}</th>}
          <th>{t("catalog.partOfSpeech")}</th>
          <th>{labels.targetLanguage}</th>
          {labels.hasTertiaryLanguage && <th>{labels.tertiaryLanguage}</th>}
          <th className="words-table__examples">{t("flashcard.examples")}</th>
        </tr>
      </thead>

      <tbody>
        {words.length === 0 ? (
          <tr>
            <td className="words-table__empty" colSpan={totalColumns}>
              {t("wordsTable.empty")}
            </td>
          </tr>
        ) : (
          words.map((word) => {
            const examples = resolveExamples(word);
            const previewExamples = examples.slice(0, 2);
            const hasMoreExamples = examples.length > previewExamples.length;
            const isExpanded = String(expandedRowId) === String(word.id);

            return (
              <Fragment key={word.id}>
                <tr
                  data-word-id={word.id}
                  onClick={handleToggleRow}
                  className={
                    isExpanded
                      ? "words-table__row words-table__row--expanded"
                      : "words-table__row"
                  }
                >
                  <td data-label={labels.sourceLanguage}>
                    <span className="words-table__cell-main">
                      <span className="words-table__cell-text words-table__cell-truncate">
                        {pictureSide === "source" ? renderPicture(word, word.target) : word.source || "-"}
                      </span>
                      <span className="words-table__tap-hint">{t("wordsTable.tapHint")}</span>
                      <span
                        className={
                          isExpanded
                            ? "words-table__row-chevron words-table__row-chevron--open"
                            : "words-table__row-chevron"
                        }
                        aria-hidden="true"
                      >
                        ›
                      </span>
                    </span>
                  </td>
                  {showLevelColumn && (
                    <td className="words-table__level" data-label={t("catalog.level")}>
                      {word.level || "-"}
                    </td>
                  )}
                  <td data-label={t("catalog.partOfSpeech")}>
                    <span className="words-table__cell-truncate">
                      {word.part_of_speech ? partOfSpeechName(word.part_of_speech) : "-"}
                    </span>
                  </td>
                  <td data-label={labels.targetLanguage}>
                    <span className="words-table__cell-truncate">
                      {pictureSide === "target" ? renderPicture(word, word.source) : word.target || "-"}
                    </span>
                  </td>
                  {labels.hasTertiaryLanguage && (
                    <td data-label={labels.tertiaryLanguage}>
                      <span className="words-table__cell-truncate">
                        {word.tertiary || "-"}
                      </span>
                    </td>
                  )}
                  <td className="words-table__examples" data-label={t("flashcard.examples")}>
                    {examples.length === 0 ? (
                      "-"
                    ) : (
                      <ul className="words-table__examples-list">
                        {previewExamples.map((example, index) => (
                          <li
                            key={`${word.id}-example-${index}`}
                            className="words-table__example"
                          >
                            {example}
                          </li>
                        ))}
                        {hasMoreExamples && (
                          <li className="words-table__example words-table__example--more">
                            …
                          </li>
                        )}
                      </ul>
                    )}
                  </td>
                </tr>
                {isExpanded ? (
                  <tr className="words-table__row-details">
                    <td colSpan={totalColumns}>
                      <div className="words-table__details">
                        <div className="words-table__details-head">
                          <span className="words-table__details-label">
                            {labels.sourceLanguage}
                          </span>
                          <span className="words-table__details-value">
                            {word.source || "-"}
                          </span>
                        </div>
                        <div className="words-table__details-grid">
                          {showLevelColumn && (
                            <div>
                              <span className="words-table__details-label">{t("catalog.level")}</span>
                              <span className="words-table__details-value">
                                {word.level || "-"}
                              </span>
                            </div>
                          )}
                          <div>
                            <span className="words-table__details-label">
                              {t("catalog.partOfSpeech")}
                            </span>
                            <span className="words-table__details-value">
                              {word.part_of_speech ? partOfSpeechName(word.part_of_speech) : "-"}
                            </span>
                          </div>
                          <div>
                            <span className="words-table__details-label">
                              {labels.targetLanguage}
                            </span>
                            <span className="words-table__details-value">
                              {word.target || "-"}
                            </span>
                          </div>
                          {labels.hasTertiaryLanguage && (
                            <div>
                              <span className="words-table__details-label">
                                {labels.tertiaryLanguage}
                              </span>
                              <span className="words-table__details-value">
                                {word.tertiary || "-"}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="words-table__details-examples">
                          <span className="words-table__details-label">
                            {t("flashcard.examples")}
                          </span>
                          {examples.length === 0 ? (
                            <span className="words-table__details-value">-</span>
                          ) : (
                            <ul className="words-table__details-list">
                              {examples.map((example, index) => (
                                <li
                                  key={`${word.id}-expanded-example-${index}`}
                                >
                                  {example}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })
        )}
      </tbody>
    </table>
  );
});

WordsTable.displayName = "WordsTable";
