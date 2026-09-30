import { describe, expect, it } from "vitest";
import {
  CARD_DIRECTIONS,
  CONTENT_TYPES,
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
  it("shows a text card exactly as before", () => {
    const faces = resolveCardFaces(textOnly, CARD_DIRECTIONS.sourceToTarget);

    expect(faces.direction).toBe(CARD_DIRECTIONS.sourceToTarget);
    expect(faces.front).toEqual({ type: CONTENT_TYPES.text, role: "source", text: "house" });
    expect(faces.back).toEqual({ type: CONTENT_TYPES.text, role: "translation", text: "dom" });
    expect(faces.detail).toBeNull();
  });

  it("joins every translation on the back", () => {
    const faces = resolveCardFaces({ ...textOnly, tertiary: "Haus" }, CARD_DIRECTIONS.sourceToTarget);
    expect(faces.back.text).toBe("dom • Haus");
  });

  it("asks for the word from its picture, with the translation under the answer", () => {
    const faces = resolveCardFaces(word, CARD_DIRECTIONS.imageToSource);

    expect(faces.front).toEqual({ type: CONTENT_TYPES.image, assetId: ASSET_ID, alt: "Green stalks on a plate" });
    expect(faces.back.text).toBe("asparagus");
    expect(faces.detail.text).toBe("szparag");
  });

  it("asks for the picture from the word", () => {
    const faces = resolveCardFaces(word, CARD_DIRECTIONS.sourceToImage);

    expect(faces.front.text).toBe("asparagus");
    expect(faces.back.type).toBe(CONTENT_TYPES.image);
  });

  it("shows a word without a picture as text in a picture direction", () => {
    expect(resolveCardDirection(CARD_DIRECTIONS.imageToSource, textOnly)).toBe(CARD_DIRECTIONS.sourceToTarget);
    expect(resolveCardFaces(textOnly, CARD_DIRECTIONS.sourceToImage).back.text).toBe("dom");
  });

  it("keeps mixed to the two text directions, the same way every time", () => {
    const first = resolveCardDirection(CARD_DIRECTIONS.mixed, word);

    expect([CARD_DIRECTIONS.sourceToTarget, CARD_DIRECTIONS.targetToSource]).toContain(first);
    expect(resolveCardDirection(CARD_DIRECTIONS.mixed, word)).toBe(first);
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
