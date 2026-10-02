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

  describe("buildDeckContentHash with a learned side", () => {
    const deck = { name: "Deck", sourceLanguage: "Polish", targetLanguage: "English", tags: [] };
    const words = [{ source: "wolny pokój", target: "vacant room" }];

    it("hashes the default exactly as a deck without the setting", () => {
      expect(buildDeckContentHash({ deck: { ...deck, learnedSide: "source" }, words })).toBe(
        buildDeckContentHash({ deck, words }),
      );
    });

    it("tells a deck whose target is learned apart", () => {
      expect(buildDeckContentHash({ deck: { ...deck, learnedSide: "target" }, words })).not.toBe(
        buildDeckContentHash({ deck, words }),
      );
    });
  });

  describe("subject", () => {
    const deck = { name: "Food", sourceLanguage: "English", targetLanguage: "Polish" };
    const words = [{ source: "asparagus", target: "szparag" }];

    it("hashes a language deck exactly as before subjects existed", () => {
      const before = buildDeckContentHash({ deck, words });

      expect(buildDeckContentHash({ deck: { ...deck, subject: "language" }, words })).toBe(before);
      expect(buildDeckContentHash({ deck: { ...deck, subject: "unknown" }, words })).toBe(before);
      expect(
        buildDeckContentHash({ deck, words: [{ ...words[0], subjectFields: { code: "x" } }] }),
      ).toBe(before);
    });

    it("includes code placement in the hash, leaving the default unchanged", () => {
      const deck = { name: "JS", subject: "programming" };
      const word = { source: "Question", target: "Answer", subjectFields: { code: "x = 1" } };
      const hash = buildDeckContentHash({ deck, words: [word] });
      expect(buildDeckContentHash({ deck, words: [{ ...word, subjectFields: { ...word.subjectFields, codeSide: "front" } }] })).toBe(hash);
      expect(buildDeckContentHash({ deck, words: [{ ...word, subjectFields: { ...word.subjectFields, codeSide: "back" } }] })).not.toBe(hash);
    });

    it("tells programming decks and their code apart", () => {
      const programming = { name: "JS", subject: "programming" };
      const card = { source: "What does this return?", target: "Names" };
      const plain = buildDeckContentHash({ deck: programming, words: [card] });

      expect(plain).not.toBe(buildDeckContentHash({ deck: { name: "JS" }, words: [card] }));
      expect(
        buildDeckContentHash({ deck: programming, words: [{ ...card, subjectFields: { code: "a.map(f)" } }] }),
      ).not.toBe(plain);
      expect(
        buildDeckContentHash({ deck: { ...programming, subjectFields: { technology: "JavaScript" } }, words: [card] }),
      ).not.toBe(plain);
    });
  });
});
