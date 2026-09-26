// Settings search: every word typed must appear somewhere in what a row is
// called, what its hint says, or the extra words it lists, in any order and
// case. An empty query matches everything.

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");

export const splitSettingsQuery = (query) =>
  normalize(query)
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

export const matchesSettingsQuery = (queryWords, ...texts) => {
  if (!Array.isArray(queryWords) || queryWords.length === 0) {
    return true;
  }

  const haystack = normalize(texts.flat().filter(Boolean).join(" "));

  return queryWords.every((word) => haystack.includes(word));
};
