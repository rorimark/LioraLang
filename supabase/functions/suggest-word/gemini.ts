// What the suggest-word function asks Gemini, and what of the answer it
// passes on. No Deno here, so it is tested with the rest of the app.
//
// The app checks the answer again before anything reaches a card: this
// side only keeps the reply to the shape and size of a suggestion.

// The last resort, when Google's list of models cannot be read. Normally
// the function takes the newest stable Flash from that list
// (pickFlashModel), or the model named in the GEMINI_MODEL secret.
export const DEFAULT_MODEL = "gemini-2.5-flash";

export const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "phrase",
  "other",
];

const MAX_TEXT = 80;
const MAX_FIELD = 200;
const MAX_EXAMPLES = 3;

export type SuggestRequest = {
  text: string;
  side: "source" | "target";
  sourceLanguage: string;
  targetLanguage: string;
  tertiaryLanguage: string;
  pictureSide: "" | "source" | "target";
  usesWordLevels: boolean;
};

export type Suggestion = {
  recognized: boolean;
  correction: string;
  source: string;
  target: string;
  tertiary: string;
  level: string;
  partOfSpeech: string;
  examples: string[];
};

const clean = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

// A language is a name as the app stores it: "English", "Brazilian
// Portuguese". Anything else is not passed into the prompt.
const cleanLanguage = (value: unknown): string => {
  const language = clean(value);
  return language.length <= 40 && /^[\p{L} ()'-]*$/u.test(language) ? language : "";
};

export const validateRequest = (body: unknown): SuggestRequest | null => {
  const value = (body ?? {}) as Record<string, unknown>;
  const text = clean(value.text);

  if (!text || text.length > MAX_TEXT || !/\p{L}/u.test(text)) {
    return null;
  }

  const pictureSide = value.pictureSide === "source" || value.pictureSide === "target" ? value.pictureSide : "";
  const request: SuggestRequest = {
    text,
    side: value.side === "target" ? "target" : "source",
    sourceLanguage: pictureSide === "source" ? "" : cleanLanguage(value.sourceLanguage),
    targetLanguage: pictureSide === "target" ? "" : cleanLanguage(value.targetLanguage),
    tertiaryLanguage: cleanLanguage(value.tertiaryLanguage),
    pictureSide,
    usesWordLevels: value.usesWordLevels !== false,
  };

  const typedLanguage = request.side === "source" ? request.sourceLanguage : request.targetLanguage;
  return typedLanguage ? request : null;
};

// What is asked for, in plain words the model reads.
const describeTask = (request: SuggestRequest): string[] => {
  const typedLanguage = request.side === "source" ? request.sourceLanguage : request.targetLanguage;
  const examplesLanguage = request.sourceLanguage || request.targetLanguage;
  const lines = [
    `The learner typed "${request.text}" in ${typedLanguage}.`,
  ];

  if (request.side === "source" && request.targetLanguage) {
    lines.push(`target: its translation into ${request.targetLanguage}.`);
  }

  if (request.side === "target" && request.sourceLanguage) {
    lines.push(`source: the ${request.sourceLanguage} word or phrase it translates.`);
  }

  if (request.tertiaryLanguage) {
    lines.push(`tertiary: its translation into ${request.tertiaryLanguage}.`);
  }

  if (request.usesWordLevels) {
    lines.push("level: the CEFR level at which learners usually meet it.");
  }

  lines.push(
    `partOfSpeech: one of ${PARTS_OF_SPEECH.join(", ")}; an expression of several words is "phrase".`,
    `examples: two short everyday sentences in ${examplesLanguage}, under 12 words each, that use it in exactly this sense.`,
  );

  return lines;
};

const SYSTEM_INSTRUCTION = [
  "You fill in flashcards for someone learning a language.",
  "Answer only with JSON that matches the schema.",
  "Never invent a word. If the input is not a real word or common expression in its language, set recognized to false and leave every other field empty; if it looks like a misspelling, put the intended word in correction.",
  "A translation is the one a good dictionary gives first for the most common sense: the same part of speech, no explanations, no lists of alternatives.",
  "Leave a field empty rather than guess.",
].join(" ");

// How much a model may think before it answers. A suggestion has to arrive
// while the person is still on the field: the 2.5 Flash models answer
// without thinking, the Gemini 3 ones think as little as they can.
const thinkingFor = (model: string) => {
  if (model.startsWith("gemini-2.5-flash")) {
    return { thinkingConfig: { thinkingBudget: 0 } };
  }

  if (/^gemini-\d/.test(model) && !model.startsWith("gemini-2")) {
    return { thinkingConfig: { thinkingLevel: "low" } };
  }

  return {};
};

export const buildGeminiRequest = (request: SuggestRequest, model = DEFAULT_MODEL, { withThinking = true } = {}) => ({
  systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
  contents: [{ role: "user", parts: [{ text: describeTask(request).join("\n") }] }],
  generationConfig: {
    temperature: 0.2,
    // Models that think first spend output tokens on it; leave them room
    // so the answer itself is not cut short.
    maxOutputTokens: model.startsWith("gemini-2.5-flash") ? 512 : 2048,
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        recognized: { type: "BOOLEAN" },
        correction: { type: "STRING" },
        source: { type: "STRING" },
        target: { type: "STRING" },
        tertiary: { type: "STRING" },
        level: { type: "STRING", enum: LEVELS },
        partOfSpeech: { type: "STRING", enum: PARTS_OF_SPEECH },
        examples: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["recognized"],
    },
    ...(withThinking ? thinkingFor(model) : {}),
  },
});

const field = (value: unknown): string => {
  const text = clean(value);
  return text.length > MAX_FIELD ? "" : text;
};

// The model's reply as a suggestion, or null when there is none to give.
export const readGeminiSuggestion = (response: unknown): Suggestion | null => {
  const candidate = (response as { candidates?: Array<Record<string, unknown>> })?.candidates?.[0];
  const parts = (candidate?.content as { parts?: Array<{ text?: unknown }> } | undefined)?.parts;

  if (!candidate || candidate.finishReason === "SAFETY" || !Array.isArray(parts)) {
    return null;
  }

  let raw: Record<string, unknown>;

  try {
    raw = JSON.parse(parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join(""));
  } catch {
    return null;
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const level = clean(raw.level).toUpperCase();
  const partOfSpeech = clean(raw.partOfSpeech).toLowerCase();

  return {
    recognized: raw.recognized !== false,
    correction: field(raw.correction),
    source: field(raw.source),
    target: field(raw.target),
    tertiary: field(raw.tertiary),
    level: LEVELS.includes(level) ? level : "",
    partOfSpeech: PARTS_OF_SPEECH.includes(partOfSpeech) ? partOfSpeech : "",
    examples: (Array.isArray(raw.examples) ? raw.examples : []).map(field).filter(Boolean).slice(0, MAX_EXAMPLES),
  };
};

// The models to ask, best first, from Google's list: the newest stable
// Flash, then the newest Flash-Lite (it has capacity of its own when Flash
// is overloaded), then the older ones, newest first. Previews and
// experiments are passed over.
export const pickFlashModels = (listResponse: unknown): string[] => {
  const models = (listResponse as { models?: Array<Record<string, unknown>> })?.models;

  if (!Array.isArray(models)) {
    return [];
  }

  const ranked = models
    .filter((model) => {
      const methods = model?.supportedGenerationMethods;
      return Array.isArray(methods) && methods.includes("generateContent");
    })
    .map((model) => String(model?.name || "").replace(/^models\//, ""))
    .map((name) => ({ name, match: /^gemini-(\d+(?:\.\d+)?)-flash(-lite)?$/.exec(name) }))
    .filter((candidate) => candidate.match)
    .sort(
      (first, second) =>
        Number(Boolean(first.match![2])) - Number(Boolean(second.match![2])) ||
        Number(second.match![1]) - Number(first.match![1]),
    );

  const names = ranked.map((candidate) => candidate.name);
  const newestLite = names.find((name) => name.endsWith("-lite"));
  const [first, ...rest] = names.filter((name) => name !== newestLite);

  return [first, newestLite, ...rest].filter((name): name is string => Boolean(name));
};

// The newest stable Flash, the first of the models to ask.
export const pickFlashModel = (listResponse: unknown): string =>
  pickFlashModels(listResponse).find((name) => !name.endsWith("-lite")) || "";
