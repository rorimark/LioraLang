import { describe, expect, it } from "vitest";
import { createTranslator } from "./translator";
import { detectLocale, resolveLocale } from "./locales";

const en = {
  words: { one: "{count} word", other: "{count} words" },
  hello: "Hello, {name}",
  only: "Only in English",
};
const uk = {
  words: { one: "{count} слово", few: "{count} слова", many: "{count} слів", other: "{count} слова" },
  hello: "Привіт, {name}",
};

describe("translator", () => {
  it("picks the plural form the language's grammar asks for", () => {
    const t = createTranslator({ locale: "uk", messages: uk, fallbackMessages: en });

    expect([1, 2, 5, 21, 22, 25, 11].map((count) => t("words", { count }))).toEqual([
      "1 слово",
      "2 слова",
      "5 слів",
      "21 слово",
      "22 слова",
      "25 слів",
      "11 слів",
    ]);
  });

  it("writes numbers the language's way", () => {
    const de = createTranslator({ locale: "de", messages: en });
    expect(de("words", { count: 1234 })).toBe("1.234 words");
  });

  it("falls back to English, then to the key", () => {
    const t = createTranslator({ locale: "uk", messages: uk, fallbackMessages: en });

    expect(t("hello", { name: "Mark" })).toBe("Привіт, Mark");
    expect(t("only")).toBe("Only in English");
    expect(t("missing.key")).toBe("missing.key");
  });
});

describe("locale choice", () => {
  it("follows the device by base language, English otherwise", () => {
    expect(detectLocale(["pt-BR", "en"])).toBe("pt");
    expect(detectLocale(["zh-CN", "ja-JP"])).toBe("ja");
    expect(detectLocale(["zh-CN"])).toBe("en");
    expect(resolveLocale("de", ["fr"])).toBe("de");
    expect(resolveLocale("auto", ["cs-CZ"])).toBe("cs");
  });
});
