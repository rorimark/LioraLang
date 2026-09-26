// The session "receipt" is a row of ticks, one per card in today's queue:
// grey for waiting, the grade colour for a card graded in this sitting, ink
// for a card finished earlier today, and an outline for the card on the desk.
// Past `maxTicks` a row of ticks is unreadable, so it becomes a plain bar.

const toCount = (value) =>
  Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;

export const buildSessionReceipt = ({
  studied = 0,
  remaining = 0,
  grades = [],
  hasCurrentCard = false,
  maxTicks = 40,
} = {}) => {
  const doneCount = toCount(studied);
  const remainingCount = toCount(remaining);
  const total = doneCount + remainingCount;

  if (total === 0) {
    return { done: 0, total: 0, ticks: [] };
  }

  if (total > maxTicks) {
    return { done: doneCount, total, ticks: null };
  }

  // Only the most recent grades can belong to today's finished cards.
  const knownGrades = grades.slice(-doneCount || grades.length).slice(0, doneCount);
  const firstGradedIndex = doneCount - knownGrades.length;
  const ticks = Array.from({ length: total }, (_, index) => {
    if (index < doneCount) {
      return index >= firstGradedIndex ? knownGrades[index - firstGradedIndex] : "done";
    }

    return index === doneCount && hasCurrentCard ? "current" : "waiting";
  });

  return { done: doneCount, total, ticks };
};
