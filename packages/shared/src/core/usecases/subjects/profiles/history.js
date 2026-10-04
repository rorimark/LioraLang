import { createKnowledgeProfile, knowledgeField, contextBlock } from "./knowledge.js";
export const HISTORY_PROFILE = createKnowledgeProfile({
  id: "history",
  deckFields: { period: knowledgeField("period", "text") },
  entryFields: {
    date: { ...knowledgeField("date", "text"), aiHint: "Optional date or date range with an explicit era where relevant. Always on the back." },
    context: { ...knowledgeField("context"), aiHint: "Optional short background shown on the question. Must not reveal the answer or date being asked." },
    consequences: { ...knowledgeField("consequences", "code", "details"), aiHint: "Optional consequences, one per line. On the back only." },
  },
  instruction: "History flashcards. One event, person, date or causal link per card. Dates and consequences are answer-side information. context is visible before reveal: omit it if it would disclose the answer. Distinguish causes from consequences and established facts from disputed interpretations. Never invent precise dates.",
  presentation: { layout: "code", front: [contextBlock("period"),
    { block: "text", role: "prompt", from: "entry.source" },
    { block: "text", role: "context", from: "entry.context" },
  ], back: [
    { block: "text", role: "answer", from: "entry.target" },
    { block: "text", role: "date", from: "entry.date" },
    { block: "text", role: "consequences", from: "entry.consequences" },
    { block: "list", role: "notes", from: "entry.examples" },
  ] },
});
