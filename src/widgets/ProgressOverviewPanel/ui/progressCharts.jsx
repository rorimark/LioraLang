import { memo, useCallback, useRef, useState } from "react";
import {
  GRADES,
  STAGES,
  buildActivityColumns,
  describeActivityDay,
  formatDay,
  formatInteger,
  formatWeekday,
  plural,
  resolveAgeBucket,
  toShare,
} from "../model";

const isShown = (element) => Boolean(element) && element.getClientRects().length > 0;

// One tab stop per chart: arrow keys walk the marks, the pointer points at
// them, a tap picks one. The tooltip is also a polite live region, so the
// value is read out as it changes.
const useChartMarks = ({ count, keySteps, initialIndex }) => {
  const frameRef = useRef(null);
  const [active, setActive] = useState({ index: -1, tip: null });

  const findMark = useCallback(
    (index) => frameRef.current?.querySelector(`[data-mark="${index}"]`) || null,
    [],
  );

  // Measured when a mark is picked, not after render: the tooltip sits
  // over the mark, or over the part of it named data-anchor (a bar in its
  // column), kept inside the chart's frame.
  const activate = useCallback(
    (index) => {
      const frame = frameRef.current;
      const mark = index >= 0 ? findMark(index) : null;

      if (!frame || !isShown(mark)) {
        setActive({ index: -1, tip: null });
        return;
      }

      const frameRect = frame.getBoundingClientRect();
      const markRect = (mark.querySelector("[data-anchor]") || mark).getBoundingClientRect();
      const center = markRect.left - frameRect.left + markRect.width / 2;
      const edge = Math.min(80, frameRect.width / 2);

      setActive({
        index,
        tip: {
          left: Math.max(edge, Math.min(frameRect.width - edge, center)),
          top: markRect.top - frameRect.top,
        },
      });
    },
    [findMark],
  );

  const clear = useCallback(() => setActive({ index: -1, tip: null }), []);

  const handleKeyDown = useCallback(
    (event) => {
      const step = keySteps[event.key];

      if (!step) {
        if (event.key === "Escape" && active.index >= 0) {
          event.preventDefault();
          clear();
        }

        return;
      }

      event.preventDefault();

      if (active.index < 0) {
        activate(initialIndex);
        return;
      }

      for (let next = active.index + step; next >= 0 && next < count; next += step) {
        if (isShown(findMark(next))) {
          activate(next);
          return;
        }
      }
    },
    [activate, active.index, clear, count, findMark, initialIndex, keySteps],
  );

  const handleFocus = useCallback(() => {
    if (active.index < 0) {
      activate(initialIndex);
    }
  }, [activate, active.index, initialIndex]);

  const handlePointer = useCallback(
    (event) => {
      const index = Number(event.target?.closest?.("[data-mark]")?.dataset?.mark);

      if (Number.isInteger(index) && index !== active.index) {
        activate(index);
      }
    },
    [activate, active.index],
  );

  return {
    activeIndex: active.index,
    tip: active.tip,
    frameProps: {
      ref: frameRef,
      onPointerLeave: (event) => {
        if (event.pointerType === "mouse") {
          clear();
        }
      },
    },
    surfaceProps: {
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      onFocus: handleFocus,
      onBlur: clear,
      onPointerOver: handlePointer,
      onPointerDown: handlePointer,
    },
  };
};

const ChartTip = ({ tip, children }) => (
  <div className="progress-tip-region" aria-live="polite">
    {tip && children ? (
      <div className="progress-tip" style={{ left: `${tip.left}px`, top: `${tip.top}px` }}>
        {children}
      </div>
    ) : null}
  </div>
);

// ----- word journey: one bar, four stages -----

export const StageBar = memo(({ stages, total, size = "lg", label }) => (
  <div
    className={`progress-stagebar progress-stagebar--${size}`}
    role="img"
    aria-label={label}
  >
    {total > 0
      ? STAGES.filter((stage) => stages[stage.key] > 0).map((stage) => (
        <span
          key={stage.key}
          className={`progress-stagebar__part is-${stage.key}`}
          style={{ flexGrow: stages[stage.key] }}
        />
      ))
      : <span className="progress-stagebar__part is-empty" />}
  </div>
));

StageBar.displayName = "StageBar";

// ----- activity: a year of days, as many weeks as fit -----

const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];
const ACTIVITY_KEYS = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 };

export const ActivityGrid = memo(({ activity }) => {
  const columns = buildActivityColumns(activity);
  const days = columns.flatMap((column) => column.cells);
  const todayIndex = days.reduce((last, day, index) => (day ? index : last), 0);
  const { activeIndex, tip, frameProps, surfaceProps } = useChartMarks({
    count: days.length,
    keySteps: ACTIVITY_KEYS,
    initialIndex: todayIndex,
  });
  const activeDay = days[activeIndex] || null;

  return (
    <div className="progress-activity" {...frameProps}>
      <div className="progress-activity__months" aria-hidden>
        {columns.map((column) => (
          <span key={column.age} data-age={resolveAgeBucket(column.age)}>
            {column.monthLabel}
          </span>
        ))}
      </div>
      <div className="progress-activity__weekdays" aria-hidden>
        {WEEKDAY_LABELS.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
      <div
        className="progress-activity__grid"
        role="img"
        aria-label={`Days you studied. ${plural(activity.activeDays, "day")} with reviews in the past year. Use the arrow keys to read each day.`}
        {...surfaceProps}
      >
        {columns.map((column, columnIndex) =>
          column.cells.map((day, rowIndex) => {
            const index = columnIndex * 7 + rowIndex;

            return (
              <span
                key={index}
                data-mark={day ? index : undefined}
                data-age={resolveAgeBucket(column.age)}
                className={[
                  "progress-activity__day",
                  day ? `is-level-${day.level}` : "is-future",
                  index === todayIndex ? "is-today" : "",
                  index === activeIndex ? "is-active" : "",
                ].join(" ")}
              />
            );
          }),
        )}
      </div>
      <ChartTip tip={tip}>{describeActivityDay(activeDay)}</ChartTip>
    </div>
  );
});

ActivityGrid.displayName = "ActivityGrid";

export const ActivityLegend = () => (
  <div className="progress-activity-legend" aria-hidden>
    <span>Less</span>
    {[0, 1, 2, 3, 4].map((level) => (
      <span key={level} className={`progress-activity__day is-level-${level}`} />
    ))}
    <span>More</span>
  </div>
);

// ----- forecast: reviews due, day by day -----

const FORECAST_KEYS = { ArrowLeft: -1, ArrowRight: 1 };

export const ForecastChart = memo(({ forecast }) => {
  const maxDue = Math.max(0, ...forecast.map((day) => day.due));
  const peakIndex = maxDue > 0 ? forecast.findIndex((day) => day.due === maxDue) : -1;
  const { activeIndex, tip, frameProps, surfaceProps } = useChartMarks({
    count: forecast.length,
    keySteps: FORECAST_KEYS,
    initialIndex: 0,
  });
  const activeDay = forecast[activeIndex] || null;

  return (
    <div className="progress-forecast" {...frameProps}>
      <div
        className="progress-forecast__plot"
        role="img"
        aria-label={`Reviews due over the next ${forecast.length} days. Use the arrow keys to read each day.`}
        {...surfaceProps}
      >
        {forecast.map((day, index) => (
          <div
            key={day.date}
            data-mark={index}
            className={[
              "progress-forecast__day",
              index === 0 ? "is-today" : "",
              index === activeIndex ? "is-active" : "",
            ].join(" ")}
          >
            <span className="progress-forecast__value" aria-hidden>
              {day.due > 0 && (index === 0 || index === peakIndex) ? formatInteger(day.due) : ""}
            </span>
            <span className="progress-forecast__track">
              <span
                data-anchor
                className={`progress-forecast__bar${day.due > 0 ? "" : " is-zero"}`}
                style={{ height: `${maxDue > 0 ? Math.max(4, toShare(day.due, maxDue)) : 0}%` }}
              />
            </span>
            <span className="progress-forecast__label" aria-hidden>
              {index === 0 ? "Today" : formatWeekday(day.date)}
            </span>
          </div>
        ))}
      </div>
      <ChartTip tip={tip}>
        {activeDay
          ? `${activeIndex === 0 ? "Today, with anything overdue" : formatDay(activeDay.date)}: ${plural(activeDay.due, "card")}`
          : ""}
      </ChartTip>
    </div>
  );
});

ForecastChart.displayName = "ForecastChart";

// ----- answers: how the last 30 days went -----

export const AnswersBar = memo(({ ratings }) => (
  <div className="progress-answers">
    <div
      className="progress-answers__bar"
      role="img"
      aria-label={GRADES.map((grade) => `${grade.label} ${formatInteger(ratings[grade.key])}`).join(", ")}
    >
      {GRADES.filter((grade) => ratings[grade.key] > 0).map((grade) => (
        <span
          key={grade.key}
          className={`progress-answers__part is-${grade.key}`}
          style={{ flexGrow: ratings[grade.key] }}
        />
      ))}
    </div>
    <ul className="progress-answers__legend">
      {GRADES.map((grade) => (
        <li key={grade.key}>
          <span className={`progress-swatch is-${grade.key}`} aria-hidden />
          <span className="progress-answers__name">{grade.label}</span>
          <strong>{formatInteger(ratings[grade.key])}</strong>
          <span className="progress-answers__share">
            {Math.round(toShare(ratings[grade.key], ratings.total))}%
          </span>
        </li>
      ))}
    </ul>
  </div>
));

AnswersBar.displayName = "AnswersBar";
