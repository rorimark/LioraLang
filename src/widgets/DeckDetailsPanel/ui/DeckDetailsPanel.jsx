import { memo, useCallback, useId, useMemo } from "react";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiChevronDown,
  FiDownload,
  FiEdit3,
  FiPlay,
  FiPlus,
  FiRefreshCw,
} from "react-icons/fi";
import { DeckLanguagePair, DeckTagBadges } from "@entities/deck";
import { getSubjectProfile } from "@shared/core/usecases/subjects";
import { WordImage } from "@entities/word";
import { InlineAlert, SearchField, Select } from "@shared/ui";
import { useI18n } from "@shared/lib/i18n";
import { useDeckDetailsPanel } from "../model";
import { STAGE_FILTERS, WORD_SORTS, resolveWordStudy, toRelativeTime } from "../model/deckDetailsModel";
import "./DeckDetailsPanel.css";

const STAGES = ["new", "learning", "young", "mature"];

const parseTags = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);

  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const toExamples = (word) => {
  const seen = new Set();
  return [...(Array.isArray(word?.examples) ? word.examples : []), word?.example]
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item && !seen.has(item) && seen.add(item));
};

// "in 3 days", "yesterday", "in 20 minutes", in the interface's language.
const useRelative = () => {
  const { locale } = useI18n();
  const format = useMemo(() => new Intl.RelativeTimeFormat(locale, { numeric: "auto" }), [locale]);

  return useCallback(
    (ms) => {
      if (!Number.isFinite(ms)) return "";
      const { value, unit } = toRelativeTime(ms);
      return format.format(value, unit);
    },
    [format],
  );
};

// ——— Where the learner stands ———

const StageBar = memo(({ stages, total }) => (
  <div className="deck-study__bar" aria-hidden="true">
    {total > 0
      ? STAGES.filter((stage) => stages[stage] > 0).map((stage) => (
          <span key={stage} className={`deck-study__part is-${stage}`} style={{ flexGrow: stages[stage] }} />
        ))
      : <span className="deck-study__part is-new" style={{ flexGrow: 1 }} />}
  </div>
));

StageBar.displayName = "StageBar";

const DeckStudy = memo(({ panel }) => {
  const { t, formatNumber, formatPercent } = useI18n();
  const relative = useRelative();
  const { study, words, learnDeck } = panel;
  const total = words.length;
  const stages = study?.stages || { new: total, learning: 0, young: 0, mature: 0 };
  const dueNow = study?.dueNow || 0;
  const hasStarted = total > stages.new;

  // One sentence on what to do next, and the button that does it.
  let headline = t("deck.study.notStarted");
  let detail = total > 0 ? t("deck.study.newWaiting", { count: stages.new }) : "";

  if (dueNow > 0) {
    headline = t("deck.study.due", { count: dueNow });
    detail = study?.lastReviewedAtMs ? t("deck.study.lastSession", { when: relative(study.lastReviewedAtMs) }) : "";
  } else if (hasStarted) {
    headline = t("deck.study.caughtUp");
    detail = study?.nextDueAtMs ? t("deck.study.nextReview", { when: relative(study.nextDueAtMs) }) : "";
  }

  const facts = [
    study?.reviews7d ? t("deck.study.week", { count: study.reviews7d }) : "",
    Number.isFinite(study?.recall30d) ? t("deck.study.recall", { percent: formatPercent(study.recall30d) }) : "",
  ].filter(Boolean);

  return (
    <section className="deck-study" aria-label={t("deck.study.title")}>
      <div className="deck-study__head">
        <div className="deck-study__text">
          <p className="deck-study__headline">{headline}</p>
          {detail ? <p className="deck-study__detail">{detail}</p> : null}
        </div>
        <button
          type="button"
          className={`deck-page__button${dueNow > 0 || !hasStarted ? " deck-page__button--primary" : ""}`}
          onClick={learnDeck}
          disabled={total === 0}
        >
          <FiPlay aria-hidden />
          <span>{t("decks.row.learn")}</span>
        </button>
      </div>

      <StageBar stages={stages} total={total} />

      <ul className="deck-study__legend">
        {STAGES.map((stage) => (
          <li key={stage}>
            <span className={`deck-study__dot is-${stage}`} aria-hidden="true" />
            <span className="deck-study__label">{t(`progress.stages.${stage}.label`)}</span>
            <strong>{formatNumber(stages[stage])}</strong>
          </li>
        ))}
      </ul>

      {facts.length > 0 ? <p className="deck-study__facts">{facts.join(" · ")}</p> : null}
    </section>
  );
});

DeckStudy.displayName = "DeckStudy";

// ——— One word ———

const WordSide = memo(({ word, isPicture, fallbackAlt, size = "thumb" }) => {
  if (isPicture) {
    return word.image ? (
      <span className={`deck-word-view__picture deck-word-view__picture--${size}`}>
        <WordImage image={word.image} alt={word.image.alt || fallbackAlt} variant={size === "thumb" ? "thumb" : "full"} />
      </span>
    ) : (
      <span className="deck-word-view__text">—</span>
    );
  }

  return null;
});

WordSide.displayName = "WordSide";

const WordStatus = memo(({ wordStudy }) => {
  const { t } = useI18n();
  const relative = useRelative();

  // A new word's grey dot already says it; the column stays quiet.
  if (wordStudy.stage === "new") {
    return <span className="deck-word-view__when" />;
  }

  if (wordStudy.isDue) {
    return <span className="deck-word-view__when is-due">{t("deck.word.dueNow")}</span>;
  }

  return <span className="deck-word-view__when">{relative(wordStudy.dueAtMs)}</span>;
});

WordStatus.displayName = "WordStatus";

// An open word is shown as its card: the front, the back, and what is
// known about how it has gone so far.
const WordCard = memo(({ word, wordStudy, labels, pictureSide, usesWordLevels }) => {
  const { t, partOfSpeechName, formatDate } = useI18n();
  const relative = useRelative();
  const examples = toExamples(word);
  const tags = parseTags(word.tags);
  const facts = [
    usesWordLevels && word.level ? word.level : "",
    word.part_of_speech ? partOfSpeechName(word.part_of_speech) : "",
  ].filter(Boolean);

  const history =
    wordStudy.stage === "new"
      ? t("deck.word.notStudied")
      : [
          wordStudy.isDue ? t("deck.word.dueNow") : t("deck.word.next", { when: relative(wordStudy.dueAtMs) }),
          wordStudy.lastReviewedAtMs
            ? t("deck.word.last", { date: formatDate(wordStudy.lastReviewedAtMs, { dateStyle: "medium" }) })
            : "",
          wordStudy.reps ? t("deck.word.reviews", { count: wordStudy.reps }) : "",
          wordStudy.lapses ? t("deck.word.lapses", { count: wordStudy.lapses }) : "",
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="deck-word-card">
      <div className="deck-word-card__faces">
        <div className="deck-word-card__face deck-word-card__face--front">
          <span className="deck-word-card__label">{labels.front}</span>
          <div className="deck-word-card__content">
            {pictureSide === "source" ? (
              <WordSide word={word} isPicture fallbackAlt={word.target} size="full" />
            ) : (
              <p className="deck-word-card__word">{word.source}</p>
            )}
          </div>
        </div>
        <div className="deck-word-card__face deck-word-card__face--back">
          <span className="deck-word-card__label">{labels.back}</span>
          <div className="deck-word-card__content">
            {pictureSide === "target" ? (
              <WordSide word={word} isPicture fallbackAlt={word.source} size="full" />
            ) : (
              <p className="deck-word-card__word">{word.target}</p>
            )}
            {labels.tertiary && word.tertiary ? (
              <p className="deck-word-card__extra">
                <span>{labels.tertiary}</span> {word.tertiary}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <dl className="deck-word-card__details">
        {examples.length > 0 ? (
          <div className="deck-word-card__row deck-word-card__row--wide">
            <dt>{t("flashcard.examples")}</dt>
            <dd>
              <ul className="deck-word-card__examples">
                {examples.map((example) => (
                  <li key={example}>{example}</li>
                ))}
              </ul>
            </dd>
          </div>
        ) : null}
        {facts.length > 0 ? (
          <div className="deck-word-card__row">
            <dt>{t("deck.word.about")}</dt>
            <dd>{facts.join(" · ")}</dd>
          </div>
        ) : null}
        {tags.length > 0 ? (
          <div className="deck-word-card__row">
            <dt>{t("deck.word.tags")}</dt>
            <dd>
              <DeckTagBadges badges={tags} inline />
            </dd>
          </div>
        ) : null}
        <div className="deck-word-card__row deck-word-card__row--wide">
          <dt>{t("deck.word.progress")}</dt>
          <dd>
            <span className={`deck-study__dot is-${wordStudy.stage}`} aria-hidden="true" />{" "}
            {t(`progress.stages.${wordStudy.stage}.label`)}
            {history && wordStudy.stage !== "new" ? ` · ${history}` : ""}
          </dd>
        </div>
      </dl>
    </div>
  );
});

WordCard.displayName = "WordCard";

const WordRow = memo(({ word, wordStudy, isOpen, onToggle, labels, pictureSide, usesWordLevels }) => {
  const { t } = useI18n();
  const cardId = useId();
  const stageLabel = t(`progress.stages.${wordStudy.stage}.label`);

  return (
    <li className={`deck-word-view${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        className="deck-word-view__row"
        onClick={() => onToggle(word.id)}
        aria-expanded={isOpen}
        aria-controls={cardId}
      >
        <span className={`deck-study__dot is-${wordStudy.stage}`} title={stageLabel}>
          <span className="sr-only">{stageLabel}</span>
        </span>
        <span className="deck-word-view__side deck-word-view__side--front">
          {pictureSide === "source" ? (
            <WordSide word={word} isPicture fallbackAlt={word.target} />
          ) : (
            <span className="deck-word-view__text deck-word-view__text--front">{word.source}</span>
          )}
        </span>
        <span className="deck-word-view__side deck-word-view__side--back">
          {pictureSide === "target" ? (
            <WordSide word={word} isPicture fallbackAlt={word.source} />
          ) : (
            <span className="deck-word-view__text">{word.target}</span>
          )}
        </span>
        {/* The extra language has a column of its own. */}
        {labels.tertiary ? (
          <span className={`deck-word-view__side deck-word-view__side--extra${word.tertiary ? "" : " is-empty"}`}>
            <span className="deck-word-view__text">{word.tertiary || "—"}</span>
          </span>
        ) : null}
        <WordStatus wordStudy={wordStudy} />
        <FiChevronDown className="deck-word-view__chevron" aria-hidden />
      </button>
      {isOpen ? (
        <div id={cardId}>
          <WordCard
            word={word}
            wordStudy={wordStudy}
            labels={labels}
            pictureSide={pictureSide}
            usesWordLevels={usesWordLevels}
          />
        </div>
      ) : null}
    </li>
  );
});

WordRow.displayName = "WordRow";

// ——— The words ———

const DeckWords = memo(({ panel, labels }) => {
  const { t, formatNumber } = useI18n();
  const headingId = useId();
  const { entryText } = getSubjectProfile(panel.deck.subject);
  const pictureSide = panel.deck.pictureSide || "";
  const usesWordLevels = panel.deck.usesWordLevels !== false;
  const total = panel.words.length;

  if (total === 0) {
    return (
      <section className="deck-words-view" aria-labelledby={headingId}>
        <h3 id={headingId} className="deck-words-view__title">{t(entryText?.listKey || "editor.wordsTable")}</h3>
        <div className="deck-words-view__empty">
          <p>{t(entryText?.emptyKey || "deck.emptyDeck")}</p>
          <button type="button" className="deck-page__button deck-page__button--primary" onClick={panel.openEditDeck}>
            <FiPlus aria-hidden />
            <span>{t(entryText?.addKey || "deck.addWords")}</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="deck-words-view" aria-labelledby={headingId}>
      <header className="deck-words-view__head">
        <h3 id={headingId} className="deck-words-view__title">
          {t(entryText?.listKey || "editor.wordsTable")}
          <span className="deck-words-view__count">{formatNumber(total)}</span>
        </h3>
        <button type="button" className="deck-page__button deck-page__button--quiet" onClick={panel.openEditDeck}>
          <FiPlus aria-hidden />
          <span>{t(entryText?.addKey || "deck.addWords")}</span>
        </button>
      </header>

      <div className="deck-words-view__tools">
        <div className="deck-words-view__filters" role="radiogroup" aria-label={t("deck.filter.label")}>
          {STAGE_FILTERS.map((filter) => {
            const count = panel.counts[filter] || 0;

            if (filter !== "all" && count === 0) {
              return null;
            }

            return (
              <button
                key={filter}
                type="button"
                role="radio"
                aria-checked={panel.filter === filter}
                className={`deck-words-view__chip${panel.filter === filter ? " is-active" : ""}${filter === "due" ? " is-due" : ""}`}
                onClick={() => panel.changeFilter(filter)}
              >
                {/* New and learning are named as the Progress page names them. */}
                <span>{t(filter === "new" || filter === "learning" ? `progress.stages.${filter}.label` : `deck.filter.${filter}`)}</span>
                <span className="deck-words-view__chip-count">{formatNumber(count)}</span>
              </button>
            );
          })}
        </div>
        <div className="deck-words-view__search">
          <SearchField
            value={panel.query}
            onChange={panel.changeQuery}
            onClear={panel.clearQuery}
            placeholder={t("editor.searchPlaceholder")}
          />
          <Select name="sort" value={panel.sort} onChange={panel.changeSort} label={t("deck.sort.label")}>
            {WORD_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {t(`deck.sort.${sort}`)}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {panel.shownCount === 0 ? (
        <p className="deck-words-view__none">
          {panel.query.trim() ? t("editor.noMatches", { query: panel.query.trim() }) : t("deck.emptyFilter")}
        </p>
      ) : (
        <>
          <div className={`deck-words-view__columns${labels.tertiary ? " has-extra" : ""}`} aria-hidden="true">
            <span />
            <span>{labels.front}</span>
            <span>{labels.back}</span>
            {labels.tertiary ? <span>{labels.tertiary}</span> : null}
            <span>{t("deck.word.nextColumn")}</span>
            <span />
          </div>
          <ul className={`deck-words-view__list${labels.tertiary ? " has-extra" : ""}`}>
            {panel.visibleWords.map((word) => (
              <WordRow
                key={word.id}
                word={word}
                wordStudy={resolveWordStudy(panel.study, word)}
                isOpen={String(panel.openWordId) === String(word.id)}
                onToggle={panel.toggleWord}
                labels={labels}
                pictureSide={pictureSide}
                usesWordLevels={usesWordLevels}
              />
            ))}
          </ul>
          {panel.hasMoreWords ? (
            <button type="button" className="deck-words-view__more" onClick={panel.showMore}>
              {t("editor.showMore", { shown: panel.visibleWords.length, total: panel.shownCount })}
            </button>
          ) : null}
        </>
      )}
    </section>
  );
});

DeckWords.displayName = "DeckWords";

// ——— The page ———

export const DeckDetailsPanel = memo(() => {
  const panel = useDeckDetailsPanel();
  const { t, languageName } = useI18n();
  const { deck } = panel;

  // What each side is called in the list and on an open card: its
  // language, "Picture", or what the deck's subject calls it.
  const labels = useMemo(() => {
    const { entryText } = getSubjectProfile(deck?.subject);

    if (entryText) {
      return { front: t(entryText.source.labelKey), back: t(entryText.target.labelKey), tertiary: "" };
    }

    const pictureSide = deck?.pictureSide || "";
    return {
      front: pictureSide === "source" ? t("media.label") : languageName(deck?.sourceLanguage || ""),
      back: pictureSide === "target" ? t("media.label") : languageName(deck?.targetLanguage || ""),
      tertiary: deck?.tertiaryLanguage ? languageName(deck.tertiaryLanguage) : "",
    };
  }, [deck, languageName, t]);

  const statusAlert = useMemo(
    () => ({ text: panel.message, variant: panel.messageVariant, onClose: panel.clearMessage }),
    [panel.clearMessage, panel.message, panel.messageVariant],
  );

  if (panel.isLoading) {
    return (
      <article className="deck-page deck-page--message" aria-busy="true">
        <p>{t("deck.loading")}</p>
      </article>
    );
  }

  if (panel.error || !deck) {
    return (
      <article className="deck-page deck-page--message">
        <p role="alert">
          <FiAlertCircle aria-hidden /> {panel.error || t("decks.errors.notFound")}
        </p>
        <div className="deck-page__actions">
          <button type="button" className="deck-page__button deck-page__button--primary" onClick={panel.refreshDeckWords}>
            <FiRefreshCw aria-hidden />
            <span>{t("common.retry")}</span>
          </button>
          <button type="button" className="deck-page__button" onClick={panel.openDecksOverview}>
            <FiArrowLeft aria-hidden />
            <span>{t("common.backToDecks")}</span>
          </button>
        </div>
      </article>
    );
  }

  const tags = parseTags(deck.tags ?? deck.tagsJson);

  return (
    <article className="deck-page">
      <header className="deck-page__bar">
        <button type="button" className="deck-page__back" onClick={panel.openDecksOverview}>
          <FiArrowLeft aria-hidden />
          <span>{t("common.backToDecks")}</span>
        </button>
        <div className="deck-page__actions">
          <button
            type="button"
            className="deck-page__button deck-page__button--quiet"
            onClick={panel.exportDeck}
            disabled={panel.isExporting}
          >
            <FiDownload aria-hidden />
            <span>{panel.isExporting ? t("decks.table.exporting") : t("deck.exportShort")}</span>
          </button>
          <button type="button" className="deck-page__button" onClick={panel.openEditDeck}>
            <FiEdit3 aria-hidden />
            <span>{t("deck.edit")}</span>
          </button>
        </div>
      </header>

      <InlineAlert alert={statusAlert} />

      <header className="deck-page__title">
        <h2>{deck.name}</h2>
        {deck.description ? <p className="deck-page__description">{deck.description}</p> : null}
        <div className="deck-page__meta">
          <DeckLanguagePair
            source={deck.sourceLanguage}
            targets={[deck.targetLanguage, deck.tertiaryLanguage]}
            pictureSide={deck.pictureSide || ""}
            subject={deck.subject}
            subjectFields={deck.subjectFields}
          />
          <span>{getSubjectProfile(deck.subject).entryText ? `${t(getSubjectProfile(deck.subject).entryText.listKey)}: ${panel.words.length}` : t("deck.wordsCount", { count: panel.words.length })}</span>
          {tags.length > 0 ? <DeckTagBadges badges={tags} inline /> : null}
        </div>
      </header>

      <DeckStudy panel={panel} />
      <DeckWords panel={panel} labels={labels} />
    </article>
  );
});

DeckDetailsPanel.displayName = "DeckDetailsPanel";
