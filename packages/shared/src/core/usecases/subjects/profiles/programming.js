import { SUBJECTS, DIRECTIONS, DIFFICULTIES } from "../constants.js";
import { TECHNOLOGY_APPEARANCES } from "./technologyAppearances.js";
import { CONTENT_LANGUAGE_FIELD } from "./commonFields.js";

// Programming: a term or a question, often about a piece of code, and a
// short answer. With code, the code is the thing to look at; without it, a
// term is the headline, the way a word is on a language card. The
// technology is the deck's context; difficulty is not CEFR.
export const PROGRAMMING_PROFILE = Object.freeze({
  id: SUBJECTS.programming,
  nameKey: "subjects.names.programming",
  appearanceField: "technology", appearances: TECHNOLOGY_APPEARANCES,
  usesLanguages: false,
  // The Hub keeps languages in columns; until it knows subjects, these
  // decks stay in the library.
  canPublishToHub: false,
  assistant: { entry: "concept", topic: "concept", languageField: "contentLanguage", batch: false, description: false, reviewHint: false,
    instruction: "Programming concepts and code. Prefer concise, correct, runnable examples in the deck technology. Never run code. Code that demonstrates the answer belongs on the back; code to reason about belongs on the front." },
  media: {},
  directions: [DIRECTIONS.sourceToTarget],
  // Message keys: the sides are a question and its answer.
  sideLabels: { source: "subjects.sides.question", target: "subjects.sides.answer" },
  cardDetails: [],
  deckText: { namePlaceholderKey: "subjects.fields.technologyPlaceholder" },
  entryText: {
    addKey: "subjects.addCard",
    listKey: "subjects.cards",
    enterHintKey: "subjects.enterHint",
    tagsKey: "subjects.tags",
    emptyKey: "subjects.empty",
    source: { labelKey: "subjects.fields.question", placeholderKey: "subjects.fields.questionPlaceholder", errorKey: "subjects.errors.emptyQuestion" },
    target: { multiline: true, labelKey: "subjects.fields.answer", placeholderKey: "subjects.fields.answerPlaceholder", errorKey: "subjects.errors.emptyAnswer" },
    examples: { labelKey: "subjects.fields.notes", placeholderKey: "subjects.fields.notesPlaceholder" },
  },
  deckFields: {
    technology: {
      type: "text",
      maxLength: 40,
      labelKey: "subjects.fields.technology",
      hintKey: "subjects.fields.technologyHint",
      placeholderKey: "subjects.fields.technologyPlaceholder",
    },
    contentLanguage: CONTENT_LANGUAGE_FIELD,
  },
  entryFields: {
    code: {
      type: "code",
      section: "main",
      aiHint: "Optional code; no Markdown fences. Empty for a term that needs no code.",
      maxLength: 4000,
      labelKey: "subjects.fields.code",
      placeholderKey: "subjects.fields.codePlaceholder",
      placementField: "codeSide",
    },
    codeSide: {
      type: "choice",
      values: ["front", "back"],
      defaultValue: "front",
      aiHint: "front only when code is the question; back when it reveals or illustrates the answer.",
      attachedTo: "code",
      minPackageVersion: 3,
      labelKey: "subjects.fields.codeSide",
      valueKey: "subjects.codeSide",
    },
    difficulty: {
      type: "choice",
      values: DIFFICULTIES,
      aiHint: "Conceptual difficulty, not a language proficiency level.",
      labelKey: "subjects.fields.difficulty",
      valueKey: "subjects.difficulty",
    },
  },
  presentation: {
    layout: "code",
    front: [
      { block: "meta", items: [{ kind: "technology", from: "deck.technology" }, { kind: "difficulty", from: "entry.difficulty", labelKey: "subjects.difficulty", scale: DIFFICULTIES }] },
      { block: "text", role: "prompt", from: "entry.source", leadsWithout: "entry.code", leadsWhen: { from: "entry.codeSide", value: "back" } },
      { block: "code", emphasis: "primary", from: "entry.code", unless: { from: "entry.codeSide", value: "back" } },
    ],
    back: [
      { block: "text", role: "answer", from: "entry.target" },
      { block: "code", emphasis: "secondary", from: "entry.code", when: { from: "entry.codeSide", value: "back" } },
      { block: "list", role: "notes", from: "entry.examples" },
    ],
  },
});

