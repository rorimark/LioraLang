import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";
import { READY_LOCALES } from "../packages/shared/src/lib/i18n/locales.js";

// Every language of the landing has a static page (scripts/prerender-landing.mjs)
// that Vercel must serve at /xx; anything else is the app.
const config = JSON.parse(readFileSync(path.resolve(process.cwd(), "vercel.json"), "utf8"));

describe("vercel.json", () => {
  it("serves the static landing for every language but English", () => {
    const rule = config.rewrites.find((item) => item.destination === "/:locale/index.html");
    const listed = rule.source.match(/\(([^)]+)\)/)[1].split("|").sort();
    const expected = READY_LOCALES.map((item) => item.code).filter((code) => code !== "en").sort();

    expect(listed).toEqual(expected);
  });

  it("serves the app's shell for everything else, last", () => {
    expect(config.rewrites.at(-1)).toEqual({ source: "/(.*)", destination: "/app.html" });
  });
});
