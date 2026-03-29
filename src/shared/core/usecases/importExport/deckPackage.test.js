import { describe, expect, it, vi } from "vitest";
import {
  buildExportDeckPackage,
  getDeckImportMetadata,
  normalizeWordsForImport,
  parseDeckPackageFileText,
  resolveImportConfig,
  validateDeckPackageObject,
  validateImportLanguages,
} from "./deckPackage.js";

const buildParsedPackage = (overrides = {}) => ({
  format: "lioralang.deck",
  version: 1,
  deck: {
    name: "Travel pack",
    description: "Useful travel words",
    sourceLanguage: "English",
    targetLanguage: "Polish",
    tertiaryLanguage: "",
    tags: ["travel"],
    ...(overrides.deck ?? {}),
  },
  words: overrides.words ?? [],
});

describe("deckPackage", () => {
  describe("parseDeckPackageFileText", () => {
    it("accepts a BOM-prefixed file and keeps the deck metadata intact", () => {
      const parsed = parseDeckPackageFileText(
        `\uFEFF${JSON.stringify(
          buildParsedPackage({
            deck: {
              tags: ["travel", "Travel", " phrases "],
            },
            words: [{ id: "w1", source: "ticket", target: "bilet" }],
          }),
        )}`,
      );

      expect(parsed.deck).toMatchObject({
        name: "Travel pack",
        description: "Useful travel words",
        sourceLanguage: "English",
        targetLanguage: "Polish",
        tags: ["travel", "phrases"],
      });
      expect(validateDeckPackageObject(parsed)).toEqual({
        format: "lioralang.deck",
        version: 1,
        wordsCount: 1,
      });
    });
  });

  describe("normalizeWordsForImport", () => {
    const parsedPackage = {
      words: [
        {
          id: "1",
          source: "guidebook",
          target: "przewodnik",
          level: "a1",
          tags: ["travel", "Travel"],
          examples: ["Pack a guidebook", "Pack a guidebook", "Buy one"],
        },
        {
          id: "2",
          source: "guidebook",
          target: "przewodnik",
          level: "b1",
          tags: ["updated"],
          examples: ["Use the updated phrase"],
        },
      ],
    };

    it("keeps the latest duplicate when the strategy is update", () => {
      const result = normalizeWordsForImport({
        parsedPackage,
        sourceLanguage: "English",
        targetLanguage: "Polish",
        tertiaryLanguage: "",
        duplicateStrategy: "update",
        includeTags: true,
        includeExamples: true,
      });

      expect(result.skippedCount).toBe(1);
      expect(result.words).toHaveLength(1);
      expect(result.words[0]).toMatchObject({
        source: "guidebook",
        target: "przewodnik",
        level: "B1",
        tags: ["updated"],
        examples: ["Use the updated phrase"],
      });
    });

    it("drops optional tags and examples when the import settings say so", () => {
      const result = normalizeWordsForImport({
        parsedPackage,
        sourceLanguage: "English",
        targetLanguage: "Polish",
        tertiaryLanguage: "",
        duplicateStrategy: "keep_both",
        includeTags: false,
        includeExamples: false,
      });

      expect(result.words).toHaveLength(2);
      expect(result.words[0].tags).toEqual([]);
      expect(result.words[0].examples).toEqual([]);
    });
  });

  describe("resolveImportConfig", () => {
    it("lets explicit payload values win over package metadata", () => {
      const parsedPackage = {
        deck: {
          name: "Imported name",
          description: "Imported description",
          sourceLanguage: "English",
          targetLanguage: "Polish",
          tertiaryLanguage: "German",
          tags: ["education"],
        },
      };

      const config = resolveImportConfig({
        payload: {
          deckName: "My renamed deck",
          sourceLanguage: "French",
          settings: {
            duplicateStrategy: "update",
            includeExamples: false,
            includeTags: false,
          },
        },
        parsedPackage,
        fallbackDeckName: "Fallback deck",
      });

      expect(config).toEqual({
        deckName: "My renamed deck",
        sourceLanguage: "French",
        targetLanguage: "Polish",
        tertiaryLanguage: "German",
        duplicateStrategy: "update",
        includeExamples: false,
        includeTags: false,
        description: "Imported description",
        tags: [],
      });
    });
  });

  describe("validateImportLanguages", () => {
    it("rejects invalid language combinations before import starts", () => {
      expect(() =>
        validateImportLanguages({
          sourceLanguage: "English",
          targetLanguage: "English",
        }),
      ).toThrow("Source and target languages should be different");

      expect(() =>
        validateImportLanguages({
          sourceLanguage: "English",
          targetLanguage: "Polish",
          tertiaryLanguage: "Polish",
        }),
      ).toThrow("Optional language should be different from source and target");
    });
  });

  describe("buildExportDeckPackage", () => {
    it("keeps all examples and exports a clean tag set", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-29T10:15:00.000Z"));

      const result = buildExportDeckPackage({
        deck: {
          name: "Education deck",
          description: "Phrases for school",
          sourceLanguage: "English",
          targetLanguage: "Polish",
          tagsJson: JSON.stringify(["school", "School", "learning"]),
        },
        words: [
          {
            externalId: "word-1",
            source: "exam",
            target: "egzamin",
            tertiary: "Prüfung",
            level: "B1",
            part_of_speech: "noun",
            tags: ["school", "tests"],
            examples: ["Pass the exam", "Study for the exam"],
          },
        ],
      });

      expect(result).toMatchObject({
        format: "lioralang.deck",
        version: 1,
        deck: {
          name: "Education deck",
          sourceLanguage: "English",
          targetLanguage: "Polish",
          tertiaryLanguage: "",
          tags: ["school", "learning"],
        },
      });
      expect(result.words[0]).toEqual({
        id: "word-1",
        source: "exam",
        target: "egzamin",
        level: "B1",
        part_of_speech: "noun",
        tags: ["school", "tests"],
        examples: ["Pass the exam", "Study for the exam"],
      });

      expect(
        getDeckImportMetadata({ parsedPackage: result, fileName: "ignored.lioradeck" }),
      ).toMatchObject({
        suggestedDeckName: "Education deck",
        wordsCount: 1,
        sourceLanguage: "English",
        targetLanguage: "Polish",
        tags: ["school", "learning"],
      });

      vi.useRealTimers();
    });
  });
});
