import { describe, expect, it } from "vitest";
import { matchesSettingsQuery, splitSettingsQuery } from "./settingsSearch";

describe("settings search", () => {
  it("splits a query into lower-case words", () => {
    expect(splitSettingsQuery("  Daily   GOAL ")).toEqual(["daily", "goal"]);
    expect(splitSettingsQuery("")).toEqual([]);
  });

  it("matches when every word appears, in any order", () => {
    const words = splitSettingsQuery("goal daily");
    expect(matchesSettingsQuery(words, "Daily goal", "Cards per session")).toBe(true);
    expect(matchesSettingsQuery(splitSettingsQuery("goal weekly"), "Daily goal")).toBe(false);
  });

  it("looks in hints and keywords too, ignoring accents", () => {
    expect(matchesSettingsQuery(splitSettingsQuery("backup"), "Auto backup", "")).toBe(true);
    expect(matchesSettingsQuery(splitSettingsQuery("keys"), "Flip card", "", ["keyboard", "keys"])).toBe(true);
    expect(matchesSettingsQuery(splitSettingsQuery("resume"), "Résumé")).toBe(true);
  });

  it("matches everything with no query", () => {
    expect(matchesSettingsQuery([], "Anything")).toBe(true);
  });
});
