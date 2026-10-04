import { SUBJECTS, DIRECTIONS } from "../constants.js";

// Labels, placeholders and errors are message keys, so the interface
// draws a subject's forms from its profile without knowing which it is.
export const LANGUAGE_PROFILE = Object.freeze({
  id: SUBJECTS.language,
  nameKey: "subjects.names.language",
  usesLanguages: true,
  canPublishToHub: true,
  assistant: { entry: "word", topic: "word", batch: true, description: true, reviewHint: true },
  media: { optionalImage: true },
  directions: [DIRECTIONS.sourceToTarget, DIRECTIONS.targetToSource, DIRECTIONS.mixed],
  // Side names come from the deck's languages.
  sideLabels: null,
  // The Learn settings that show more of a card.
  cardDetails: ["showExamples", "showLevel", "showPartOfSpeech"],
  // The word form's own labels and errors are used.
  entryText: null,
  deckFields: {},
  entryFields: {},
  studyPresentations: [
    { id: "text", labelKey: "studyPresentation.text", renderer: "standard" },
    { id: "image_to_word", labelKey: "studyPresentation.image", renderer: "imageRecall", requires: "image" },
  ],
  presentation: null,
});

