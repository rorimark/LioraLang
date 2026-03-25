const toCleanString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value;
};

export const normalizeWord = (word, fallbackId = "") => {
  const resolvedId = word?.id ?? fallbackId;
  const example = toCleanString(word?.example);
  const examples = Array.isArray(word?.examples)
    ? word.examples.filter((item, index, list) => {
        return typeof item === "string" && item && list.indexOf(item) === index;
      })
    : [];

  if (example && !examples.includes(example)) {
    examples.push(example);
  }

  return {
    id: resolvedId,
    externalId: word?.externalId ?? "",
    source: toCleanString(word?.source),
    target: toCleanString(word?.target),
    tertiary: toCleanString(word?.tertiary),
    level: word?.level ?? null,
    part_of_speech: word?.part_of_speech ?? "other",
    tags: Array.isArray(word?.tags) ? word.tags : [],
    examples,
    example,
  };
};
