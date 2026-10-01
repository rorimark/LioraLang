import { describe, expect, it } from "vitest";
import {
  buildCardPresentation,
  getSubjectProfile,
  normalizeDeckSubjectFields,
  normalizeEntrySubjectFields,
  normalizeSubject,
  resolveSubjectDirection,
  storedSubject,
} from "./subjects.js";

describe("subjects", () => {
  it("treats a deck without a subject as a language deck, stored as nothing", () => {
    expect(normalizeSubject(undefined)).toBe("language");
    expect(normalizeSubject("astrology")).toBe("language");
    expect(storedSubject("language")).toBe("");
    expect(storedSubject("programming")).toBe("programming");
    expect(getSubjectProfile("").usesLanguages).toBe(true);
    expect(getSubjectProfile("programming").usesLanguages).toBe(false);
  });

  it("keeps only the fields a subject defines, code with its lines", () => {
    expect(
      normalizeEntrySubjectFields("programming", {
        code: "users\n  .map(user => user.name)  \n\n",
        difficulty: "medium",
        secret: "dropped",
      }),
    ).toEqual({ code: "users\n  .map(user => user.name)", difficulty: "medium" });
    expect(normalizeEntrySubjectFields("programming", '{"code":"x = 1","difficulty":"nightmare"}')).toEqual({ code: "x = 1" });
    expect(normalizeEntrySubjectFields("language", { code: "x = 1" })).toEqual({});
    expect(normalizeDeckSubjectFields("programming", { technology: "  JavaScript " })).toEqual({ technology: "JavaScript" });
  });

  it("studies programming question first, whatever the session asks", () => {
    expect(resolveSubjectDirection("programming", "target_to_source")).toBe("source_to_target");
    expect(resolveSubjectDirection("", "mixed")).toBe("mixed");
  });

  it("draws language cards as before: no blocks", () => {
    expect(buildCardPresentation({ entry: { source: "asparagus", target: "szparag" }, deck: {} })).toBeNull();
  });

  it("lays a programming card out around its code", () => {
    const presentation = buildCardPresentation({
      entry: {
        source: "What does this return?",
        target: "A new array of the users' names.",
        examples: ["map never changes the original array."],
        subjectFields: { code: "users.map(user => user.name)", difficulty: "medium" },
      },
      deck: { subject: "programming", subjectFields: { technology: "JavaScript" } },
    });

    expect(presentation.layout).toBe("code");
    expect(presentation.labels).toEqual({ front: "subjects.sides.question", back: "subjects.sides.answer" });
    expect(presentation.front).toEqual([
      { type: "meta", items: [{ kind: "technology", value: "JavaScript" }, { kind: "difficulty", value: "medium", labelKey: "subjects.difficulty.medium", step: 2, steps: 3 }] },
      { type: "text", role: "prompt", text: "What does this return?" },
      { type: "code", emphasis: "primary", text: "users.map(user => user.name)" },
    ]);
    expect(presentation.back.map((block) => block.type)).toEqual(["text", "code", "list"]);
  });

  it("leaves out what a card does not have", () => {
    const presentation = buildCardPresentation({
      entry: { source: "What is a closure?", target: "A function with the scope it was made in." },
      deck: { subject: "programming" },
    });

    // A term with no code is the headline.
    expect(presentation.front).toEqual([{ type: "text", role: "prompt", text: "What is a closure?", emphasis: "lead" }]);
    expect(presentation.back).toEqual([{ type: "text", role: "answer", text: "A function with the scope it was made in." }]);
  });
});
