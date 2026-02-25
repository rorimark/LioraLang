import { memo } from "react";
import "./ProgressOverviewPanel.css";

const KPI_ITEMS = [
  { label: "Cards Reviewed (7d)", value: "468", trend: "+12%" },
  { label: "Average Recall", value: "89.4%", trend: "+2.1%" },
  { label: "Current Streak", value: "16 days", trend: "+3 days" },
  { label: "Mature Cards", value: "1,284", trend: "+74" },
];

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const WEEKLY_REVIEWS = [42, 57, 61, 50, 46, 74, 79];
const WEEKLY_RECALL = [82, 84, 86, 85, 87, 89, 91];

const DECK_LOAD = [
  { name: "General Core", cards: 348 },
  { name: "Phrasal Verbs", cards: 204 },
  { name: "Business English", cards: 187 },
  { name: "Travel Pack", cards: 132 },
];

const RETENTION_SPLITS = [
  { label: "Vocabulary", value: 94 },
  { label: "Grammar", value: 88 },
  { label: "Listening", value: 81 },
];

const RECENT_MILESTONES = [
  "Reached 1000 total reviews this month",
  "New best streak: 16 days",
  "Imported 3 custom decks",
  "Daily review target completed 6/7 days",
];

const MAX_WEEKLY_REVIEWS = Math.max(...WEEKLY_REVIEWS);
const MAX_DECK_LOAD = Math.max(...DECK_LOAD.map((item) => item.cards));

const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;
const CHART_PADDING = 22;

const buildLinePoints = (values) => {
  const stepX = (CHART_WIDTH - CHART_PADDING * 2) / (values.length - 1);
  const maxValue = Math.max(...values);

  return values
    .map((value, index) => {
      const x = CHART_PADDING + stepX * index;
      const y =
        CHART_HEIGHT -
        CHART_PADDING -
        ((value / maxValue) * (CHART_HEIGHT - CHART_PADDING * 2));

      return `${x},${y}`;
    })
    .join(" ");
};

const buildAreaPoints = (values) => {
  const linePoints = buildLinePoints(values);
  const startX = CHART_PADDING;
  const endX = CHART_WIDTH - CHART_PADDING;
  const bottomY = CHART_HEIGHT - CHART_PADDING;

  return `${startX},${bottomY} ${linePoints} ${endX},${bottomY}`;
};

const REVIEW_LINE_POINTS = buildLinePoints(WEEKLY_REVIEWS);
const REVIEW_AREA_POINTS = buildAreaPoints(WEEKLY_REVIEWS);
const RECALL_LINE_POINTS = buildLinePoints(WEEKLY_RECALL);

export const ProgressOverviewPanel = memo(() => {
  return (
    <div className="progress-overview">
      <section className="kpi-grid progress-overview__kpi-grid">
        {KPI_ITEMS.map((item) => (
          <article key={item.label} className="kpi-card progress-overview__kpi-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p className="progress-overview__kpi-trend">{item.trend} this week</p>
          </article>
        ))}
      </section>

      <section className="panel-grid panel-grid--two">
        <article className="panel progress-overview__panel">
          <header className="progress-overview__panel-header">
            <h2>Weekly Review Activity</h2>
            <p>Cards reviewed and recall quality for the last 7 days.</p>
          </header>

          <div className="progress-overview__chart-wrap">
            <svg
              className="progress-overview__line-chart"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Weekly review activity chart"
            >
              <line
                x1={CHART_PADDING}
                y1={CHART_HEIGHT - CHART_PADDING}
                x2={CHART_WIDTH - CHART_PADDING}
                y2={CHART_HEIGHT - CHART_PADDING}
              />
              <line
                x1={CHART_PADDING}
                y1={CHART_PADDING}
                x2={CHART_PADDING}
                y2={CHART_HEIGHT - CHART_PADDING}
              />

              <polygon
                className="progress-overview__area"
                points={REVIEW_AREA_POINTS}
              />
              <polyline
                className="progress-overview__line progress-overview__line--reviews"
                points={REVIEW_LINE_POINTS}
              />
              <polyline
                className="progress-overview__line progress-overview__line--recall"
                points={RECALL_LINE_POINTS}
              />
            </svg>

            <div className="progress-overview__chart-legend">
              <span className="progress-overview__legend-item">
                <i className="progress-overview__dot progress-overview__dot--reviews" />
                Reviews
              </span>
              <span className="progress-overview__legend-item">
                <i className="progress-overview__dot progress-overview__dot--recall" />
                Recall
              </span>
            </div>
          </div>

          <div className="progress-overview__x-labels">
            {WEEK_DAYS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
        </article>

        <article className="panel progress-overview__panel">
          <header className="progress-overview__panel-header">
            <h2>Deck Load</h2>
            <p>Cards currently active in your top decks.</p>
          </header>

          <ul className="progress-overview__bars">
            {DECK_LOAD.map((deck) => (
              <li key={deck.name} className="progress-overview__bar-row">
                <div className="progress-overview__bar-meta">
                  <span>{deck.name}</span>
                  <strong>{deck.cards}</strong>
                </div>
                <div className="progress-overview__bar-track">
                  <div
                    className="progress-overview__bar-fill"
                    style={{
                      width: `${Math.round((deck.cards / MAX_DECK_LOAD) * 100)}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="panel-grid panel-grid--two">
        <article className="panel progress-overview__panel">
          <header className="progress-overview__panel-header">
            <h2>Retention Split</h2>
            <p>How well each training area is retained.</p>
          </header>

          <div className="progress-overview__rings">
            {RETENTION_SPLITS.map((split) => (
              <div key={split.label} className="progress-overview__ring-card">
                <div
                  className="progress-overview__ring"
                  style={{
                    background: `conic-gradient(var(--color-primary) ${split.value}%, var(--color-surface-muted) 0)`,
                  }}
                >
                  <div className="progress-overview__ring-inner">{split.value}%</div>
                </div>
                <span>{split.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="panel progress-overview__panel">
          <header className="progress-overview__panel-header">
            <h2>Recent Milestones</h2>
            <p>Latest progress highlights from mock analytics.</p>
          </header>

          <ul className="progress-overview__milestones">
            {RECENT_MILESTONES.map((milestone) => (
              <li key={milestone}>{milestone}</li>
            ))}
          </ul>
        </article>
      </section>

      <article className="panel progress-overview__panel">
        <header className="progress-overview__panel-header">
          <h2>Daily Intensity</h2>
          <p>Mock review load trend for the current week.</p>
        </header>

        <div className="progress-overview__mini-bars">
          {WEEKLY_REVIEWS.map((value, index) => (
            <div key={WEEK_DAYS[index]} className="progress-overview__mini-bar-col">
              <div
                className="progress-overview__mini-bar"
                style={{ height: `${Math.round((value / MAX_WEEKLY_REVIEWS) * 100)}%` }}
              />
              <span>{WEEK_DAYS[index]}</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
});

ProgressOverviewPanel.displayName = "ProgressOverviewPanel";
