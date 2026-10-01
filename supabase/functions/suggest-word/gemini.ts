// What the suggest-word function asks Gemini, and what of the answer it
// passes on. No Deno here, so it is tested with the rest of the app.
//
// The app checks the answer again before anything reaches a card: this
// side only keeps the reply to the shape and size of a suggestion.

// The last resort, when Google's list of models cannot be read. Normally
// the function takes the newest stable Flash models from that list
// (pickFlashModels), or the model named in the GEMINI_MODEL secret.
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

export const MAX_TEXT = 80;
const MAX_FIELD = 200;
const MAX_EXAMPLES = 3;
const MAX_TAG = 30;
const MAX_DECK_TAGS = 30;
const MAX_TAGS = 3;

export type SuggestRequest = {
  text: string;
  side: "source" | "target";
  sourceLanguage: string;
  targetLanguage: string;
  tertiaryLanguage: string;
  pictureSide: "" | "source" | "target";
  usesWordLevels: boolean;
  // The tags the deck already uses, so a suggestion files the word with
  // its neighbours, and the language new tags are written in.
  tags: string[];
  tagLanguage: string;
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
  tags: string[];
};

export const clean = (value: unknown): string =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

// A language is a name as the app stores it: "English", "Brazilian
// Portuguese". Anything else is not passed into the prompt.
export const cleanLanguage = (value: unknown): string => {
  const language = clean(value);
  return language.length <= 40 && /^[\p{L} ()'-]*$/u.test(language) ? language : "";
};

// A tag is a short label: letters, digits, spaces and a few joiners. Any
// other tag is not passed into the prompt.
const cleanTag = (value: unknown): string => {
  const tag = clean(value);
  return tag.length <= MAX_TAG && /^[\p{L}\p{N}][\p{L}\p{N} &'_-]*$/u.test(tag) ? tag : "";
};

export const cleanTags = (value: unknown, limit: number): string[] => {
  const seen = new Set<string>();
  return (Array.isArray(value) ? value : [])
    .map(cleanTag)
    .filter((tag) => tag && !seen.has(tag.toLowerCase()) && seen.add(tag.toLowerCase()))
    .slice(0, limit);
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
    tags: cleanTags(value.tags, MAX_DECK_TAGS),
    tagLanguage: cleanLanguage(value.tagLanguage),
  };

  const typedLanguage = request.side === "source" ? request.sourceLanguage : request.targetLanguage;
  return typedLanguage ? request : null;
};

// What is asked for, in plain words the model reads.
const describeTask = (request: SuggestRequest): string[] => {
  const typedLanguage = request.side === "source" ? request.sourceLanguage : request.targetLanguage;
  const examplesLanguage = request.sourceLanguage || request.targetLanguage;
  const lines = [
    `The learner typed "${request.text}" in ${typedLanguage}. Fill in the rest of the card for its most common sense.`,
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

  lines.push(
    `partOfSpeech: what "${request.text}" is in that sense: ${PARTS_OF_SPEECH.join(", ")}. An expression of several words is "phrase"; "other" is for interjections, particles, numerals and articles.`,
  );

  if (request.usesWordLevels) {
    lines.push(
      "level: the CEFR level at which learners usually meet it in that sense, as in the English Vocabulary Profile and similar lists: A1 for the first everyday words (water, house, go), B1 for common words of work and opinion, C1-C2 for formal, rare or literary ones.",
    );
  }

  lines.push(
    [
      `examples: two sentences in ${examplesLanguage} that a native speaker would really say, 5 to 12 words each.`,
      "Show how it is typically used: its usual collocations and a natural, everyday situation, in exactly this sense.",
      "Make the two differ in situation and in sentence form (for example a statement and a question).",
      request.usesWordLevels
        ? "Keep the other words at its level or simpler, so the sentence teaches the word and not the rest."
        : "Keep the other words simple, so the sentence teaches the word and not the rest.",
      "Inflect it as the grammar needs. No textbook sentences like \"This is a ...\", no translations, no quotation marks.",
    ].join(" "),
  );

  lines.push(describeWordTags(request.tags, request.tagLanguage));

  return lines;
};

// How a card's tags are asked for, the same for one word, a list and a
// topic: what the word is about, as many as truly fit, in the deck's own
// words where it has them.
export const describeWordTags = (deckTags: string[], tagLanguage: string): string =>
  [
    "tags: one to three short tags for what the word is about: its topic (food, travel, work, health, feelings, home, nature) and, if it clearly belongs to a narrower one, that too (kitchen, airport, weather).",
    "Add a second or third tag only when the word really belongs there; one good tag is better than three loose ones.",
    "Never a part of speech, a level, a language, or a word like vocabulary, word, basic or common.",
    deckTags.length
      ? `The deck already uses: ${deckTags.map((tag) => JSON.stringify(tag)).join(", ")}. Reuse these, spelled exactly the same, whenever they fit; a new tag is a lowercase word or two in ${tagLanguage || "English"}.`
      : `Each tag is a lowercase word or two in ${tagLanguage || "English"}.`,
    "A word with no clear topic gets none.",
  ].join(" ");

const SYSTEM_INSTRUCTION = [
  "You fill in flashcards for someone learning a language, the way a careful teacher and a good learner's dictionary would.",
  "Answer only with JSON that matches the schema.",
  "Never invent a word. If the input is not a real word or common expression in its language, set recognized to false and leave the text fields and lists empty; if it looks like a misspelling, put the intended word in correction.",
  "A translation is the one a good dictionary gives first for the most common sense: the same part of speech, no explanations, no lists of alternatives.",
  "Every other field describes that same sense.",
].join(" ");

// How much a model may think before it answers. A suggestion has to arrive
// while the person is still on the field: the 2.5 Flash models answer
// without thinking, the Gemini 3 ones think as little as they can.
export const thinkingFor = (model: string) => {
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
    // Low enough for the dictionary fields, high enough that the examples
    // do not all read the same.
    temperature: 0.4,
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
        tags: { type: "ARRAY", items: { type: "STRING" } },
      },
      // Optional fields are often left out; these are asked for every time.
      required: ["recognized", "partOfSpeech", ...(request.usesWordLevels ? ["level"] : []), "examples", "tags"],
      propertyOrdering: [
        "recognized",
        "correction",
        "source",
        "target",
        "tertiary",
        "partOfSpeech",
        "level",
        "examples",
        "tags",
      ],
    },
    ...(withThinking ? thinkingFor(model) : {}),
  },
});

export const field = (value: unknown): string => {
  const text = clean(value);
  return text.length > MAX_FIELD ? "" : text;
};

// The JSON object a model answered with, or null for a blocked, cut-off
// or broken answer.
export const readGeminiJson = (response: unknown): Record<string, unknown> | null => {
  const candidate = (response as { candidates?: Array<Record<string, unknown>> })?.candidates?.[0];
  const parts = (candidate?.content as { parts?: Array<{ text?: unknown }> } | undefined)?.parts;

  if (!candidate || candidate.finishReason === "SAFETY" || !Array.isArray(parts)) {
    return null;
  }

  try {
    const raw = JSON.parse(parts.map((part) => (typeof part?.text === "string" ? part.text : "")).join(""));
    return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : null;
  } catch {
    return null;
  }
};

// The model's reply as a suggestion, or null when there is none to give.
export const readGeminiSuggestion = (response: unknown): Suggestion | null => {
  const raw = readGeminiJson(response);

  if (!raw) {
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
    tags: cleanTags(raw.tags, MAX_TAGS),
  };
};

// The models to ask, in order, from Google's list: the newest stable
// Flash-Lite (a suggestion is a small task, and Lite answers in about a
// second and is rarely overloaded), then the newest Flash, then the older
// ones, newest first. Previews and experiments are passed over.
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
  return [newestLite, ...names.filter((name) => name !== newestLite)].filter((name): name is string => Boolean(name));
};

// The newest stable Flash (not Lite).
export const pickFlashModel = (listResponse: unknown): string =>
  pickFlashModels(listResponse).find((name) => !name.endsWith("-lite")) || "";

// One model's outcome: an answer, or why there is none.
export type Attempt<T = unknown> = { value?: T; overloaded?: boolean };

// Ask the models in turn and take the first suggestion that comes back. A
// model that fails hands over to the next one at once; a model that is
// slow gets company after hedgeMs, and whichever answers first wins. The
// others are stopped. With no answer, overloaded says whether asking again
// later is worth it.
export const raceModels = <T>(
  models: string[],
  ask: (model: string, stop: AbortSignal, timeoutMs: number) => Promise<Attempt<T>>,
  { hedgeMs, attemptMs, deadline, minTimeLeftMs = 1_500, now = Date.now }: {
    hedgeMs: number;
    attemptMs: number;
    deadline: number;
    minTimeLeftMs?: number;
    now?: () => number;
  },
): Promise<Attempt<T>> =>
  new Promise((resolve) => {
    const stop = new AbortController();
    let next = 0;
    let running = 0;
    let overloaded = false;
    let isDone = false;
    let hedgeTimer: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: Attempt<T>) => {
      if (isDone) return;
      isDone = true;
      clearTimeout(hedgeTimer);
      stop.abort();
      resolve(result);
    };

    const launch = () => {
      clearTimeout(hedgeTimer);

      if (isDone) return;

      const timeLeft = deadline - now();

      if (next >= models.length || timeLeft < minTimeLeftMs) {
        if (!running) finish({ overloaded });
        return;
      }

      const model = models[next];
      next += 1;
      running += 1;

      ask(model, stop.signal, Math.min(attemptMs, timeLeft))
        .catch((): Attempt<T> => ({ overloaded: true }))
        .then((outcome) => {
          running -= 1;

          if (outcome.value !== undefined) {
            finish(outcome);
            return;
          }

          overloaded = overloaded || Boolean(outcome.overloaded);
          launch();
        });

      hedgeTimer = setTimeout(launch, hedgeMs);
    };

    launch();
  });
