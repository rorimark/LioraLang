import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useProgressOverviewPanel } from "../model";
import "./ProgressOverviewPanel.css";

const CHART_WIDTH = 560;
const CHART_HEIGHT = 220;
const CHART_PADDING = 20;

const ProgressOverviewLoading = memo(() => {
  return (
    <div className="progress-overview" aria-hidden>
      <section className="kpi-grid progress-overview__kpi-grid">
        <article className="kpi-card progress-overview__kpi-card progress-overview__placeholder" />
        <article className="kpi-card progress-overview__kpi-card progress-overview__placeholder" />
        <article className="kpi-card progress-overview__kpi-card progress-overview__placeholder" />
        <article className="kpi-card progress-overview__kpi-card progress-overview__placeholder" />
      </section>

      <section className="panel-grid panel-grid--two">
        <article className="panel progress-overview__panel progress-overview__placeholder progress-overview__placeholder--tall" />
        <article className="panel progress-overview__panel progress-overview__placeholder progress-overview__placeholder--tall" />
      </section>

      <article className="panel progress-overview__panel progress-overview__placeholder progress-overview__placeholder--mid" />
    </div>
  );
});

ProgressOverviewLoading.displayName = "ProgressOverviewLoading";

const ProgressOverviewError = memo(({ error, onRetry }) => {
  return (
    <article className="panel progress-overview__panel progress-overview__state">
      <h2>Progress data is unavailable</h2>
      <p>{error}</p>
      <button type="button" onClick={onRetry}>
        Try again
      </button>
    </article>
  );
});

ProgressOverviewError.displayName = "ProgressOverviewError";

export const ProgressOverviewPanel = memo(() => {
  const {
    isLoading,
    error,
    refreshOverview,
    kpiItems,
    weeklyChart,
    deckLoadRows,
    retentionSplit,
    milestones,
    intensityCells,
    intensitySummary,
    generatedAtLabel,
    totals,
  } = useProgressOverviewPanel();
  const chartRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  const handleChartMove = useCallback(
    (event) => {
      if (!chartRef.current || weeklyChart.labels.length === 0) {
        return;
      }

      const rect = chartRef.current.getBoundingClientRect();
      const clientX =
        "touches" in event
          ? event.touches?.[0]?.clientX ?? 0
          : event.clientX ?? 0;
      const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      const clampedRatio = Math.min(1, Math.max(0, ratio));
      const x = clampedRatio * CHART_WIDTH;
      const stepX =
        weeklyChart.labels.length > 1
          ? (CHART_WIDTH - CHART_PADDING * 2) / (weeklyChart.labels.length - 1)
          : 0;
      const rawIndex = stepX > 0 ? Math.round((x - CHART_PADDING) / stepX) : 0;
      const nextIndex = Math.min(
        weeklyChart.labels.length - 1,
        Math.max(0, rawIndex),
      );

      setHoveredIndex(nextIndex);
    },
    [weeklyChart.labels.length],
  );

  const handleChartLeave = useCallback(() => {
    setHoveredIndex(-1);
  }, []);

  const hoverData = useMemo(() => {
    if (hoveredIndex < 0) {
      return null;
    }

    const label = weeklyChart.labels[hoveredIndex] || "";
    const reviews = Math.round(weeklyChart.reviews[hoveredIndex] || 0);
    const recall = Math.round(weeklyChart.recall[hoveredIndex] || 0);
    const reviewPoint = weeklyChart.reviewPoints[hoveredIndex];
    const left = reviewPoint ? `${(reviewPoint.x / CHART_WIDTH) * 100}%` : "0%";

    return {
      label,
      reviews,
      recall,
      left,
      x: reviewPoint ? reviewPoint.x : CHART_PADDING,
      reviewY: reviewPoint ? reviewPoint.y : CHART_HEIGHT - CHART_PADDING,
    };
  }, [hoveredIndex, weeklyChart]);

  if (isLoading) {
    return <ProgressOverviewLoading />;
  }

  if (error) {
    return <ProgressOverviewError error={error} onRetry={refreshOverview} />;
  }

  return (
    <div className="progress-overview">
      <section className="kpi-grid progress-overview__kpi-grid">
        {kpiItems.map((item) => (
          <article key={item.label} className="kpi-card progress-overview__kpi-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p className="progress-overview__kpi-trend">{item.trend}</p>
          </article>
        ))}
      </section>

      <section className="progress-overview__top-row">
        <article className="panel progress-overview__panel progress-overview__panel--weekly">
          <header className="progress-overview__panel-header">
            <h2>Weekly Review Activity</h2>
            <p>Cards reviewed and recall quality for the last 7 days.</p>
          </header>

          <div
            className="progress-overview__chart-wrap"
            onMouseMove={handleChartMove}
            onMouseLeave={handleChartLeave}
            onTouchMove={handleChartMove}
            onTouchEnd={handleChartLeave}
          >
            <svg
              className="progress-overview__line-chart"
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Weekly review activity chart"
              ref={chartRef}
            >
              {weeklyChart.yAxisTicks.map((tick) => (
                <g key={`tick-${tick.value}`} className="progress-overview__chart-grid">
                  <line
                    x1={CHART_PADDING}
                    y1={tick.y}
                    x2={CHART_WIDTH - CHART_PADDING}
                    y2={tick.y}
                  />
                  <text
                    className="progress-overview__axis-label"
                    x={CHART_PADDING - 6}
                    y={tick.y + 3}
                    textAnchor="end"
                  >
                    {tick.value}
                  </text>
                </g>
              ))}

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
                points={weeklyChart.reviewAreaPoints}
              />
              <polyline
                className="progress-overview__line progress-overview__line--reviews"
                points={weeklyChart.reviewLinePoints}
              />
              {weeklyChart.reviewPoints.map((point, index) => (
                <circle
                  key={`review-point-${index}`}
                  className="progress-overview__point progress-overview__point--reviews"
                  cx={point.x}
                  cy={point.y}
                  r="3.2"
                >
                  <title>{`${weeklyChart.labels[index]}: ${Math.round(point.value)} reviews`}</title>
                </circle>
              ))}

              {hoverData ? (
                <>
                  <line
                    className="progress-overview__hover-line"
                    x1={hoverData.x}
                    x2={hoverData.x}
                    y1={CHART_PADDING}
                    y2={CHART_HEIGHT - CHART_PADDING}
                  />
                  <circle
                    className="progress-overview__hover-dot progress-overview__hover-dot--reviews"
                    cx={hoverData.x}
                    cy={hoverData.reviewY}
                    r="4.2"
                  />
                </>
              ) : null}
            </svg>

            {hoverData ? (
              <div
                className="progress-overview__chart-tooltip"
                style={{ left: hoverData.left }}
                role="tooltip"
              >
                <span className="progress-overview__chart-tooltip-title">
                  {hoverData.label}
                </span>
                <span>Reviews: {hoverData.reviews}</span>
                <span>Recall: {hoverData.recall}%</span>
              </div>
            ) : null}

            <div className="progress-overview__x-labels">
              {weeklyChart.labels.map((dayLabel, index) => (
                <span key={`${dayLabel}-${index}`}>{dayLabel}</span>
              ))}

            </div>



            <div className="progress-overview__sparkline" aria-label="Recall trend">
              <div className="progress-overview__sparkline-head">
                <span>Recall trend</span>
                <span className="progress-overview__sparkline-meta">
                  Avg {weeklyChart.summary?.avgRecall || "--"}
                </span>
              </div>
              <svg
                className="progress-overview__sparkline-chart"
                viewBox={`0 0 ${CHART_WIDTH} 54`}
                role="img"
                aria-label="Recall trend sparkline"
              >
                <polygon
                  className="progress-overview__sparkline-area"
                  points={weeklyChart.recallSparklineArea}
                />
                <polyline
                  className="progress-overview__sparkline-line"
                  points={weeklyChart.recallSparklinePoints}
                />
              </svg>
            </div>

            <div className="progress-overview__chart-legend">
              <span className="progress-overview__legend-item">
                <i className="progress-overview__dot progress-overview__dot--reviews" />
                Reviews
              </span>
            </div>
          </div>

          {!weeklyChart.hasData && (
            <p className="progress-overview__empty">
              No reviews in the selected period yet.
            </p>
          )}
        </article>

        <article className="panel progress-overview__panel progress-overview__panel--deck-load">
          <header className="progress-overview__panel-header">
            <h2>Top Deck Activity</h2>
            <p>Top 5 decks by cards and review activity over 7 days.</p>
          </header>

          {deckLoadRows.length === 0 ? (
            <p className="progress-overview__empty">
              No decks available yet.
            </p>
          ) : (
            <ul className="progress-overview__bars">
              {deckLoadRows.map((deck, index) => (
                <li key={`${deck.id}-${deck.name}`} className="progress-overview__bar-row">
                  <div className="progress-overview__bar-head">
                    <span className="progress-overview__bar-rank">#{index + 1}</span>
                    <strong className="progress-overview__bar-name" title={deck.name}>
                      {deck.name}
                    </strong>
                    <span className="progress-overview__bar-stat">
                      <strong>{deck.cards}</strong> cards
                    </span>
                  </div>

                  <div className="progress-overview__bar-track">
                    <div
                      className="progress-overview__bar-fill progress-overview__bar-fill--cards"
                      style={{ width: `${deck.cardsFillPercent}%` }}
                    />
                  </div>

                  <div className="progress-overview__bar-track progress-overview__bar-track--reviews">
                    <div
                      className="progress-overview__bar-fill progress-overview__bar-fill--reviews"
                      style={{ width: `${deck.reviewsFillPercent}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="panel-grid panel-grid--two">
        <article className="panel progress-overview__panel">
          <header className="progress-overview__panel-header">
            <h2>Retention Split</h2>
            <p>Success rate by learning queue (last 30 days).</p>
          </header>

          <div className="progress-overview__rings">
            {retentionSplit.map((split) => (
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
            <p>Latest highlights from your learning activity.</p>
          </header>

          <ul className="progress-overview__milestones">
            {milestones.map((milestone) => (
              <li key={milestone}>{milestone}</li>
            ))}
          </ul>
        </article>
      </section>

      <article className="panel progress-overview__panel progress-overview__panel--totals">
        <header className="progress-overview__panel-header">
          <h2>Library Totals</h2>
          <p>Overall size of your study library.</p>
        </header>

        <div className="progress-overview__totals-grid">
          <div className="progress-overview__totals-card">
            <span>Decks</span>
            <strong>{totals.decks}</strong>
          </div>
          <div className="progress-overview__totals-card">
            <span>Words</span>
            <strong>{totals.words}</strong>
          </div>
          {generatedAtLabel ? (
            <div className="progress-overview__totals-card">
              <span>Updated</span>
              <strong>{generatedAtLabel}</strong>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
});

ProgressOverviewPanel.displayName = "ProgressOverviewPanel";
