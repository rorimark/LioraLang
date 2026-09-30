// FSRS-5: the memory model behind the scheduler.
//
// Every card carries two numbers. Stability is how many days it takes for
// the chance of recalling the word to fall to 90%; difficulty (1 to 10) is
// how hard this word is for this learner. A grade updates both from the
// probability of recall at the moment of the answer, so an early answer, a
// late one and a word that has become easy are each handled on their own
// terms, instead of multiplying the last interval by a fixed ease.
//
// The weights are FSRS-5's published defaults, fitted on hundreds of
// millions of reviews.

export const FSRS_WEIGHTS = Object.freeze([
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192,
  1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
]);

const W = FSRS_WEIGHTS;
const DECAY = -0.5;
const FACTOR = 19 / 81;
export const MIN_STABILITY = 0.01;
const MAX_STABILITY = 36_500;

// Grades as FSRS numbers them.
export const GRADE = Object.freeze({ again: 1, hard: 2, good: 3, easy: 4 });

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const clampDifficulty = (value) => clamp(value, 1, 10);
const clampStability = (value) => clamp(value, MIN_STABILITY, MAX_STABILITY);

// The chance of recalling a word t days after its last review.
export const retrievability = (elapsedDays, stability) =>
  (1 + (FACTOR * Math.max(0, elapsedDays)) / Math.max(stability, MIN_STABILITY)) ** DECAY;

// Days until recall falls to the desired retention.
export const intervalForStability = (stability, desiredRetention) =>
  (stability / FACTOR) * (desiredRetention ** (1 / DECAY) - 1);

const initialDifficulty = (grade) => W[4] - Math.exp(W[5] * (grade - 1)) + 1;

export const initialMemory = (grade) => ({
  stability: clampStability(W[grade - 1]),
  difficulty: clampDifficulty(initialDifficulty(grade)),
});

// Difficulty moves with the grade, less so the harder the word already is,
// and drifts back towards a middle value so it cannot get stuck.
const nextDifficulty = (difficulty, grade) => {
  const delta = -W[6] * (grade - 3);
  const damped = difficulty + (delta * (10 - difficulty)) / 9;
  return clampDifficulty(W[7] * initialDifficulty(GRADE.easy) + (1 - W[7]) * damped);
};

const stabilityAfterRecall = (difficulty, stability, recall, grade) => {
  const hardPenalty = grade === GRADE.hard ? W[15] : 1;
  const easyBonus = grade === GRADE.easy ? W[16] : 1;
  const growth =
    Math.exp(W[8]) *
    (11 - difficulty) *
    stability ** -W[9] *
    (Math.exp((1 - recall) * W[10]) - 1) *
    hardPenalty *
    easyBonus;

  return clampStability(stability * (1 + growth));
};

// After a lapse the memory is weaker, never stronger, than it was.
const stabilityAfterLapse = (difficulty, stability, recall) =>
  clampStability(
    Math.min(
      stability,
      W[11] * difficulty ** -W[12] * ((stability + 1) ** W[13] - 1) * Math.exp((1 - recall) * W[14]),
    ),
  );

// A second answer on the same day (learning steps) changes stability a
// little, not as if a whole interval had passed.
const stabilityShortTerm = (stability, grade) =>
  clampStability(stability * Math.exp(W[17] * (grade - 3 + W[18])));

// The memory after an answer. A card with no memory yet starts from the
// grade; a same-day answer uses the short-term rule.
export const nextMemory = ({ memory, grade, elapsedDays }) => {
  if (!memory) {
    return initialMemory(grade);
  }

  const difficulty = nextDifficulty(memory.difficulty, grade);

  if (elapsedDays < 1) {
    return { stability: stabilityShortTerm(memory.stability, grade), difficulty };
  }

  const recall = retrievability(elapsedDays, memory.stability);
  const stability =
    grade === GRADE.again
      ? stabilityAfterLapse(memory.difficulty, memory.stability, recall)
      : stabilityAfterRecall(memory.difficulty, memory.stability, recall, grade);

  return { stability, difficulty };
};

// A card scheduled by the old SM-2 rules has an interval and an ease but
// no memory state. This is FSRS's own conversion: stability is what makes
// that interval land on 90% recall, and difficulty is what makes FSRS grow
// the interval at the rate the ease did.
export const memoryFromSm2 = ({ intervalDays, easeFactor }) => {
  const stability = clampStability(Math.max(1, Number(intervalDays) || 1));
  const ease = Number(easeFactor) || 2.5;
  const growthPerPoint =
    Math.exp(W[8]) * stability ** -W[9] * (Math.exp((1 - 0.9) * W[10]) - 1);
  const difficulty = clampDifficulty(11 - (ease - 1) / growthPerPoint);

  return { stability, difficulty };
};
