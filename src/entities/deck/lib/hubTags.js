// The deck's own tags, without its languages (they read as a pair) and
// without repeats.
export const normalizeHubTags = (value, languages = []) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const seen = new Set(languages.map((item) => String(item || "").trim().toLowerCase()).filter(Boolean));
  const tags = [];

  value.forEach((tag) => {
    const text = typeof tag === "string" ? tag.trim() : "";
    const key = text.toLowerCase();

    if (text && !seen.has(key)) {
      seen.add(key);
      tags.push(text);
    }
  });

  return tags;
};

