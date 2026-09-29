// Turns the learning stats into what the page draws and says. Pure: no
// React, no DOM, so every sentence on the page can be tested. Anything
// that speaks takes the value useI18n() returns, so it speaks the
// interface's language.

export const parseDayKey = (dayKey) => {
  const [year, month, day] = String(dayKey || "").split("-").map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
};

export const formatDay = (dayKey, { formatDate }) =>
  formatDate(parseDayKey(dayKey), { weekday: "short", month: "short", day: "numeric" });

export const formatWeekday = (dayKey, { formatDate }) => formatDate(parseDayKey(dayKey), { weekday: "short" });

// Stages from furthest along to not started: the order the bar fills in,
// left to right, with words not started as its empty track. Their names
// are progress.stages.<key>.label and .hint.
export const STAGES = [{ key: "mature" }, { key: "young" }, { key: "learning" }, { key: "new" }];

// Named by grades.<key>.label, as on the Learn screen.
export const GRADES = [{ key: "again" }, { key: "hard" }, { key: "good" }, { key: "easy" }];

export const toShare = (part, total) => (total > 0 ? (part / total) * 100 : 0);

// Columns of the activity grid, newest last. Each column knows how many
// weeks ago it is, so narrow screens can drop the oldest ones, and which
// month starts in it, for the labels above the grid.
export const buildActivityColumns = (activity, { formatDate }) => {
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
      monthLabel: startsMonth && firstDay ? formatDate(parseDayKey(firstDay.date), { month: "short" }) : "",
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

export const describeActivityDay = (day, i18n) => {
  if (!day) {
    return "";
  }

  const date = formatDay(day.date, i18n);
  return day.reviews > 0
    ? i18n.t("progress.activity.day", { date, count: day.reviews })
    : i18n.t("progress.activity.noReviewsDay", { date });
};

// When the next reviews come, for the "all caught up" state.
export const describeNextDue = (forecast, i18n) => {
  const days = Array.isArray(forecast) ? forecast : [];
  const index = days.findIndex((day, dayIndex) => dayIndex > 0 && day.due > 0);

  if (index < 0) {
    return i18n.t("progress.today.nothingSoon");
  }

  if (index === 1) {
    return i18n.t("progress.today.nextTomorrow", { count: days[index].due });
  }

  return i18n.t("progress.today.nextOn", {
    count: days[index].due,
    day: formatWeekday(days[index].date, i18n),
    days: i18n.t("progress.today.inDays", { count: index }),
  });
};

export const resolveBusiestDeck = (decks) =>
  (Array.isArray(decks) ? decks : [])
    .filter((deck) => deck.dueNow > 0)
    .sort((first, second) => second.dueNow - first.dueNow)[0] || null;

export const describeStreak = (streak, reviewsToday, { t }) => {
  const current = Math.max(0, Number(streak?.current) || 0);

  if (streak?.isTodayDone) {
    const today = t("progress.streak.reviewsToday", { count: reviewsToday });
    return current > 1 ? `${today} ${t("progress.streak.dayOf", { day: current })}` : today;
  }

  if (current > 0) {
    return t("progress.streak.keep", { count: current });
  }

  return t("progress.streak.start");
};

// Difference in percentage points, rounded, with its direction; null when
// either side is missing.
export const buildRecallDelta = (current, previous, { t }) => {
  if (current === null || current === undefined || previous === null || previous === undefined) {
    return null;
  }

  const points = Math.round(current - previous);

  return {
    points,
    direction: points > 0 ? "up" : points < 0 ? "down" : "flat",
    label:
      points === 0
        ? t("progress.answers.same")
        : t(points > 0 ? "progress.answers.higher" : "progress.answers.lower", { count: Math.abs(points) }),
  };
};

// How the decks on the progress page can be ordered. "Active" keeps the
// stats' order: this week's reviews, then words known.
export const DECK_SORTS = [
  { value: "active", labelKey: "progress.decks.sort.active" },
  { value: "due", labelKey: "progress.decks.sort.due" },
  { value: "name", labelKey: "progress.decks.sort.name" },
];

const byName = (first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: "base", numeric: true });

export const sortDeckRows = (decks, sort) => {
  const list = Array.isArray(decks) ? [...decks] : [];

  if (sort === "due") {
    return list.sort(
      (first, second) => second.dueNow - first.dueNow || second.reviews7d - first.reviews7d || byName(first, second),
    );
  }

  if (sort === "name") {
    return list.sort(byName);
  }

  return list;
};
