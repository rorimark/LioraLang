import { describe, expect, it } from "vitest";
import { buildCardPresentation, normalizeDeckSubjectFields, normalizeEntrySubjectFields } from "@shared/core/usecases/subjects";
import { buildI18nValue } from "@shared/lib/i18n";
import { buildLandingDemoDeck, DEMO_LOCALES, LANDING_DEMO_SUBJECTS } from "./landingDemoDeck";

// Exercise translated samples through the same profiles as stored cards.
// An answer-side code snippet or solution must not leak onto the front.
describe("landing subject demos", () => {
  for (const locale of DEMO_LOCALES) {
    it(`builds localized, valid subject cards in ${locale}`, async () => {
      const { default: app } = await import(`../../../../packages/shared/src/lib/i18n/messages/${locale}.js`);
      const { default: landing } = await import(`../../../../packages/shared/src/lib/i18n/messages/landing/${locale}.js`);
      const { t } = buildI18nValue(locale, { ...app, landing }, { ...app, landing });
      for (const subject of LANDING_DEMO_SUBJECTS) {
        const deck = buildLandingDemoDeck(locale, subject, t);
        if (subject === "language") {
          expect(deck.words).toHaveLength(6);
          expect(deck.sourceLanguage).toBe("English");
          continue;
        }
        expect(deck.subject).toBe(subject);
        expect(deck.subjectFields).toEqual(normalizeDeckSubjectFields(subject, deck.subjectFields));
        expect(deck.words.length).toBeGreaterThan(0);
        for (const entry of deck.words) {
          expect(entry.source).not.toContain("landing.demo.");
          expect(entry.target).not.toContain("landing.demo.");
          expect(entry.subjectFields).toEqual(normalizeEntrySubjectFields(subject, entry.subjectFields));
          const presentation = buildCardPresentation({ entry, deck });
          expect(presentation.front.some((block) => block.text === entry.target)).toBe(false);
          expect(presentation.back.some((block) => block.text === entry.target)).toBe(true);
          if (entry.subjectFields.codeSide === "back") {
            expect(presentation.front.some((block) => block.type === "code")).toBe(false);
            expect(presentation.back.some((block) => block.type === "code")).toBe(true);
          }
          if (entry.subjectFields.formula && (entry.subjectFields.formulaSide || "back") === "back") {
            expect(presentation.front.some((block) => block.type === "formula")).toBe(false);
            expect(presentation.back.some((block) => block.type === "formula")).toBe(true);
          }
        }
      }
    });
  }
});
