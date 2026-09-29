import { describe, expect, it } from "vitest";
import { flattenMessages, placeholdersOf } from "./translator";
import { LOCALE_CODES } from "./locales";
import en from "./messages/en.js";
import uk from "./messages/uk.js";
import ru from "./messages/ru.js";
import pl from "./messages/pl.js";
import de from "./messages/de.js";
import es from "./messages/es.js";
import fr from "./messages/fr.js";
import it_ from "./messages/it.js";
import pt from "./messages/pt.js";
import tr from "./messages/tr.js";
import cs from "./messages/cs.js";
import ja from "./messages/ja.js";

const CATALOGUES = { uk, ru, pl, de, es, fr, it: it_, pt, tr, cs, ja };

// The plural forms a count can need in a language: whatever
// Intl.PluralRules picks for whole numbers people actually see.
const neededForms = (locale) => {
  const rules = new Intl.PluralRules(locale);
  const counts = [...Array.from({ length: 220 }, (_, index) => index), 1000, 1000000];
  return [...new Set(counts.map((count) => rules.select(count)))].sort();
};

const english = new Map(flattenMessages(en));

describe("message catalogues", () => {
  it("covers every interface language", () => {
    expect(Object.keys(CATALOGUES).sort()).toEqual(LOCALE_CODES.filter((code) => code !== "en").sort());
  });

  it("gives every English plural a one and an other form", () => {
    english.forEach((message, key) => {
      if (message && typeof message === "object") {
        expect(Object.keys(message).sort(), key).toEqual(expect.arrayContaining(["one", "other"]));
      }
    });
  });

  Object.entries(CATALOGUES).forEach(([locale, catalogue]) => {
    describe(locale, () => {
      const messages = new Map(flattenMessages(catalogue));

      it("has every key English has, and no others", () => {
        const missing = [...english.keys()].filter((key) => !messages.has(key));
        const extra = [...messages.keys()].filter((key) => !english.has(key));

        expect(missing, `missing in ${locale}`).toEqual([]);
        expect(extra, `unknown in ${locale}`).toEqual([]);
      });

      it("keeps the same placeholders", () => {
        english.forEach((message, key) => {
          if (messages.has(key)) {
            expect(placeholdersOf(messages.get(key)), `${locale}: ${key}`).toEqual(placeholdersOf(message));
          }
        });
      });

      it("has every plural form its grammar needs", () => {
        const forms = neededForms(locale);

        english.forEach((message, key) => {
          if (message && typeof message === "object") {
            const translated = messages.get(key);
            expect(typeof translated, `${locale}: ${key} should be plural`).toBe("object");
            forms.forEach((form) => {
              expect(typeof translated?.[form], `${locale}: ${key} needs "${form}"`).toBe("string");
            });
          }
        });
      });

      it("leaves nothing blank or untranslated by accident", () => {
        messages.forEach((message, key) => {
          const forms = message && typeof message === "object" ? Object.values(message) : [message];
          forms.forEach((form) => expect(String(form).trim(), `${locale}: ${key}`).not.toBe(""));
        });
      });
    });
  });
});
