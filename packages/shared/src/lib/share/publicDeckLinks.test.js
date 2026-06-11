import { describe, expect, it } from "vitest";
import {
  buildPublicDeckBrowseUrl,
  buildPublicDeckShareUrl,
  resolvePublicAppBaseUrl,
} from "./publicDeckLinks";

describe("publicDeckLinks", () => {
  it("prefers env base url over window origin", () => {
    expect(
      resolvePublicAppBaseUrl({
        envBaseUrl: "https://liora.example.com/",
        origin: "https://ignored.example.com",
      }),
    ).toBe("https://liora.example.com");
  });

  it("builds absolute public browse url", () => {
    expect(
      buildPublicDeckBrowseUrl("german-body-parts", {
        envBaseUrl: "https://liora.example.com/",
      }),
    ).toBe("https://liora.example.com/app/browse/german-body-parts");
  });

  it("builds absolute public share url", () => {
    expect(
      buildPublicDeckShareUrl("german-body-parts", {
        envBaseUrl: "https://liora.example.com/",
      }),
    ).toBe("https://liora.example.com/share/decks/german-body-parts");
  });

  it("falls back to relative route without base url", () => {
    expect(buildPublicDeckShareUrl("php-forms")).toBe("/share/decks/php-forms");
  });
});
