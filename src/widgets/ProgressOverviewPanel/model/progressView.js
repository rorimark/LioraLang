// Turns the learning stats into what the page draws and says. Pure: no
// React, no DOM, so every sentence on the page can be tested.

const INTEGER = new Intl.NumberFormat("en-US");
const SHORT_DATE = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
const WEEKDAY = new Intl.DateTimeFormat("en-US", { weekday: "short" });
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short" });

export const formatInteger = (value) => INTEGER.format(Math.max(0, Math.round(Number(value) || 0)));

export const plural = (count, one, many = `${one}s`) =>
  `${formatInteger(count)} ${Math.round(count) === 1 ? one : many}`;

export const parseDayKey = (dayKey) => {
  const [year, month, day] = String(dayKey || "").split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const formatDay = (dayKey) => SHORT_DATE.format(parseDayKey(dayKey));

export const formatWeekday = (dayKey) => WEEKDAY.format(parseDayKey(dayKey));

// Stages from furthest along to not started: the order the bar fills in,
// left to right, with words not started as its empty track.
export const STAGES = [
  { key: "mature", label: "Long-term", hint: "remembered, back in 3 weeks or more" },
  { key: "young", label: "Recent", hint: "remembered, back within 3 weeks" },
  { key: "learning", label: "Learning", hint: "still in short steps" },
  { key: "new", label: "New", hint: "not studied yet" },
];

export const GRADES = [
  { key: "again", label: "Again" },
  { key: "hard", label: "Hard" },
  { key: "good", label: "Good" },
  { key: "easy", label: "Easy" },
];

export const toShare = (part, total) => (total > 0 ? (part / total) * 100 : 0);

// Columns of the activity grid, newest last. Each column knows how many
// weeks ago it is, so narrow screens can drop the oldest ones, and which
// month starts in it, for the labels above the grid.
export const buildActivityColumns = (activity) => {
  const days = Array.isArray(activity?.days) ? activity.days : [];
  const weeks = Math.floor(days.length / 7);
  const columns = [];
  let previousMonth = -1;

  for (let week = 0; week < weeks; week += 1) {
    const cells = days.slice(week * 7, week * 7 + 7);
    const firstDay = cells.find(Boolean);
    const month = firstDay ? parseDayKey(firstDay.date).getMonth() : previousMonth;
    const startsMonth = week > 0 && month !== previousMonth;

    columns.push({
      age: weeks - 1 - week,
      cells,
      monthLabel: startsMonth && firstDay ? MONTH.format(parseDayKey(firstDay.date)) : "",
    });
    previousMonth = month;
  }

  return columns;
};

// Which of the four screen widths still shows a column: the page keeps
// 17, 26, 39 or all 53 weeks. See .progress-activity in the CSS.
export const resolveAgeBucket = (age) => {
  if (age >= 39) {
    return "39";
  }

  if (age >= 26) {
    return "26";
  }

  if (age >= 17) {
    return "17";
  }

  return "0";
};

export const describeActivityDay = (day) => {
  if (!day) {
    return "";
  }

  return `${formatDay(day.date)}: ${day.reviews > 0 ? plural(day.reviews, "review") : "no reviews"}`;
};

// When the next reviews come, for the "all caught up" state.
export const describeNextDue = (forecast) => {
  const days = Array.isArray(forecast) ? forecast : [];
  const index = days.findIndex((day, dayIndex) => dayIndex > 0 && day.due > 0);

  if (index < 0) {
    return "Nothing is due in the next two weeks.";
  }

  const cards = plural(days[index].due, "card");

  if (index === 1) {
    return `Next: ${cards} tomorrow.`;
  }

  return `Next: ${cards} on ${formatWeekday(days[index].date)}, in ${index} days.`;
};

export const resolveBusiestDeck = (decks) =>
  (Array.isArray(decks) ? decks : [])
    .filter((deck) => deck.dueNow > 0)
    .sort((first, second) => second.dueNow - first.dueNow)[0] || null;

export const describeStreak = (streak, reviewsToday) => {
  const current = Math.max(0, Number(streak?.current) || 0);

  if (streak?.isTodayDone) {
    return current > 1
      ? `${plural(reviewsToday, "review")} today. Day ${formatInteger(current)} of your streak.`
      : `${plural(reviewsToday, "review")} today.`;
  }

  if (current > 0) {
    return `Review today to keep your ${formatInteger(current)}-day streak.`;
  }

  return "A review today starts a streak.";
};

// Difference in percentage points, rounded, with its direction; null when
// either side is missing.
export const buildRecallDelta = (current, previous) => {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return null;
  }

  const points = Math.round(current - previous);

  return {
    points,
    direction: points > 0 ? "up" : points < 0 ? "down" : "flat",
    label:
      points === 0
        ? "Same as the 30 days before"
        : `${Math.abs(points)} ${Math.abs(points) === 1 ? "point" : "points"} ${points > 0 ? "higher" : "lower"} than the 30 days before`,
  };
};

const GOAL_COPY = {
  known: (target) => `Know ${formatInteger(target)} words`,
  streak: (target) => `Study ${formatInteger(target)} days in a row`,
  mature: (target) => `${formatInteger(target)} words in long-term memory`,
};

export const buildGoalRows = (goals) =>
  (Array.isArray(goals) ? goals : [])
    .filter((goal) => GOAL_COPY[goal.key] && goal.target > 0)
    .map((goal) => ({
      key: goal.key,
      title: GOAL_COPY[goal.key](goal.target),
      current: goal.current,
      target: goal.target,
      share: Math.min(100, toShare(goal.current, goal.target)),
      left: Math.max(0, goal.target - goal.current),
    }));
