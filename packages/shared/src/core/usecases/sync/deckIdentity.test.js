import { describe, expect, it } from "vitest";
import {
  buildDeckContentHash,
  normalizeDeckOriginKind,
  normalizeDeckSyncId,
  resolveDeckSyncId,
} from "./deckIdentity.js";

describe("deckIdentity", () => {
  describe("normalizeDeckSyncId", () => {
    it("accepts valid UUIDs and lowercases them", () => {
      expect(
        normalizeDeckSyncId("A8B68E13-6D1D-4C66-8BA8-4C5EC2F7F8D6"),
      ).toBe("a8b68e13-6d1d-4c66-8ba8-4c5ec2f7f8d6");
    });

    it("rejects invalid values", () => {
      expect(normalizeDeckSyncId("deck-123")).toBe("");
    });
  });

  describe("normalizeDeckOriginKind", () => {
    it("keeps supported origin kinds", () => {
      expect(normalizeDeckOriginKind("hub")).toBe("hub");
      expect(normalizeDeckOriginKind("account")).toBe("account");
    });

    it("falls back to local for invalid values", () => {
      expect(normalizeDeckOriginKind("weird")).toBe("local");
    });
  });

  describe("resolveDeckSyncId", () => {
    it("reuses a valid id when it is not already taken", () => {
      const syncId = "be7d22bb-2bca-4d8b-a84b-f9982e8749c5";

      expect(
        resolveDeckSyncId({
          currentSyncId: syncId,
          existingSyncIds: [],
        }),
      ).toBe(syncId);
    });

    it("generates a replacement when the id is already taken", () => {
      const duplicateSyncId = "be7d22bb-2bca-4d8b-a84b-f9982e8749c5";
      const nextSyncId = resolveDeckSyncId({
        currentSyncId: duplicateSyncId,
        existingSyncIds: [duplicateSyncId],
      });

      expect(nextSyncId).not.toBe(duplicateSyncId);
      expect(normalizeDeckSyncId(nextSyncId)).toBe(nextSyncId);
    });
  });

  describe("buildDeckContentHash", () => {
    it("produces the same hash for the same deck content regardless of word order", () => {
      const deck = {
        name: "Travel",
        description: "Useful words",
        sourceLanguage: "English",
        targetLanguage: "Polish",
        tertiaryLanguage: "",
        usesWordLevels: true,
        tags: ["travel", "phrases"],
      };
      const words = [
        {
          externalId: "w-2",
          source: "boarding pass",
          target: "karta pokladowa",
          tags: ["airport"],
          examples: ["Show your boarding pass"],
        },
        {
          externalId: "w-1",
          source: "ticket",
          target: "bilet",
          tags: ["travel"],
          examples: ["Buy a train ticket"],
        },
      ];

      expect(
        buildDeckContentHash({
          deck,
          words,
        }),
      ).toBe(
        buildDeckContentHash({
          deck,
          words: [...words].reverse(),
        }),
      );
    });
  });
});
