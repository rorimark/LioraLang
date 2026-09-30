import { describe, expect, it } from "vitest";
import { fitWithin, IMAGE_ERROR_KEYS, validateImageFile } from "./prepareImage.js";

describe("prepareImage", () => {
  it("caps the long side and never enlarges", () => {
    expect(fitWithin(4000, 3000, 1280)).toEqual({ width: 1280, height: 960 });
    expect(fitWithin(900, 1600, 1280)).toEqual({ width: 720, height: 1280 });
    expect(fitWithin(300, 200, 1280)).toEqual({ width: 300, height: 200 });
  });

  it("accepts photos and rejects vectors, other files and huge files", () => {
    expect(() => validateImageFile({ type: "image/jpeg", size: 1000 })).not.toThrow();

    [
      [{ type: "image/svg+xml", size: 10 }, IMAGE_ERROR_KEYS.notImage],
      [{ type: "application/pdf", size: 10 }, IMAGE_ERROR_KEYS.notImage],
      [{ type: "image/png", size: 26 * 1024 * 1024 }, IMAGE_ERROR_KEYS.tooLarge],
    ].forEach(([file, key]) => {
      expect(() => validateImageFile(file)).toThrow(expect.objectContaining({ i18nKey: key }));
    });
  });
});
