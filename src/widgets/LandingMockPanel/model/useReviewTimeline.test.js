import { describe, expect, it } from "vitest";
import { buildReviewTimeline } from "./useReviewTimeline";

describe("buildReviewTimeline", () => {
  it("follows the engine's schedule for a word answered Good every time", () => {
    const timeline = buildReviewTimeline();

    expect(timeline.reviews).toBe(8);
    expect(timeline.points.map((point) => point.gapLabel)).toEqual([
      "+1d",
      "+3d",
      "+1d",
      "+3d",
      "+8d",
      "+20d",
      "+50d",
      "+125d",
    ]);
    expect(timeline.points.at(-1).day).toBe(211);
    expect(timeline.months).toBe(7);
  });

  it("scales each bar by its gap, with the longest gap at full height", () => {
    const heights = buildReviewTimeline().points.map((point) => point.height);

    expect(heights.at(-1)).toBe(1);
    expect(Math.min(...heights)).toBeGreaterThan(0);
    // Learning steps (+1d, +3d, +1d, +3d) first, then every gap grows.
    expect(heights.slice(3)).toEqual([...heights.slice(3)].sort((a, b) => a - b));
  });
});
