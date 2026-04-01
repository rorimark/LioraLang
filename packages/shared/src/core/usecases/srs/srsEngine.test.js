import { describe, expect, it } from "vitest";
import {
  DEFAULT_STUDY_SETTINGS,
  SRS_CARD_STATES,
  buildRatingPreview,
  normalizeReviewCard,
  normalizeSrsSettings,
  normalizeStudySettings,
  resolveScheduleOutcome,
} from "./srsEngine.js";

describe("srsEngine", () => {
  describe("settings normalization", () => {
    it("parses spaced repetition settings from user preferences", () => {
      expect(
        normalizeSrsSettings({
          spacedRepetition: {
            newCardsPerDay: 30,
            maxReviewsPerDay: 250,
            learningSteps: "10m, 1d, 3d",
            easyBonus: 145,
            lapsePenalty: 65,
          },
        }),
      ).toEqual({
        newCardsPerDay: 30,
        maxReviewsPerDay: 250,
        learningStepsMinutes: [10, 1440, 4320],
        easyBonus: 1.45,
        lapsePenalty: 0.65,
      });
    });

    it("drops the shuffle seed when shuffle mode makes it irrelevant", () => {
      expect(
        normalizeStudySettings({
          studySession: {
            shuffleMode: "always",
            shuffleSeed: 999,
            dailyGoal: 35,
            repeatWrongCards: false,
          },
        }),
      ).toEqual({
        shuffleMode: "always",
        shuffleSeed: null,
        dailyGoal: 35,
        repeatWrongCards: false,
      });

      expect(normalizeStudySettings({})).toMatchObject({
        shuffleMode: "off",
        repeatWrongCards: DEFAULT_STUDY_SETTINGS.repeatWrongCards,
      });
    });
  });

  describe("card normalization", () => {
    it("stabilizes malformed review cards instead of letting bad values leak through", () => {
      expect(
        normalizeReviewCard({
          state: "broken",
          dueAt: "not-a-date",
          intervalDays: -5,
          easeFactor: 99,
          reps: -1,
          lapses: "oops",
        }),
      ).toEqual({
        state: SRS_CARD_STATES.new,
        learningStep: 0,
        dueAtMs: null,
        dueAt: null,
        intervalDays: 0,
        easeFactor: 3,
        reps: 0,
        lapses: 0,
      });
    });
  });

  describe("resolveScheduleOutcome", () => {
    it("graduates a new card straight into review on easy", () => {
      const nowMs = Date.UTC(2026, 2, 29, 12, 0, 0);
      const outcome = resolveScheduleOutcome({
        card: { state: "new" },
        rating: "easy",
        srsSettings: normalizeSrsSettings({
          learningSteps: "10m, 1d, 3d",
          easyBonus: 130,
        }),
        studySettings: normalizeStudySettings({ repeatWrongCards: false }),
        nowMs,
      });

      expect(outcome).toMatchObject({
        state: SRS_CARD_STATES.review,
        learningStep: 0,
        intervalDays: 3,
        reps: 1,
        lapses: 0,
      });
      expect(outcome.dueAtMs).toBeGreaterThan(nowMs);
    });

    it("keeps failed review cards in the session when repeatWrongCards is enabled", () => {
      const nowMs = Date.UTC(2026, 2, 29, 12, 0, 0);
      const outcome = resolveScheduleOutcome({
        card: {
          state: "review",
          dueAtMs: nowMs - 60_000,
          intervalDays: 10,
          easeFactor: 2.5,
          reps: 4,
          lapses: 1,
        },
        rating: "again",
        srsSettings: normalizeSrsSettings({
          learningSteps: "10m, 1d, 3d",
          lapsePenalty: 70,
        }),
        studySettings: normalizeStudySettings({ repeatWrongCards: true }),
        nowMs,
      });

      expect(outcome).toMatchObject({
        state: SRS_CARD_STATES.relearning,
        learningStep: 0,
        dueAtMs: nowMs,
        intervalDays: 7,
        reps: 3,
        lapses: 2,
      });
    });
  });

  describe("buildRatingPreview", () => {
    it("returns the labels that the UI shows next to grading buttons", () => {
      const nowMs = Date.UTC(2026, 2, 29, 12, 0, 0);

      expect(
        buildRatingPreview({
          card: { state: "new" },
          srsSettings: normalizeSrsSettings({
            learningSteps: "10m, 1d, 3d",
          }),
          studySettings: normalizeStudySettings({ repeatWrongCards: false }),
          nowMs,
        }),
      ).toEqual({
        again: "10m",
        hard: "15m",
        good: "24h",
        easy: "3d",
      });
    });
  });
});
