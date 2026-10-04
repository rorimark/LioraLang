import { DIRECTIONS, DIFFICULTIES } from "../constants.js";
import { CONTENT_LANGUAGE_FIELD } from "./commonFields.js";

// Shared behavior, with fields, composition and AI instructions owned by each subject.
export const difficultyField = { type: "choice", values: DIFFICULTIES,
  labelKey: "subjects.fields.difficulty", valueKey: "subjects.difficulty",
  aiHint: "Difficulty of recalling the idea: easy, medium or hard." };
export const knowledgeField = (key, type = "code", section = "main") => ({
  type, section, maxLength: type === "text" ? 120 : 4000,
  labelKey: `knowledge.fields.${key}`, placeholderKey: `knowledge.placeholders.${key}`,
});
export const createKnowledgeProfile = ({ id, deckFields, entryFields, presentation, instruction }) => ({
  id, nameKey: `subjects.names.${id}`, usesLanguages: false, canPublishToHub: false,
  minPackageVersion: 6, media: {}, directions: [DIRECTIONS.sourceToTarget], cardDetails: [],
  sideLabels: { source: "subjects.sides.question", target: "subjects.sides.answer" },
  entryText: {
    addKey: "subjects.addCard", listKey: "subjects.cards", enterHintKey: "subjects.enterHint",
    tagsKey: "subjects.tags", emptyKey: "subjects.empty",
    source: { labelKey: `knowledge.${id}.question`, placeholderKey: `knowledge.${id}.questionHint`, errorKey: "subjects.errors.emptyQuestion" },
    target: { multiline: true, labelKey: `knowledge.${id}.answer`, placeholderKey: `knowledge.${id}.answerHint`, errorKey: "subjects.errors.emptyAnswer" },
    examples: { labelKey: "subjects.fields.notes", placeholderKey: "subjects.fields.notesPlaceholder" },
  },
  deckFields: { ...deckFields, contentLanguage: CONTENT_LANGUAGE_FIELD },
  entryFields: { ...entryFields, difficulty: difficultyField },
  assistant: { entry: "concept", languageField: "contentLanguage", batch: false, description: false, reviewHint: false, instruction },
  presentation,
});
export const contextBlock = (field) => ({ block: "meta", items: [
  { kind: "context", from: `deck.${field}` },
  { kind: "difficulty", from: "entry.difficulty", labelKey: "subjects.difficulty", scale: DIFFICULTIES },
] });
