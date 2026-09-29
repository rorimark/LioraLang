import { memo } from "react";
import { Link } from "react-router";
import { IoArrowDown, IoArrowForward, IoArrowUp, IoFlame, IoRemove } from "react-icons/io5";
import { ROUTE_PATHS, buildDeckDetailsRoute } from "@shared/config/routes";
import {
  STAGES,
  buildGoalRows,
  buildRecallDelta,
  describeNextDue,
  describeStreak,
  formatDay,
  formatInteger,
  plural,
  resolveBusiestDeck,
  useProgressOverviewPanel,
} from "../model";
import { ActivityGrid, ActivityLegend, AnswersBar, ForecastChart, StageBar } from "./progressCharts";
import "./ProgressOverviewPanel.css";

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
  const { known, stages, totalWords } = overview;
  const stageSummary = STAGES.map((stage) => `${stage.label} ${formatInteger(stages[stage.key])}`).join(", ");

  return (
    <section className="progress-words" aria-labelledby="progress-words-title">
      <p className="progress-words__eyebrow">Your words</p>
      <div className="progress-words__body">
        <h2 id="progress-words-title" className="progress-words__count">
          <strong>{formatInteger(known)}</strong>
          <span>{known === 1 ? "word you know" : "words you know"}</span>
        </h2>
        <p className="progress-words__lede">
          {totalWords === 0
            ? "Add a deck and the words you learn will be counted here."
            : stages.mature > 0
              ? `Out of ${formatInteger(totalWords)} in your decks. ${formatInteger(stages.mature)} of them are in long-term memory.`
              : `Out of ${formatInteger(totalWords)} in your decks. A word reaches long-term memory when its next review is three weeks away.`}
        </p>
        {totalWords > 0 ? (
          <>
            <StageBar
              stages={stages}
              total={totalWords}
              label={`Your words by stage: ${stageSummary}`}
            />
            <ul className="progress-words__legend">
              {STAGES.map((stage) => (
                <li key={stage.key} title={stage.hint}>
                  <span className={`progress-swatch is-${stage.key}`} aria-hidden />
                  <span>{stage.label}</span>
                  <strong>{formatInteger(stages[stage.key])}</strong>
                </li>
              ))}
            </ul>
            <p className="progress-words__note">
              Known words are the recent and the long-term ones: answered right, and not due again today.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
};

// ----- what to do today -----

const TodayCard = ({ overview }) => {
  const { dueNow, forecast, streak, reviewsToday, totalWords, decks } = overview;
  const busiestDeck = resolveBusiestDeck(decks);

  let body;

  if (totalWords === 0) {
    body = (
      <>
        <p className="progress-today__big">No words yet</p>
        <p className="progress-today__line">Pick a deck from the community to start learning.</p>
        <Link className="ui-button ui-button--primary progress-today__action" to={ROUTE_PATHS.browse}>
          Browse decks
          <IoArrowForward aria-hidden />
        </Link>
      </>
    );
  } else if (dueNow > 0) {
    body = (
      <>
        <p className="progress-today__big">
          <strong>{formatInteger(dueNow)}</strong> {dueNow === 1 ? "card to review" : "cards to review"}
        </p>
        <p className="progress-today__line">
          {busiestDeck && busiestDeck.dueNow < dueNow
            ? `${formatInteger(busiestDeck.dueNow)} of them in ${busiestDeck.name}.`
            : busiestDeck
              ? `All in ${busiestDeck.name}.`
              : ""}
        </p>
        <Link
          className="ui-button ui-button--primary progress-today__action"
          to={ROUTE_PATHS.learn}
          state={learnState(busiestDeck)}
        >
          Review now
          <IoArrowForward aria-hidden />
        </Link>
      </>
    );
  } else {
    body = (
      <>
        <p className="progress-today__big">All caught up</p>
        <p className="progress-today__line">{describeNextDue(forecast)}</p>
        <Link className="ui-button ui-button--secondary progress-today__action" to={ROUTE_PATHS.learn}>
          Learn new words
          <IoArrowForward aria-hidden />
        </Link>
      </>
    );
  }

  return (
    <Card className="progress-today" title="Today">
      <div className="progress-today__body">{body}</div>
      <p className={`progress-today__streak${streak.isTodayDone ? " is-done" : ""}`}>
        <IoFlame aria-hidden />
        <span>{describeStreak(streak, reviewsToday)}</span>
      </p>
    </Card>
  );
};

// ----- a year of study -----

const ActivityCard = ({ overview }) => {
  const { streak, activity } = overview;

  return (
    <Card className="progress-activity-card" title="Activity" aside={<ActivityLegend />}>
      <dl className="progress-stats">
        <div>
          <dt>Current streak</dt>
          <dd>{plural(streak.current, "day")}</dd>
        </div>
        <div>
          <dt>Best streak</dt>
          <dd>{plural(streak.best, "day")}</dd>
        </div>
        <div>
          <dt>Days studied</dt>
          <dd>
            {formatInteger(activity.activeDays)}
            <small> this year</small>
          </dd>
        </div>
        <div>
          <dt>Reviews</dt>
          <dd>
            {formatInteger(activity.reviews)}
            <small> this year</small>
          </dd>
        </div>
      </dl>
      <ActivityGrid activity={activity} />
      <table className="sr-only">
        <caption>Reviews per day, days with reviews only</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Reviews</th>
          </tr>
        </thead>
        <tbody>
          {activity.days
            .filter((day) => day && day.reviews > 0)
            .map((day) => (
              <tr key={day.date}>
                <td>{formatDay(day.date)}</td>
                <td>{day.reviews}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </Card>
  );
};

// ----- the next two weeks -----

const ForecastCard = ({ overview }) => {
  const { forecast } = overview;
  const total = forecast.reduce((sum, day) => sum + day.due, 0);

  return (
    <Card
      className="progress-forecast-card"
      title="Coming up"
      aside={<span className="progress-card__meta">{plural(total, "review")} in 2 weeks</span>}
    >
      {total === 0 ? (
        <p className="progress-empty">
          Nothing is scheduled yet. Words you study come back here, spaced further apart each time you remember them.
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
  const { ratings30d, recall30d, recallPrevious30d } = overview;
  const delta = buildRecallDelta(recall30d, recallPrevious30d);
  const DeltaIcon = delta ? DELTA_ICONS[delta.direction] : null;

  return (
    <Card
      className="progress-answers-card"
      title="Answers"
      aside={<span className="progress-card__meta">Last 30 days</span>}
    >
      {ratings30d.total === 0 ? (
        <p className="progress-empty">
          How you answer shows up here after your first reviews: how often you remembered, and how easily.
        </p>
      ) : (
        <>
          <div className="progress-recall">
            <p className="progress-recall__value">
              <strong>{Math.round(recall30d)}%</strong>
              <span>remembered</span>
            </p>
            <p className="progress-recall__detail">
              {plural(ratings30d.total - ratings30d.again, "answer")} out of {formatInteger(ratings30d.total)} were
              not Again.
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

// ----- decks -----

const DecksCard = ({ overview }) => {
  const { decks } = overview;

  return (
    <Card className="progress-decks-card" title="Decks">
      {decks.length === 0 ? (
        <p className="progress-empty">Your decks and how far along you are in each will be listed here.</p>
      ) : (
        <ul className="progress-decks">
          {decks.map((deck) => (
            <li key={deck.id} className="progress-deck">
              <div className="progress-deck__head">
                <Link className="progress-deck__name" to={buildDeckDetailsRoute(deck.id)}>
                  {deck.name}
                </Link>
                <span className="progress-deck__known">
                  <strong>{formatInteger(deck.known)}</strong> / {formatInteger(deck.words)} known
                </span>
              </div>
              <StageBar
                stages={deck}
                total={deck.words}
                size="sm"
                label={`${deck.name}: ${STAGES.map((stage) => `${stage.label} ${deck[stage.key]}`).join(", ")}`}
              />
              <div className="progress-deck__foot">
                <span>
                  {deck.dueNow > 0 ? <em>{formatInteger(deck.dueNow)} due now</em> : "Nothing due"}
                  {" · "}
                  {deck.reviews7d > 0 ? `${plural(deck.reviews7d, "review")} this week` : "No reviews this week"}
                </span>
                {deck.dueNow > 0 ? (
                  <Link
                    className="ui-button ui-button--secondary ui-button--sm"
                    to={ROUTE_PATHS.learn}
                    state={learnState(deck)}
                    aria-label={`Review ${deck.name}`}
                  >
                    Review
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

// ----- what comes next -----

const GoalsCard = ({ overview }) => {
  const goals = buildGoalRows(overview.goals);

  if (goals.length === 0) {
    return null;
  }

  return (
    <Card className="progress-goals-card" title="Next milestones">
      <ul className="progress-goals">
        {goals.map((goal) => (
          <li key={goal.key} className="progress-goal">
            <div className="progress-goal__head">
              <span>{goal.title}</span>
              <span className="progress-goal__count">
                {formatInteger(goal.current)} / {formatInteger(goal.target)}
              </span>
            </div>
            <div
              className="progress-goal__meter"
              role="meter"
              aria-label={goal.title}
              aria-valuemin={0}
              aria-valuemax={goal.target}
              aria-valuenow={goal.current}
            >
              <span style={{ width: `${goal.share}%` }} />
            </div>
            <p className="progress-goal__left">{goal.left === 1 ? "1 to go" : `${formatInteger(goal.left)} to go`}</p>
          </li>
        ))}
      </ul>
    </Card>
  );
};

const ProgressLoading = () => (
  <div className="progress" aria-busy="true" aria-label="Loading progress">
    <div className="progress__grid">
      <div className="progress-skeleton progress-skeleton--words" />
      <div className="progress-skeleton progress-skeleton--today" />
      <div className="progress-skeleton progress-skeleton--activity" />
    </div>
  </div>
);

export const ProgressOverviewPanel = memo(() => {
  const { overview, isLoading, error, refreshOverview } = useProgressOverviewPanel();

  if (isLoading && !overview) {
    return <ProgressLoading />;
  }

  if (error) {
    return (
      <section className="progress-card progress-error" role="alert">
        <h2>Progress could not be loaded</h2>
        <p>{error}</p>
        <button type="button" className="ui-button ui-button--secondary" onClick={refreshOverview}>
          Try again
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
        <DecksCard overview={overview} />
        <GoalsCard overview={overview} />
      </div>
    </div>
  );
});

ProgressOverviewPanel.displayName = "ProgressOverviewPanel";

