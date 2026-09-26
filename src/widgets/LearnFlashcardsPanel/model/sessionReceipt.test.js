import { describe, expect, it } from "vitest";
import { buildSessionReceipt } from "./sessionReceipt";

describe("buildSessionReceipt", () => {
  it("colours the cards graded in this sitting and marks the current one", () => {
    expect(
      buildSessionReceipt({ studied: 3, remaining: 2, grades: ["good", "again"], hasCurrentCard: true }),
    ).toEqual({
      done: 3,
      total: 5,
      ticks: ["done", "good", "again", "current", "waiting"],
    });
  });

  it("keeps only as many grades as there are finished cards", () => {
    expect(buildSessionReceipt({ studied: 2, remaining: 0, grades: ["hard", "good", "easy"] }).ticks)
      .toEqual(["good", "easy"]);
  });

  it("falls back to a bar for a long queue", () => {
    expect(buildSessionReceipt({ studied: 10, remaining: 90, maxTicks: 40 })).toEqual({
      done: 10,
      total: 100,
      ticks: null,
    });
  });

  it("is empty with nothing queued, and ignores bad numbers", () => {
    expect(buildSessionReceipt({ studied: Number.NaN, remaining: -1 })).toEqual({
      done: 0,
      total: 0,
      ticks: [],
    });
  });

  it("marks nothing current when there is no card on the desk", () => {
    expect(buildSessionReceipt({ studied: 1, remaining: 1, grades: ["easy"] }).ticks).toEqual([
      "easy",
      "waiting",
    ]);
  });
});
