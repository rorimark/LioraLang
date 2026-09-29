import { memo, useCallback, useState } from "react";
import { Link } from "react-router";
import { IoArrowDown, IoArrowForward, IoArrowUp, IoFlame, IoRemove } from "react-icons/io5";
import { ROUTE_PATHS } from "@shared/config/routes";
import {
  STAGES,
  buildRecallDelta,
  describeNextDue,
  describeStreak,
  formatDay,
  resolveBusiestDeck,
  stickerGoal,
  useProgressOverviewPanel,
} from "../model";
import { ActivityGrid, ActivityLegend, AnswersBar, ForecastChart, StageBar } from "./progressCharts";
import { ProgressDecksCard } from "./ProgressDecksCard";
import { Sticker, StickerDialog } from "./Sticker";
import "./ProgressOverviewPanel.css";
import { useI18n, withEmphasis } from "@shared/lib/i18n";

const learnState = (deck) => (deck ? { importedDeckId: String(deck.id) } : null);

const Card = ({ className = "", title, aside, children, ...props }) => (
  <section className={`progress-card ${className}`} {...props}>
    {title ? (
      <header className="progress-card__head">
        <h2>{title}</h2>
        {aside}
      </header>
    ) : null}
    {children}
  </section>
);

// ----- the words you know, on an index card -----

const WordsCard = ({ overview }) => {
  const { t, formatNumber } = useI18n();
  const { known, stages, totalWords } = overview;
  const stageSummary = STAGES.map(
    (stage) => `${t(`progress.stages.${stage.key}.label`)} ${formatNumber(stages[stage.key])}`,
  ).join(", ");

  return (
    <section className="progress-words" aria-labelledby="progress-words-title">
      <p className="progress-words__eyebrow">{t("progress.words.eyebrow")}</p>
      <div className="progress-words__body">
        <h2 id="progress-words-title" className="progress-words__count">
          <strong>{formatNumber(known)}</strong>
          <span>{t("progress.words.youKnow", { count: known })}</span>
        </h2>
        <p className="progress-words__lede">
          {totalWords === 0
            ? t("progress.words.empty")
            : `${t("progress.words.outOf", { count: totalWords })} ${
              stages.mature > 0
                ? t("progress.words.inLongTerm", { count: stages.mature })
                : t("progress.words.longTermHint")
            }`}
        </p>
        {totalWords > 0 ? (
          <>
            <StageBar
              stages={stages}
              total={totalWords}
              label={t("progress.words.byStage", { summary: stageSummary })}
            />
            <ul className="progress-words__legend">
              {STAGES.map((stage) => (
                <li key={stage.key} title={t(`progress.stages.${stage.key}.hint`)}>
                  <span className={`progress-swatch is-${stage.key}`} aria-hidden />
                  <span>{t(`progress.stages.${stage.key}.label`)}</span>
                  <strong>{formatNumber(stages[stage.key])}</strong>
                </li>
              ))}
            </ul>
            <p className="progress-words__note">
              {t("progress.words.note")}
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
};

// ----- what to do today -----

const TodayCard = ({ overview }) => {
  const i18n = useI18n();
  const { t } = i18n;
  const { dueNow, forecast, streak, reviewsToday, totalWords, decks } = overview;
  const busiestDeck = resolveBusiestDeck(decks);

  let body;

  if (totalWords === 0) {
    body = (
      <>
        <p className="progress-today__big">{t("progress.today.noWords")}</p>
        <p className="progress-today__line">{t("progress.today.pickDeck")}</p>
        <Link className="ui-button ui-button--primary progress-today__action" to={ROUTE_PATHS.browse}>
          {t("progress.today.browse")}
          <IoArrowForward aria-hidden />
        </Link>
      </>
    );
  } else if (dueNow > 0) {
    body = (
      <>
        <p className="progress-today__big">
          {withEmphasis(t("progress.today.due", { count: dueNow }))}
        </p>
        <p className="progress-today__line">
          {busiestDeck && busiestDeck.dueNow < dueNow
            ? t("progress.today.someIn", { count: busiestDeck.dueNow, name: busiestDeck.name })
            : busiestDeck
              ? t("progress.today.allIn", { name: busiestDeck.name })
              : ""}
        </p>
        <Link
          className="ui-button ui-button--primary progress-today__action"
          to={ROUTE_PATHS.learn}
          state={learnState(busiestDeck)}
        >
          {t("progress.today.reviewNow")}
          <IoArrowForward aria-hidden />
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <p className="progress-today__big">{t("progress.today.caughtUp")}</p>
        <p className="progress-today__line">{describeNextDue(forecast, i18n)}</p>
        <Link className="ui-button ui-button--secondary progress-today__action" to={ROUTE_PATHS.learn}>
          {t("progress.today.learnNew")}
          <IoArrowForward aria-hidden />
        </Link>
      </>
    );
  }

  return (
    <Card className="progress-today" title={t("progress.today.title")}>
      <div className="progress-today__body">{body}</div>
      <p className={`progress-today__streak${streak.isTodayDone ? " is-done" : ""}`}>
        <IoFlame aria-hidden />
        <span>{describeStreak(streak, reviewsToday, i18n)}</span>
      </p>
    </Card>
  );
};

// ----- a year of study -----

const ActivityCard = ({ overview }) => {
  const i18n = useI18n();
  const { t, formatNumber } = i18n;
  const { streak, activity } = overview;

  return (
    <Card className="progress-activity-card" title={t("progress.activity.title")} aside={<ActivityLegend />}>
      <dl className="progress-stats">
        <div>
          <dt>{t("progress.activity.currentStreak")}</dt>
          <dd>{t("progress.activity.days", { count: streak.current })}</dd>
        </div>
        <div>
          <dt>{t("progress.activity.bestStreak")}</dt>
          <dd>{t("progress.activity.days", { count: streak.best })}</dd>
        </div>
        <div>
          <dt>{t("progress.activity.daysStudied")}</dt>
          <dd>
            {formatNumber(activity.activeDays)}
            <small> {t("progress.activity.thisYear")}</small>
          </dd>
        </div>
        <div>
          <dt>{t("progress.activity.reviews")}</dt>
          <dd>
            {formatNumber(activity.reviews)}
            <small> {t("progress.activity.thisYear")}</small>
          </dd>
        </div>
      </dl>
      <ActivityGrid activity={activity} />
      <table className="sr-only">
        <caption>{t("progress.activity.tableCaption")}</caption>
        <thead>
          <tr>
            <th scope="col">{t("progress.activity.dayColumn")}</th>
            <th scope="col">{t("progress.activity.reviews")}</th>
          </tr>
        </thead>
        <tbody>
          {activity.days
            .filter((day) => day && day.reviews > 0)
            .map((day) => (
              <tr key={day.date}>
                <td>{formatDay(day.date, i18n)}</td>
                <td>{formatNumber(day.reviews)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </Card>
  );
};

// ----- the next two weeks -----

const ForecastCard = ({ overview }) => {
  const { t } = useI18n();
  const { forecast } = overview;
  const total = forecast.reduce((sum, day) => sum + day.due, 0);

  return (
    <Card
      className="progress-forecast-card"
      title={t("progress.forecast.title")}
      aside={<span className="progress-card__meta">{t("progress.forecast.total", { count: total })}</span>}
    >
      {total === 0 ? (
        <p className="progress-empty">
          {t("progress.forecast.empty")}
        </p>
      ) : (
        <ForecastChart forecast={forecast} />
      )}
    </Card>
  );
};

// ----- how the answers went -----

const DELTA_ICONS = { up: IoArrowUp, down: IoArrowDown, flat: IoRemove };

const AnswersCard = ({ overview }) => {
  const i18n = useI18n();
  const { t } = i18n;
  const { ratings30d, recall30d, recallPrevious30d } = overview;
  const delta = buildRecallDelta(recall30d, recallPrevious30d, i18n);
  const DeltaIcon = delta ? DELTA_ICONS[delta.direction] : null;

  return (
    <Card
      className="progress-answers-card"
      title={t("progress.answers.title")}
      aside={<span className="progress-card__meta">{t("progress.answers.period")}</span>}
    >
      {ratings30d.total === 0 ? (
        <p className="progress-empty">
          {t("progress.answers.empty")}
        </p>
      ) : (
        <>
          <div className="progress-recall">
            <p className="progress-recall__value">
              <strong>{i18n.formatPercent(recall30d)}</strong>
              <span>{t("progress.answers.remembered")}</span>
            </p>
            <p className="progress-recall__detail">
              {t("progress.answers.detail", {
                count: ratings30d.total - ratings30d.again,
                total: ratings30d.total,
              })}
            </p>
            {delta ? (
              <p className={`progress-recall__delta is-${delta.direction}`}>
                <DeltaIcon aria-hidden />
                {delta.label}
              </p>
            ) : null}
          </div>
          <AnswersBar ratings={ratings30d} />
        </>
      )}
    </Card>
  );
};

// ----- stickers -----

// A small sheet of the album: always eight places, two rows. The newest
// stickers first, then the places of the next ones, so the card reads the
// same whether a learner has none or dozens.
const SHEET_SIZE = 8;

const StickersCard = ({ stickers, onOpen }) => {
  const i18n = useI18n();
  const { t } = i18n;
  const sheet = [...stickers.recent, ...stickers.nextUp].slice(0, SHEET_SIZE);
  const nextUp = stickers.nextUp.slice(0, 3);

  return (
    <Card
      className="progress-stickers-card"
      title={t("stickers.title")}
      aside={
        <span className="progress-card__meta">
          {t("stickers.earnedOf", { earned: stickers.earnedCount, total: stickers.totalCount })}
        </span>
      }
    >
      <div className="progress-stickers__sheet">
        {sheet.map((tier, index) => (
          <Sticker key={tier.id} tier={tier} family={tier.family} index={index} size="sm" onOpen={onOpen} />
        ))}
      </div>
      {stickers.earnedCount === 0 ? (
        <p className="progress-empty">{t("stickers.first")}</p>
      ) : null}
      {nextUp.length > 0 ? (
        <div className="progress-stickers__next">
          <h3>{t("stickers.nextUp")}</h3>
          <ul className="progress-goals">
            {nextUp.map((tier) => (
              <li key={tier.id} className="progress-goal">
                <div className="progress-goal__head">
                  <span>{stickerGoal(i18n, tier).replace(/[.。]$/, "")}</span>
                  <span className="progress-goal__count">
                    {i18n.formatNumber(tier.progress)} / {i18n.formatNumber(tier.target)}
                  </span>
                </div>
                <div
                  className="progress-goal__meter"
                  role="meter"
                  aria-label={stickerGoal(i18n, tier)}
                  aria-valuemin={0}
                  aria-valuemax={tier.target}
                  aria-valuenow={tier.progress}
                  style={{ "--goal-fill": `var(--sticker-${tier.family.key})` }}
                >
                  <span style={{ width: `${tier.share}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <Link className="progress-stickers__link" to={ROUTE_PATHS.progressStickers}>
        {t("stickers.openAlbum")}
        <IoArrowForward aria-hidden />
      </Link>
    </Card>
  );
};

const ProgressLoading = () => {
  const { t } = useI18n();

  return (
    <div className="progress" aria-busy="true" aria-label={t("progress.loading")}>
      <div className="progress__grid">
        <div className="progress-skeleton progress-skeleton--words" />
        <div className="progress-skeleton progress-skeleton--today" />
        <div className="progress-skeleton progress-skeleton--activity" />
      </div>
    </div>
  );
};

export const ProgressOverviewPanel = memo(() => {
  const { overview, stickers, isLoading, error, refreshOverview } = useProgressOverviewPanel();
  const { t } = useI18n();
  const [selection, setSelection] = useState(null);
  const openSticker = useCallback((tier, family) => setSelection({ tier, family }), []);
  const closeSticker = useCallback(() => setSelection(null), []);

  if (isLoading && !overview) {
    return <ProgressLoading />;
  }

  if (error) {
    return (
      <section className="progress-card progress-error" role="alert">
        <h2>{t("progress.errors.title")}</h2>
        <p>{t("progress.errors.text")}</p>
        <button type="button" className="ui-button ui-button--secondary" onClick={refreshOverview}>
          {t("common.tryAgain")}
        </button>
      </section>
    );
  }

  return (
    <div className="progress">
      <div className="progress__grid">
        <WordsCard overview={overview} />
        <TodayCard overview={overview} />
        <ActivityCard overview={overview} />
        <ForecastCard overview={overview} />
        <AnswersCard overview={overview} />
        <ProgressDecksCard decks={overview.decks} />
        <StickersCard stickers={stickers} onOpen={openSticker} />
      </div>
      <StickerDialog selection={selection} onClose={closeSticker} />
    </div>
  );
});

ProgressOverviewPanel.displayName = "ProgressOverviewPanel";

