import { createKnowledgeProfile, knowledgeField, contextBlock } from "./knowledge.js";
export const MATHEMATICS_PROFILE = createKnowledgeProfile({
  id: "mathematics",
  deckFields: { area: knowledgeField("area", "text") },
  entryFields: {
    formula: { ...knowledgeField("formula"), placementField: "formulaSide", aiHint: "Optional LaTeX math without dollar fences; keep the answer formula on the back." },
    formulaSide: { type: "choice", values: ["front", "back"], defaultValue: "back", attachedTo: "formula",
      labelKey: "subjects.fields.codeSide", valueKey: "subjects.codeSide", aiHint: "back for an answer or rule to recall; front only for a supplied equation to solve." },
    steps: { ...knowledgeField("steps", "code", "details"), aiHint: "Optional worked solution, one numbered step per line. Never put it on the front." },
  },
  instruction: "Mathematics flashcards. One rule or problem per card. Check the calculation. formula is LaTeX without dollar fences, steps explain the derivation. The answer and solution belong on the back. Do not claim an unproved result or invent mathematical facts.",
  presentation: { layout: "code", front: [contextBlock("area"),
    { block: "text", role: "prompt", from: "entry.source" },
    { block: "code", emphasis: "primary", from: "entry.formula", when: { from: "entry.formulaSide", value: "front" } },
  ], back: [
    { block: "text", role: "answer", from: "entry.target" },
    { block: "code", emphasis: "secondary", from: "entry.formula", unless: { from: "entry.formulaSide", value: "front" } },
    { block: "text", role: "steps", from: "entry.steps" },
    { block: "list", role: "notes", from: "entry.examples" },
  ] },
});
