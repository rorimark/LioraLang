// One catalog for independent preferences and the settings screen. New AI
// functions opt in with a key instead of borrowing another function's switch.
export const AI_FEATURES = Object.freeze([
  { id: "wordSuggestions", mode: "automatic", keywords: "word translation autofill" },
  { id: "reviewHints", mode: "automatic", keywords: "review again explanation" },
  { id: "conceptSuggestions", mode: "manual", keywords: "subject card programming concept" },
  { id: "listCompletion", mode: "manual", keywords: "list batch fill translation" },
  { id: "topicCollection", mode: "manual", keywords: "topic collect deck" },
  { id: "deckDescription", mode: "manual", keywords: "description tags deck" },
].map((feature) => Object.freeze({ ...feature, defaultValue: true })));

export const DEFAULT_AI_FEATURES = Object.freeze(Object.fromEntries(AI_FEATURES.map(({ id, defaultValue }) => [id, defaultValue])));

export const isAiFeatureEnabled = (preferences, id) => {
  const feature = AI_FEATURES.find((item) => item.id === id);
  if (!feature) return false;
  const value = preferences?.aiFeatures?.[id];
  if (typeof value === "boolean") return value;
  // Never turn AI back on for someone who disabled the old shared switch.
  return preferences?.deckDefaults?.wordSuggestions === false ? false : feature.defaultValue;
};
