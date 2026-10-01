// The larger jobs the suggest-word function does besides one word: a whole
// pasted list, a deck on a topic, and a hint for a word just missed in
// Learn. No Deno here either, so it is tested with the rest of the app.
//
// Each job has the same three parts: what of the app's request is passed
// into the prompt (validate*), what the model is asked (build*), and what
// of its answer goes back (read*). The app checks every card again before
// anything reaches a deck.

import {
  clean,
  cleanLanguage,
  cleanTags,
  describeWordTags,
  field,
  LEVELS,
  MAX_TEXT,
  PARTS_OF_SPEECH,
  readGeminiJson,
  thinkingFor,
} from "./gemini.ts";

export const MAX_LIST_ROWS = 30;
export const MIN_TOPIC_WORDS = 5;
export const MAX_TOPIC_WORDS = 30;
const MAX_AVOID = 200;
const MAX_EXAMPLES = 2;
const MAX_TAGS = 3;
const MAX_DECK_TAGS = 6;
const MAX_DESCRIPTION = 300;
const MAX_DECK_WORDS = 40;
const MAX_HINT = 240;

export type DeckContext = {
  sourceLanguage: string;
  targetLanguage: string;
  tertiaryLanguage: string;
  usesWordLevels: boolean;
  tags: string[];
  tagLanguage: string;
};

export type ListRequest = { task: "list"; deck: DeckContext; rows: Array<{ source: string; target: string }> };
export type TopicRequest = {
  task: "topic";
  deck: DeckContext;
  topic: string;
  level: string;
  count: number;
  avoid: string[];
};
export type HintRequest = {
  task: "hint";
  word: string;
  translation: string;
  wordLanguage: string;
  translationLanguage: string;
  explainIn: string;
  examples: string[];
};
// A description and tags for a whole deck, from what it already has.
export type DeckRequest = {
  task: "deck";
  name: string;
  sourceLanguage: string;
  targetLanguage: string;
  pictureSide: "" | "source" | "target";
  words: Array<{ source: string; target: string }>;
  tags: string[];
  writeIn: string;
};
export type TaskRequest = ListRequest | TopicRequest | HintRequest | DeckRequest;

export type CardDraft = {
  index: number;
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

const text = (value: unknown): string => {
  const cleaned = clean(value);
  return cleaned.length <= MAX_TEXT ? cleaned : "";
};

const hasLetter = (value: string) => /\p{L}/u.test(value);

// The deck a list or a topic is for. Both of its sides must be words: a
// picture side has nothing to translate into.
const readDeck = (value: unknown): DeckContext | null => {
  const deck = (value ?? {}) as Record<string, unknown>;
  const context = {
    sourceLanguage: cleanLanguage(deck.sourceLanguage),
    targetLanguage: cleanLanguage(deck.targetLanguage),
    tertiaryLanguage: cleanLanguage(deck.tertiaryLanguage),
    usesWordLevels: deck.usesWordLevels !== false,
    tags: cleanTags(deck.tags, 30),
    tagLanguage: cleanLanguage(deck.tagLanguage),
  };

  return context.sourceLanguage && context.targetLanguage ? context : null;
};

export const validateTaskRequest = (body: unknown): TaskRequest | null => {
  const value = (body ?? {}) as Record<string, unknown>;

  if (value.task === "list") {
    const deck = readDeck(value.deck);
    const rows = Array.isArray(value.rows) ? value.rows : [];

    if (!deck || rows.length === 0 || rows.length > MAX_LIST_ROWS) {
      return null;
    }

    const cleaned = rows.map((row) => ({
      source: text((row as Record<string, unknown>)?.source),
      target: text((row as Record<string, unknown>)?.target),
    }));

    // Every line must have a word on one side; the app sends only those.
    return cleaned.every((row) => hasLetter(row.source) || hasLetter(row.target))
      ? { task: "list", deck, rows: cleaned }
      : null;
  }

  if (value.task === "topic") {
    const deck = readDeck(value.deck);
    const topic = text(value.topic);
    const level = LEVELS.includes(clean(value.level).toUpperCase()) ? clean(value.level).toUpperCase() : "";
    const count = Math.trunc(Number(value.count));

    if (!deck || !hasLetter(topic) || !(count >= MIN_TOPIC_WORDS && count <= MAX_TOPIC_WORDS)) {
      return null;
    }

    const avoid = (Array.isArray(value.avoid) ? value.avoid : [])
      .map((item) => clean(item))
      .filter((item) => item && item.length <= 40)
      .slice(0, MAX_AVOID);

    return { task: "topic", deck, topic, level, count, avoid };
  }

  if (value.task === "deck") {
    const pictureSide = value.pictureSide === "source" || value.pictureSide === "target" ? value.pictureSide : "";
    const words = (Array.isArray(value.words) ? value.words : [])
      .map((word) => ({
        source: text((word as Record<string, unknown>)?.source),
        target: text((word as Record<string, unknown>)?.target),
      }))
      .filter((word) => hasLetter(word.source) || hasLetter(word.target))
      .slice(0, MAX_DECK_WORDS);
    const request: DeckRequest = {
      task: "deck",
      name: clean(value.name).slice(0, 120),
      sourceLanguage: pictureSide === "source" ? "" : cleanLanguage(value.sourceLanguage),
      targetLanguage: pictureSide === "target" ? "" : cleanLanguage(value.targetLanguage),
      pictureSide,
      words,
      tags: cleanTags(value.tags, 10),
      writeIn: cleanLanguage(value.writeIn),
    };

    // Something to describe: a name or a few words.
    return hasLetter(request.name) || words.length >= 3 ? request : null;
  }

  if (value.task === "hint") {
    const request: HintRequest = {
      task: "hint",
      word: text(value.word),
      translation: text(value.translation),
      wordLanguage: cleanLanguage(value.wordLanguage),
      translationLanguage: cleanLanguage(value.translationLanguage),
      explainIn: cleanLanguage(value.explainIn),
      examples: (Array.isArray(value.examples) ? value.examples : []).map(field).filter(Boolean).slice(0, 2),
    };

    return hasLetter(request.word) && hasLetter(request.translation) && request.wordLanguage && request.translationLanguage
      ? request
      : null;
  }

  return null;
};

const SYSTEM_INSTRUCTION = [
  "You make flashcards for someone learning a language, the way a careful teacher and a good learner's dictionary would.",
  "Answer only with JSON that matches the schema.",
  "Never invent a word. A translation is the one a good dictionary gives first for the most common sense: the same part of speech, no explanations, no lists of alternatives.",
  "Every field of a card describes that same sense.",
].join(" ");

const HINT_INSTRUCTION = [
  "You help someone remember a word they just failed to recall in a flashcard review.",
  "Answer only with JSON that matches the schema.",
  "Write like a calm, precise teacher: no greetings, no praise, no emoji, no exclamation marks.",
].join(" ");

// How every card is described, for a list and for a topic alike.
const describeCardFields = (deck: DeckContext): string[] => {
  const lines = [
    `source: the ${deck.sourceLanguage} word or phrase.`,
    `target: its ${deck.targetLanguage} translation.`,
  ];

  if (deck.tertiaryLanguage) {
    lines.push(`tertiary: its translation into ${deck.tertiaryLanguage}.`);
  }

  lines.push(
    `partOfSpeech: one of ${PARTS_OF_SPEECH.join(", ")}; an expression of several words is "phrase".`,
  );

  if (deck.usesWordLevels) {
    lines.push(
      "level: the CEFR level at which learners usually meet it in that sense: A1 for the first everyday words, B1 for common words of work and opinion, C1-C2 for formal, rare or literary ones.",
    );
  }

  lines.push(
    `examples: two sentences in ${deck.sourceLanguage} that a native speaker would really say, 5 to 10 words each, showing its usual collocations in an everyday situation; the two differ in situation and form. No textbook sentences like "This is a ...", no translations.`,
  );

  lines.push(describeWordTags(deck.tags, deck.tagLanguage));

  return lines;
};

const cardProperties = {
  source: { type: "STRING" },
  target: { type: "STRING" },
  tertiary: { type: "STRING" },
  partOfSpeech: { type: "STRING", enum: PARTS_OF_SPEECH },
  level: { type: "STRING", enum: LEVELS },
  examples: { type: "ARRAY", items: { type: "STRING" } },
  tags: { type: "ARRAY", items: { type: "STRING" } },
};

const cardRequired = (deck: DeckContext) => [
  "source",
  "target",
  "partOfSpeech",
  ...(deck.usesWordLevels ? ["level"] : []),
  "examples",
  "tags",
];

const describeList = (request: ListRequest): string[] => [
  `The learner pasted ${request.rows.length} lines for a ${request.deck.sourceLanguage} → ${request.deck.targetLanguage} deck:`,
  JSON.stringify(request.rows.map((row, index) => ({ index, source: row.source, target: row.target }))),
  "Return one card for every line, with the same index.",
  "Keep what the learner wrote: a side that is filled in stays exactly as written; an empty side gets the word or its translation.",
  "If a written word is not a real word or common expression, set recognized to false for that line and put the intended word in correction when it is a misspelling.",
  ...describeCardFields(request.deck),
];

const describeTopic = (request: TopicRequest): string[] => {
  const lines = [
    `Make a vocabulary deck of exactly ${request.count} cards about this topic, given by the learner: ${JSON.stringify(request.topic)}.`,
    `Each card is a ${request.deck.sourceLanguage} word or short phrase and its ${request.deck.targetLanguage} translation.`,
    "Choose the words a learner really needs for the topic: common, concrete, useful, each card a different word, mostly nouns, verbs and adjectives, with a few set phrases.",
    request.level
      ? `The learner is at ${request.level}: choose words at ${request.level} or one level below.`
      : "Choose words from A1 to B2, the most useful first.",
  ];

  if (request.avoid.length) {
    lines.push(`The deck already has these words; do not repeat them: ${request.avoid.map((word) => JSON.stringify(word)).join(", ")}.`);
  }

  const writeIn = request.deck.tagLanguage || "English";
  lines.push(
    `name: a short deck name for the topic, two to four words, in ${writeIn}.`,
    describeDeckText(writeIn),
    describeDeckTags(writeIn, request.deck.tags),
    ...describeCardFields(request.deck),
  );

  return lines;
};

// What a deck's own description and tags are, for a topic and for a deck
// that already exists.
const describeDeckText = (writeIn: string) =>
  `description: one or two plain sentences in ${writeIn}, under 200 characters, that say what the deck covers and who it suits (the level, if the words make it clear). No marketing, no emoji, no exclamation marks, and do not start with "This deck".`;

const describeDeckTags = (writeIn: string, existing: string[] = []) =>
  [
    `deckTags: two to five short lowercase tags in ${writeIn} for finding the deck: its topics, from broad to narrow (travel, airport), and its level if it is clear (a2, b1).`,
    "Never the languages, and never words like deck, vocabulary or words.",
    existing.length ? `It already has: ${existing.map((tag) => JSON.stringify(tag)).join(", ")}; keep those that fit and add what is missing.` : "",
  ]
    .filter(Boolean)
    .join(" ");

const describeDeck = (request: DeckRequest): string[] => {
  const front = request.pictureSide === "source" ? "pictures" : request.sourceLanguage || "unknown";
  const back = request.pictureSide === "target" ? "pictures" : request.targetLanguage || "unknown";
  const writeIn = request.writeIn || "English";
  const lines = [
    `A learner's flashcard deck${request.name ? ` called ${JSON.stringify(request.name)}` : ""}: the front of each card is ${front}, the back is ${back}.`,
  ];

  if (request.words.length) {
    lines.push(`Some of its cards: ${JSON.stringify(request.words.map((word) => [word.source, word.target]))}.`);
  }

  lines.push(describeDeckText(writeIn), describeDeckTags(writeIn, request.tags).replace("deckTags:", "tags:"));
  return lines;
};

const describeHint = (request: HintRequest): string[] => {
  const lines = [
    `The learner did not recall the ${request.wordLanguage} "${request.word}", which means "${request.translation}" in ${request.translationLanguage}.`,
  ];

  if (request.examples.length) {
    lines.push(`It was used like this: ${request.examples.map((example) => JSON.stringify(example)).join(" ")}`);
  }

  lines.push(
    `hint: one or two short sentences in ${request.explainIn || "English"}, under 200 characters, that make it easier to remember next time.`,
    "Prefer a concrete memory hook: a similar-sounding word the learner knows, a vivid image, the word's parts or origin, or a related word. If it is easy to confuse with a similar word, say how to tell them apart.",
    "Do not just repeat the translation, and do not invent an etymology you are not sure of.",
  );

  return lines;
};

const outputTokens = (model: string, small: boolean) =>
  model.startsWith("gemini-2.5-flash") ? (small ? 512 : 6144) : small ? 2048 : 8192;

export const buildTaskRequest = (request: TaskRequest, model: string, { withThinking = true } = {}) => {
  const thinking = withThinking ? thinkingFor(model) : {};

  if (request.task === "hint") {
    return {
      systemInstruction: { parts: [{ text: HINT_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: describeHint(request).join("\n") }] }],
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: outputTokens(model, true),
        responseMimeType: "application/json",
        responseSchema: { type: "OBJECT", properties: { hint: { type: "STRING" } }, required: ["hint"] },
        ...thinking,
      },
    };
  }

  if (request.task === "deck") {
    return {
      systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ role: "user", parts: [{ text: describeDeck(request).join("\n") }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: outputTokens(model, true),
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: { description: { type: "STRING" }, tags: { type: "ARRAY", items: { type: "STRING" } } },
          required: ["description", "tags"],
        },
        ...thinking,
      },
    };
  }

  const isList = request.task === "list";
  const card = isList
    ? {
        type: "OBJECT",
        properties: { index: { type: "INTEGER" }, recognized: { type: "BOOLEAN" }, correction: { type: "STRING" }, ...cardProperties },
        required: ["index", "recognized", ...cardRequired(request.deck)],
      }
    : { type: "OBJECT", properties: cardProperties, required: cardRequired(request.deck) };

  return {
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
    contents: [{ role: "user", parts: [{ text: (isList ? describeList(request) : describeTopic(request)).join("\n") }] }],
    generationConfig: {
      temperature: isList ? 0.4 : 0.6,
      maxOutputTokens: outputTokens(model, false),
      responseMimeType: "application/json",
      responseSchema: isList
        ? { type: "OBJECT", properties: { cards: { type: "ARRAY", items: card } }, required: ["cards"] }
        : {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              description: { type: "STRING" },
              deckTags: { type: "ARRAY", items: { type: "STRING" } },
              cards: { type: "ARRAY", items: card },
            },
            required: ["name", "description", "deckTags", "cards"],
            propertyOrdering: ["name", "description", "deckTags", "cards"],
          },
      ...thinking,
    },
  };
};

const readCard = (raw: Record<string, unknown>, index: number): CardDraft => {
  const level = clean(raw?.level).toUpperCase();
  const partOfSpeech = clean(raw?.partOfSpeech).toLowerCase();

  return {
    index,
    recognized: raw?.recognized !== false,
    correction: field(raw?.correction),
    source: field(raw?.source),
    target: field(raw?.target),
    tertiary: field(raw?.tertiary),
    level: LEVELS.includes(level) ? level : "",
    partOfSpeech: PARTS_OF_SPEECH.includes(partOfSpeech) ? partOfSpeech : "",
    examples: (Array.isArray(raw?.examples) ? raw.examples : []).map(field).filter(Boolean).slice(0, MAX_EXAMPLES),
    tags: cleanTags(raw?.tags, MAX_TAGS),
  };
};

const readDescription = (value: unknown): string => {
  const description = clean(value);
  return description.length <= MAX_DESCRIPTION ? description : "";
};

const rawCards = (raw: Record<string, unknown>) =>
  (Array.isArray(raw.cards) ? raw.cards : []).filter(
    (card): card is Record<string, unknown> => Boolean(card) && typeof card === "object",
  );

// What of the model's answer goes back to the app, or null when there is
// nothing usable in it.
export const readTaskAnswer = (request: TaskRequest, response: unknown): Record<string, unknown> | null => {
  const raw = readGeminiJson(response);

  if (!raw) {
    return null;
  }

  if (request.task === "hint") {
    const hint = clean(raw.hint);
    return hint && hint.length <= MAX_HINT ? { hint } : null;
  }

  if (request.task === "deck") {
    const description = readDescription(raw.description);
    const tags = cleanTags(raw.tags, MAX_DECK_TAGS);
    return description || tags.length ? { description, tags } : null;
  }

  if (request.task === "list") {
    // One card per line, by index; a line the model skipped stays empty.
    const byIndex = new Map<number, CardDraft>();

    rawCards(raw).forEach((card) => {
      const index = Math.trunc(Number(card.index));

      if (index >= 0 && index < request.rows.length && !byIndex.has(index)) {
        byIndex.set(index, readCard(card, index));
      }
    });

    return byIndex.size ? { cards: [...byIndex.values()].sort((first, second) => first.index - second.index) } : null;
  }

  const seen = new Set<string>();
  const cards = rawCards(raw)
    .map((card, index) => readCard(card, index))
    .filter((card) => {
      const key = card.source.toLowerCase();

      if (!card.source || !card.target || seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .slice(0, request.count)
    .map((card, index) => ({ ...card, index }));

  return cards.length
    ? {
        name: field(raw.name).slice(0, 60),
        description: readDescription(raw.description),
        deckTags: cleanTags(raw.deckTags, MAX_DECK_TAGS),
        cards,
      }
    : null;
};
