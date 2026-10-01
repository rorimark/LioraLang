import { describe, expect, it } from "vitest";
import {
  countByStageFilter,
  filterWords,
  matchesWordQuery,
  sortWords,
  toRelativeTime,
} from "./deckDetailsModel";

const NOW = new Date(2026, 9, 1, 12, 0, 0).getTime();
const DAY = 24 * 60 * 60 * 1000;

const words = [
  { id: 1, source: "spoon", target: "łyżka", tags: ["kitchen"] },
  { id: 2, source: "Fork", target: "widelec" },
  { id: 3, source: "knife", target: "nóż" },
  { id: 4, source: "", target: "chleb", image: { alt: "bread" } },
];

const study = {
  words: {
    1: { stage: "learning", isDue: true, dueAtMs: NOW - 1000, lapses: 3, reps: 5 },
    2: { stage: "mature", isDue: false, dueAtMs: NOW + 20 * DAY, lapses: 0, reps: 8 },
    3: { stage: "young", isDue: false, dueAtMs: NOW + 2 * DAY, lapses: 1, reps: 4 },
  },
};

describe("deckDetailsModel", () => {
  it("counts the words under each filter, treating unseen words as new", () => {
    expect(countByStageFilter(words, study)).toEqual({ all: 4, due: 1, new: 1, learning: 1, known: 2 });
  });

  it("filters by stage and by text on either side, the picture's description and tags", () => {
    expect(filterWords(words, study, { filter: "known" }).map((word) => word.id)).toEqual([2, 3]);
    expect(filterWords(words, study, { query: "BREAD" }).map((word) => word.id)).toEqual([4]);
    expect(filterWords(words, study, { query: "kitch" }).map((word) => word.id)).toEqual([1]);
    expect(matchesWordQuery(words[0], "  ")).toBe(true);
  });

  it("sorts without changing the deck's own order", () => {
    expect(sortWords(words, study, "deck")).toBe(words);
    expect(sortWords(words, study, "az", "en").map((word) => word.id)).toEqual([4, 2, 3, 1]);
    expect(sortWords(words, study, "due", "en").map((word) => word.id)).toEqual([1, 3, 2, 4]);
    expect(sortWords(words, study, "hard", "en").map((word) => word.id)).toEqual([1, 3, 2, 4]);
    expect(words.map((word) => word.id)).toEqual([1, 2, 3, 4]);
  });

  it("says how far away a moment is in the unit a person would use", () => {
    expect(toRelativeTime(NOW + 20 * 60 * 1000, NOW)).toEqual({ value: 20, unit: "minute" });
    expect(toRelativeTime(NOW + 5 * 60 * 60 * 1000, NOW)).toEqual({ value: 5, unit: "hour" });
    expect(toRelativeTime(NOW + 13 * 60 * 60 * 1000, NOW)).toEqual({ value: 1, unit: "day" });
    expect(toRelativeTime(NOW - 3 * DAY, NOW)).toEqual({ value: -3, unit: "day" });
    expect(toRelativeTime(NOW + 90 * DAY, NOW)).toEqual({ value: 3, unit: "month" });
  });
});
