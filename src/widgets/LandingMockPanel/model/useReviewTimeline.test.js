import { describe, expect, it } from "vitest";
import { buildReviewTimeline } from "./useReviewTimeline";

describe("buildReviewTimeline", () => {
  it("follows the engine's schedule for a word answered Good every time", () => {
    const timeline = buildReviewTimeline();

    expect(timeline.reviews).toBe(6);
    expect(timeline.points.map((point) => point.gapLabel)).toEqual(["3d", "8d", "20d", "50d", "125d", "313d"]);
    expect(timeline.points.at(-1).day).toBe(519);
    expect(timeline.firstGaps).toEqual([3, 8, 20]);
    expect(timeline.span).toEqual({ unit: "months", count: 17 });
  });

  it("scales each bar by its gap, with the longest gap at full height", () => {
    const heights = buildReviewTimeline().points.map((point) => point.height);

    expect(heights.at(-1)).toBe(1);
    expect(Math.min(...heights)).toBeGreaterThan(0);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });
});
