import { describe, expect, it } from "vitest";
import {
  buildExportDeckPackage,
  collectWordImageAssetIds,
  normalizeWordsForImport,
  parseDeckPackageFileText,
  parseDeckPackageMedia,
  remapWordImages,
  resolveImportConfig,
  validateImportLanguages,
} from "./deckPackage.js";
import { bytesToBase64 } from "../cardContent/mediaBytes.js";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5, 6]);
const ASSET_ID = "b".repeat(64);
const OTHER_ID = "c".repeat(64);
const deck = { name: "Food", sourceLanguage: "English", targetLanguage: "Polish" };
const words = [
  { externalId: "w1", source: "asparagus", target: "szparag", image: { assetId: ASSET_ID, alt: "Green stalks" } },
  { externalId: "w2", source: "bread", target: "chleb", image: null },
];

const importWords = (parsedPackage) =>
  normalizeWordsForImport({
    parsedPackage,
    sourceLanguage: "English",
    targetLanguage: "Polish",
    duplicateStrategy: "skip",
    includeTags: true,
    includeExamples: true,
  }).words;

describe("deck packages with pictures", () => {
  it("writes a text-only deck exactly as before: no image keys, no media", () => {
    const exported = buildExportDeckPackage({ deck, words: [{ externalId: "w1", source: "bread", target: "chleb" }] });

    expect(exported.version).toBe(1);
    expect(exported).not.toHaveProperty("media");
    expect(exported.words[0]).not.toHaveProperty("image");
  });

  it("carries each picture once, only when a word uses it", () => {
    const exported = buildExportDeckPackage({
      deck,
      words,
      media: [
        { id: ASSET_ID, mimeType: "image/png", width: 4, height: 3, byteSize: PNG.length, data: bytesToBase64(PNG) },
        { id: OTHER_ID, mimeType: "image/png", data: bytesToBase64(PNG) },
      ],
    });

    expect(exported.words[0].image).toEqual({ assetId: ASSET_ID, alt: "Green stalks" });
    expect(exported.words[1]).not.toHaveProperty("image");
    expect(exported.media.map((item) => item.id)).toEqual([ASSET_ID]);
  });

  it("reads an old package without pictures", () => {
    const parsed = parseDeckPackageFileText(
      JSON.stringify({ format: "lioralang.deck", version: 1, deck, words: [{ source: "bread", target: "chleb" }] }),
    );

    expect(parsed.media).toEqual([]);
    expect(importWords(parsed)[0].image).toBeNull();
  });

  it("round-trips a package with pictures", () => {
    const exported = buildExportDeckPackage({
      deck,
      words,
      media: [{ id: ASSET_ID, mimeType: "image/png", data: bytesToBase64(PNG) }],
    });
    const parsed = parseDeckPackageFileText(JSON.stringify(exported));
    const media = parseDeckPackageMedia(parsed);

    expect(importWords(parsed)[0].image).toEqual({ assetId: ASSET_ID, alt: "Green stalks" });
    expect(media).toHaveLength(1);
    expect(media[0]).toMatchObject({ declaredId: ASSET_ID, mimeType: "image/png" });
    expect(media[0].bytes).toEqual(PNG);
  });

  it("drops media that is not a picture, is too big or is malformed", () => {
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script/></svg>");
    const parsed = {
      media: [
        { id: ASSET_ID, data: bytesToBase64(svg) },
        { id: "not-a-hash", data: bytesToBase64(PNG) },
        { id: OTHER_ID, data: "%%%" },
        { id: "d".repeat(64), data: bytesToBase64(new Uint8Array(3 * 1024 * 1024 + 1)) },
      ],
    };

    expect(parseDeckPackageMedia(parsed)).toEqual([]);
  });

  it("points words at the stored ids and forgets pictures that never arrived", () => {
    const remapped = remapWordImages(words, new Map([[ASSET_ID, OTHER_ID]]), new Set([OTHER_ID]));

    expect(remapped[0].image.assetId).toBe(OTHER_ID);
    expect(remapWordImages(words, new Map(), new Set())[0].image).toBeNull();
    expect([...collectWordImageAssetIds(words)]).toEqual([ASSET_ID]);
  });
});

describe("picture decks", () => {
  const pictureDeck = { name: "Pictures", sourceLanguage: "", targetLanguage: "Polish", pictureSide: "source" };
  const pictured = [
    { externalId: "p1", source: "", target: "szparag", image: { assetId: ASSET_ID, alt: "Green stalks" } },
    { externalId: "p2", source: "", target: "szparag", image: { assetId: OTHER_ID, alt: "" } },
  ];

  it("keeps the picture side and the words that have only a picture", () => {
    const exported = buildExportDeckPackage({ deck: pictureDeck, words: pictured });
    const parsed = parseDeckPackageFileText(JSON.stringify(exported));
    const config = resolveImportConfig({ parsedPackage: parsed });

    expect(exported.deck.pictureSide).toBe("source");
    expect(config).toMatchObject({ pictureSide: "source", sourceLanguage: "", targetLanguage: "Polish" });
    expect(() => validateImportLanguages(config)).not.toThrow();
    expect(importWords(parsed).map((word) => word.image.assetId)).toEqual([ASSET_ID, OTHER_ID]);
  });

  it("still asks a text deck for both languages", () => {
    expect(() => validateImportLanguages({ sourceLanguage: "", targetLanguage: "Polish" })).toThrow();
    expect(buildExportDeckPackage({ deck, words: [] }).deck).not.toHaveProperty("pictureSide");
  });
});
