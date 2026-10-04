import { describe, expect, it } from "vitest";
import { buildI18nValue, ENGLISH_MESSAGES } from "@shared/lib/i18n";
import { stickerGoal, stickerStatus } from "./stickerText";

const en = buildI18nValue("en", ENGLISH_MESSAGES);

describe("sticker text", () => {
  it("names the goal whether the tier holds its family's key or the family", () => {
    expect(stickerGoal(en, { family: "known", target: 100 })).toBe("Know 100 cards.");
    expect(stickerGoal(en, { family: { key: "known" }, target: 100 })).toBe("Know 100 cards.");
    expect(stickerGoal(en, { family: { key: "days" }, target: 1 })).toBe("Finish your first review.");
  });

  it("says how far along a tier is", () => {
    expect(stickerStatus(en, { family: { key: "known" }, target: 100, progress: 97, earned: false })).toBe(
      "97 of 100 cards, 3 to go",
    );
  });
});
