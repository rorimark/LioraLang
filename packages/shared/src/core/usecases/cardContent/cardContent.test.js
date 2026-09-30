import { describe, expect, it } from "vitest";
import {
  CARD_DIRECTIONS,
  CONTENT_TYPES,
  hasWordContent,
  hasWordImage,
  normalizeWordImage,
  resolveCardDirection,
  resolveCardFaces,
} from "./cardContent.js";
import { base64ToBytes, bytesToBase64, sniffImageMimeType } from "./mediaBytes.js";

const ASSET_ID = "a".repeat(64);
const word = {
  id: 7,
  source: "asparagus",
  target: "szparag",
  tertiary: "",
  image: { assetId: ASSET_ID, alt: "Green stalks on a plate" },
};
const textOnly = { id: 8, source: "house", target: "dom", tertiary: "" };

describe("normalizeWordImage", () => {
  it("keeps an asset id and a tidy description", () => {
    expect(normalizeWordImage({ assetId: ASSET_ID.toUpperCase(), alt: "  a   plate " })).toEqual({
      assetId: ASSET_ID,
      alt: "a plate",
    });
  });

  it("reads the stored JSON form", () => {
    expect(normalizeWordImage(JSON.stringify({ assetId: ASSET_ID }))).toEqual({ assetId: ASSET_ID, alt: "" });
  });

  it("is no picture for anything that is not an asset", () => {
    expect(normalizeWordImage(null)).toBeNull();
    expect(normalizeWordImage({ assetId: "https://example.com/a.png" })).toBeNull();
    expect(normalizeWordImage("not json")).toBeNull();
    expect(hasWordImage(textOnly)).toBe(false);
  });
});

describe("resolveCardFaces", () => {
  const pictureDeck = { pictureSide: "source", targetLanguage: "Polish" };

  it("shows a text card exactly as before", () => {
    const faces = resolveCardFaces(textOnly, CARD_DIRECTIONS.sourceToTarget);

    expect(faces.direction).toBe(CARD_DIRECTIONS.sourceToTarget);
    expect(faces.front).toEqual({ type: CONTENT_TYPES.text, role: "source", text: "house" });
    expect(faces.back).toEqual({ type: CONTENT_TYPES.text, role: "translation", text: "dom" });
  });

  it("joins every translation on the back", () => {
    const faces = resolveCardFaces({ ...textOnly, tertiary: "Haus" }, CARD_DIRECTIONS.sourceToTarget);
    expect(faces.back.text).toBe("dom • Haus");
  });

  it("puts the picture where the word would be in a picture deck", () => {
    const pictured = { ...word, source: "" };
    const forward = resolveCardFaces(pictured, CARD_DIRECTIONS.sourceToTarget, pictureDeck);
    const reverse = resolveCardFaces(pictured, CARD_DIRECTIONS.targetToSource, pictureDeck);

    expect(forward.front).toEqual({ type: CONTENT_TYPES.image, assetId: ASSET_ID, alt: "Green stalks on a plate" });
    expect(forward.back.text).toBe("szparag");
    expect(reverse.front.text).toBe("szparag");
    expect(reverse.back.type).toBe(CONTENT_TYPES.image);
  });

  it("can have the picture on the answer side", () => {
    const faces = resolveCardFaces(word, CARD_DIRECTIONS.sourceToTarget, { pictureSide: "target" });

    expect(faces.front.text).toBe("asparagus");
    expect(faces.back.type).toBe(CONTENT_TYPES.image);
  });

  it("ignores a word's picture in a deck without a picture side", () => {
    expect(resolveCardFaces(word, CARD_DIRECTIONS.sourceToTarget).front.text).toBe("asparagus");
  });

  it("falls back to the description when a picture side has no picture", () => {
    const faces = resolveCardFaces({ source: "", target: "chleb" }, CARD_DIRECTIONS.sourceToTarget, pictureDeck);
    expect(faces.front).toMatchObject({ type: CONTENT_TYPES.text, text: "" });
  });

  it("alternates mixed between the two directions, the same way every time", () => {
    const seen = new Set(
      Array.from({ length: 40 }, (_, id) => resolveCardDirection(CARD_DIRECTIONS.mixed, { ...word, id })),
    );

    expect([...seen].sort()).toEqual([CARD_DIRECTIONS.sourceToTarget, CARD_DIRECTIONS.targetToSource]);
    expect(resolveCardDirection(CARD_DIRECTIONS.mixed, word)).toBe(resolveCardDirection(CARD_DIRECTIONS.mixed, word));
  });

  it("knows a pictured word without text is still a word", () => {
    expect(hasWordContent({ source: "", image: { assetId: ASSET_ID } })).toBe(true);
    expect(hasWordContent({ source: " " })).toBe(false);
  });
});

describe("media bytes", () => {
  it("recognises picture formats by their bytes, not their names", () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const svg = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>");

    expect(sniffImageMimeType(png)).toBe("image/png");
    expect(sniffImageMimeType(svg)).toBe("");
  });

  it("round-trips bytes through base64", () => {
    const bytes = new Uint8Array(70_000).map((_, index) => index % 256);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    expect(base64ToBytes("not base64!")).toBeNull();
  });
});
