import { beforeEach, describe, expect, it } from "vitest";
import {
  createLearnSessionSettingsDefaults,
  LEARN_EXERCISE_MODE_FLASHCARDS,
  LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
  LEARN_SESSION_SETTINGS_LOCAL_KEY,
  LEARN_SESSION_SETTINGS_SESSION_KEY,
  LEARN_SESSION_SETTINGS_STORAGE_VERSION,
  normalizeLearnSessionSettings,
  pickLocalOnlyLearnSessionSettings,
  readLearnSessionSettingsFromStorage,
  resolveEffectiveDirectionMode,
  writeLearnSessionSettingsToStorage,
} from "./learnSessionSettings.js";

describe("learnSessionSettings", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  it("builds defaults from app preferences", () => {
    expect(
      createLearnSessionSettingsDefaults({
        studySession: {
          dailyGoal: 35,
          autoFlipDelay: "2s",
          shuffleMode: "always",
          repeatWrongCards: true,
        },
      }),
    ).toMatchObject({
      directionMode: LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
      exerciseMode: LEARN_EXERCISE_MODE_FLASHCARDS,
      dailyGoal: 35,
      autoFlipDelay: "2s",
      shuffleMode: "always",
      repeatWrongCards: true,
      showExamples: false,
      showLevel: false,
      showPartOfSpeech: false,
    });
  });

  it("normalizes invalid values back to safe defaults", () => {
    expect(
      normalizeLearnSessionSettings(
        {
          directionMode: "broken",
          exerciseMode: "broken",
          dailyGoal: 0,
          autoFlipDelay: "broken",
          shuffleMode: "broken",
          repeatWrongCards: "broken",
          showExamples: 1,
          showLevel: 1,
          showPartOfSpeech: 1,
        },
        {
          studySession: {
            dailyGoal: 20,
            autoFlipDelay: "off",
            shuffleMode: "per_session",
            repeatWrongCards: false,
          },
        },
      ),
    ).toEqual({
      directionMode: LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
      exerciseMode: LEARN_EXERCISE_MODE_FLASHCARDS,
      dailyGoal: 1,
      autoFlipDelay: "off",
      shuffleMode: "per_session",
      repeatWrongCards: false,
      showExamples: false,
      showLevel: false,
      showPartOfSpeech: false,
    });
  });

  it("writes only local session overrides to storage and restores shared study settings from app preferences", () => {
    const settings = {
      directionMode: LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
      exerciseMode: LEARN_EXERCISE_MODE_FLASHCARDS,
      dailyGoal: 45,
      autoFlipDelay: "3s",
      shuffleMode: "off",
      repeatWrongCards: true,
      showExamples: false,
      showLevel: true,
      showPartOfSpeech: false,
    };
    const appPreferences = {
      studySession: {
        dailyGoal: 18,
        autoFlipDelay: "1s",
        shuffleMode: "always",
        repeatWrongCards: false,
      },
    };

    writeLearnSessionSettingsToStorage(settings, appPreferences);

    expect(JSON.parse(window.sessionStorage.getItem(LEARN_SESSION_SETTINGS_SESSION_KEY))).toEqual({
      ...pickLocalOnlyLearnSessionSettings(settings),
      version: LEARN_SESSION_SETTINGS_STORAGE_VERSION,
    });
    expect(
      JSON.parse(window.sessionStorage.getItem(LEARN_SESSION_SETTINGS_SESSION_KEY)),
    ).toEqual(
      JSON.parse(window.localStorage.getItem(LEARN_SESSION_SETTINGS_LOCAL_KEY)),
    );
    expect(readLearnSessionSettingsFromStorage(appPreferences)).toEqual({
      ...pickLocalOnlyLearnSessionSettings(settings),
      dailyGoal: 18,
      autoFlipDelay: "1s",
      shuffleMode: "always",
      repeatWrongCards: false,
    });
  });

  it("ignores old shared study values from storage when app preferences changed", () => {
    window.sessionStorage.setItem(
      LEARN_SESSION_SETTINGS_SESSION_KEY,
      JSON.stringify({
        directionMode: LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
        exerciseMode: LEARN_EXERCISE_MODE_FLASHCARDS,
        dailyGoal: 99,
        autoFlipDelay: "3s",
        shuffleMode: "off",
        repeatWrongCards: true,
        showExamples: true,
        showLevel: false,
        showPartOfSpeech: true,
        version: LEARN_SESSION_SETTINGS_STORAGE_VERSION,
      }),
    );

    expect(
      readLearnSessionSettingsFromStorage({
        studySession: {
          dailyGoal: 14,
          autoFlipDelay: "2s",
          shuffleMode: "per_session",
          repeatWrongCards: false,
        },
      }),
    ).toMatchObject({
      directionMode: LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
      dailyGoal: 14,
      autoFlipDelay: "2s",
      shuffleMode: "per_session",
      repeatWrongCards: false,
      showExamples: true,
      showLevel: false,
      showPartOfSpeech: true,
    });
  });

  it("migrates legacy stored card detail defaults to unchecked", () => {
    window.sessionStorage.setItem(
      LEARN_SESSION_SETTINGS_SESSION_KEY,
      JSON.stringify({
        directionMode: LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
        exerciseMode: LEARN_EXERCISE_MODE_FLASHCARDS,
        dailyGoal: 20,
        autoFlipDelay: "off",
        shuffleMode: "per_session",
        repeatWrongCards: false,
        showExamples: true,
        showLevel: true,
        showPartOfSpeech: true,
      }),
    );

    expect(readLearnSessionSettingsFromStorage({})).toMatchObject({
      showExamples: false,
      showLevel: false,
      showPartOfSpeech: false,
    });
  });

  it("falls back to defaults when storage contains broken json", () => {
    window.sessionStorage.setItem(LEARN_SESSION_SETTINGS_SESSION_KEY, "{oops");

    expect(readLearnSessionSettingsFromStorage({})).toMatchObject({
      directionMode: LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
      exerciseMode: LEARN_EXERCISE_MODE_FLASHCARDS,
    });
  });

  it("resolves a stable direction for mixed mode per word", () => {
    const first = resolveEffectiveDirectionMode("mixed", { wordId: "12" });
    const second = resolveEffectiveDirectionMode("mixed", { wordId: "12" });

    expect(first).toBe(second);
    expect([
      LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
      LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
    ]).toContain(first);
  });
});
