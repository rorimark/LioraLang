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
        syncId: "",
        originKind: "local",
        originRef: "",
        contentHash: "",
        pictureSide: "",
        learnedSide: "",
        subject: "",
        subjectFields: {},
      });
    });

    it("leaves a language deck's package exactly as it was", () => {
      const exported = buildExportDeckPackage({
        deck: { name: "Food", sourceLanguage: "English", targetLanguage: "Polish", subject: "language" },
        words: [{ source: "asparagus", target: "szparag", subjectFields: { code: "x" } }],
      });

      expect(exported.version).toBe(1);
      expect(exported.deck).not.toHaveProperty("subject");
      expect(exported.deck).not.toHaveProperty("subjectFields");
      expect(exported.words[0]).not.toHaveProperty("subjectFields");
    });

    it("carries a programming deck through export and import without languages", () => {
      const exported = buildExportDeckPackage({
        deck: { name: "JavaScript", subject: "programming", subjectFields: { technology: "JavaScript" } },
        words: [
          {
            externalId: "w1",
            source: "What does this return?",
            target: "A new array of names.",
            subjectFields: { code: "users.map(user => user.name)", difficulty: "medium", stray: "x" },
          },
        ],
      });

      expect(exported.deck.subject).toBe("programming");
      // An app that knows only version 1 refuses it instead of losing the code.
      expect(exported.version).toBe(2);
      expect(exported.deck.subjectFields).toEqual({ technology: "JavaScript" });
      expect(exported.words[0].subjectFields).toEqual({
        code: "users.map(user => user.name)",
        difficulty: "medium",
      });

      const parsedPackage = parseDeckPackageFileText(JSON.stringify(exported));
      const config = resolveImportConfig({ parsedPackage });

      expect(config.subject).toBe("programming");
      expect(config.subjectFields).toEqual({ technology: "JavaScript" });
      expect(config.sourceLanguage).toBe("");
      expect(config.targetLanguage).toBe("");
      expect(() => validateImportLanguages(config)).not.toThrow();

      const { words } = normalizeWordsForImport({ parsedPackage, ...config });
      expect(words[0].subjectFields).toEqual({ code: "users.map(user => user.name)", difficulty: "medium" });
      expect(words[0].level).toBeNull();
    });

    it("requires a new reader for answer-side code and preserves it on import", () => {
      const exported = buildExportDeckPackage({
        deck: { name: "Code answers", subject: "programming" },
        words: [{ source: "Declare a constant", target: "An immutable binding.\nUse const.", subjectFields: { code: "const x = 1;", codeSide: "back" } }],
      });
      expect(exported.version).toBe(3);
      const parsedPackage = parseDeckPackageFileText(JSON.stringify(exported));
      const config = resolveImportConfig({ parsedPackage });
      const { words } = normalizeWordsForImport({ parsedPackage, ...config });
      expect(words[0].subjectFields).toEqual({ code: "const x = 1;", codeSide: "back" });
      expect(words[0].target).toContain("\n");
    });

    it("keeps a deck's learned side through export and import", () => {
      const exported = buildExportDeckPackage({
        deck: { name: "Vacant", sourceLanguage: "Polish", targetLanguage: "English", learnedSide: "target" },
        words: [{ source: "wolny pokój", target: "vacant room" }],
      });

      expect(exported.deck.learnedSide).toBe("target");

      const parsed = parseDeckPackageFileText(JSON.stringify(exported));
      expect(parsed.deck.learnedSide).toBe("target");
      expect(resolveImportConfig({ parsedPackage: parsed }).learnedSide).toBe("target");

      // The default is not written at all, so older packages stay as they were.
      const plain = buildExportDeckPackage({
        deck: { name: "Plain", sourceLanguage: "English", targetLanguage: "Polish", learnedSide: "source" },
        words: [{ source: "ticket", target: "bilet" }],
      });
      expect("learnedSide" in plain.deck).toBe(false);
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
          syncId: "550e8400-e29b-41d4-a716-446655440000",
          originKind: "account",
          originRef: "library-deck-1",
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
          syncId: "550e8400-e29b-41d4-a716-446655440000",
          originKind: "account",
          originRef: "library-deck-1",
          tags: ["school", "learning"],
        },
      });
      expect(result.deck.contentHash).toMatch(/^deckh_[0-9a-f]{8}$/);
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
        syncId: "550e8400-e29b-41d4-a716-446655440000",
        originKind: "account",
        originRef: "library-deck-1",
      });

      vi.useRealTimers();
    });
  });
});
