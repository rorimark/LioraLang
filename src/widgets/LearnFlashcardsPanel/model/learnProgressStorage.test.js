import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@shared/lib/debug", () => ({
  debugLogData: vi.fn(),
}));

import {
  areLearnProgressEqual,
  DEFAULT_LEARN_PROGRESS,
  LEARN_BROWSE_PROGRESS_KEY,
  LEARN_PROGRESS_LOCAL_KEY,
  LEARN_PROGRESS_SESSION_KEY,
  normalizeLearnProgress,
  readBrowseProgressFromStorage,
  readLearnProgressFromSession,
  writeBrowseProgressToStorage,
  writeLearnProgressToSession,
} from "./learnProgressStorage.js";

describe("learnProgressStorage", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    window.localStorage.clear();
  });

  describe("normalizeLearnProgress", () => {
    it("migrates the old lastCardWordId map into the new srs and browse buckets", () => {
      expect(
        normalizeLearnProgress({
          selectedDeckId: "15",
          isBackVisible: 1,
          viewMode: "broken",
          lastCardWordIdByDeck: {
            15: 42,
            22: "  ",
          },
        }),
      ).toEqual({
        selectedDeckId: "15",
        isBackVisible: true,
        viewMode: "srs",
        lastSrsCardWordIdByDeck: {
          15: "42",
        },
        lastBrowseWordIdByDeck: {
          15: "42",
        },
      });
    });
  });

  describe("areLearnProgressEqual", () => {
    it("compares normalized values instead of the raw object shape", () => {
      expect(
        areLearnProgressEqual(
          {
            selectedDeckId: "8",
            lastCardWordIdByDeck: { 8: 3 },
          },
          {
            selectedDeckId: "8",
            viewMode: "srs",
            lastSrsCardWordIdByDeck: { 8: "3" },
            lastBrowseWordIdByDeck: { 8: "3" },
          },
        ),
      ).toBe(true);
    });
  });

  describe("session progress", () => {
    it("prefers session state and falls back to local storage when needed", () => {
      const progress = {
        selectedDeckId: "12",
        isBackVisible: true,
        viewMode: "browse",
        lastSrsCardWordIdByDeck: { 12: "77" },
        lastBrowseWordIdByDeck: { 12: "88" },
      };

      window.localStorage.setItem(LEARN_PROGRESS_LOCAL_KEY, JSON.stringify(progress));
      expect(readLearnProgressFromSession()).toEqual(progress);

      window.sessionStorage.setItem(
        LEARN_PROGRESS_SESSION_KEY,
        JSON.stringify({
          ...progress,
          selectedDeckId: "15",
        }),
      );

      expect(readLearnProgressFromSession()).toMatchObject({
        selectedDeckId: "15",
        viewMode: "browse",
      });
    });

    it("writes one normalized payload to both storages", () => {
      writeLearnProgressToSession({
        selectedDeckId: "9",
        isBackVisible: true,
        viewMode: "browse",
        lastSrsCardWordIdByDeck: { 9: 501, 10: "" },
        lastBrowseWordIdByDeck: { 9: "601" },
      });

      const sessionValue = JSON.parse(
        window.sessionStorage.getItem(LEARN_PROGRESS_SESSION_KEY),
      );
      const localValue = JSON.parse(
        window.localStorage.getItem(LEARN_PROGRESS_LOCAL_KEY),
      );

      expect(sessionValue).toEqual(localValue);
      expect(sessionValue).toEqual({
        selectedDeckId: "9",
        isBackVisible: true,
        viewMode: "browse",
        lastSrsCardWordIdByDeck: { 9: "501" },
        lastBrowseWordIdByDeck: { 9: "601" },
      });
    });

    it("falls back to defaults if storage contains broken JSON", () => {
      window.sessionStorage.setItem(LEARN_PROGRESS_SESSION_KEY, "{oops");

      expect(readLearnProgressFromSession()).toEqual(DEFAULT_LEARN_PROGRESS);
    });
  });

  describe("browse progress", () => {
    it("round-trips valid entries and quietly drops broken ones", () => {
      writeBrowseProgressToStorage({
        4: "15",
        8: 18,
        broken: "",
      });

      expect(window.localStorage.getItem(LEARN_BROWSE_PROGRESS_KEY)).toBeTruthy();
      expect(readBrowseProgressFromStorage()).toEqual({
        4: "15",
        8: "18",
      });
    });
  });
});
