import { describe, expect, it } from "vitest";
import { buildReviewTimeline } from "./useReviewTimeline";

describe("buildReviewTimeline", () => {
  it("follows the engine's schedule for a word answered Good every time", () => {
    const timeline = buildReviewTimeline();

    expect(timeline.reviews).toBe(6);
    // FSRS: fast at first, slower as the memory settles, and never past the
    // year-long longest gap.
    expect(timeline.points.map((point) => point.gapLabel)).toEqual(["3d", "11d", "35d", "101d", "269d", "365d"]);
    expect(timeline.points.at(-1).day).toBe(784);
    expect(timeline.firstGaps).toEqual([3, 11, 35]);
    expect(timeline.span).toEqual({ unit: "years", count: 2 });
  });

  it("scales each bar by its gap, with the longest gap at full height", () => {
    const heights = buildReviewTimeline().points.map((point) => point.height);

    expect(heights.at(-1)).toBe(1);
    expect(Math.min(...heights)).toBeGreaterThan(0);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });
});
