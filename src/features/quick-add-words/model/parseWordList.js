// Turns a list pasted from notes or a spreadsheet into word/translation
// rows. Nothing here needs the user to know a format: a tab (a copied
// table), a dash, an equals sign, a semicolon, a pipe or a colon between
// the two halves all work, and bullets or numbering in front are dropped.
// A line that cannot be split is kept, marked, and never guessed at.

// Tried in order: the first separator found on a line wins. A comma comes
// last, because a translation often lists several meanings with commas.
const SEPARATORS = [
  { kind: "tab", pattern: /\t+/ },
  { kind: "dash", pattern: /\s+[—–-]{1,2}\s+|\s*[—–]\s*/ },
  { kind: "equals", pattern: /\s*=\s*/ },
  { kind: "semicolon", pattern: /\s*;\s*/ },
  { kind: "pipe", pattern: /\s*\|\s*/ },
  { kind: "colon", pattern: /\s*:\s+|\s+:\s*/ },
  { kind: "comma", pattern: /\s*,\s*/ },
];

// "1. ", "1) ", "- ", "* ", "• " in front of a line.
const LEADING_MARKER = /^\s*(?:\d{1,4}[.)]\s+|[-*•·]\s+)/;

export const ROW_STATUS = Object.freeze({
  ready: "ready",
  missingTranslation: "missing-translation",
  missingWord: "missing-word",
});

const cleanCell = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^["'“”„«»]+|["'“”„«»]+$/g, "")
    .trim();

export const splitWordLine = (line) => {
  const text = String(line ?? "").replace(LEADING_MARKER, "").trim();

  if (!text) {
    return null;
  }

  for (const { kind, pattern } of SEPARATORS) {
    const match = pattern.exec(text);

    if (!match) {
      continue;
    }

    const source = cleanCell(text.slice(0, match.index));
    const rest = text.slice(match.index + match[0].length);
    // A table row can carry more columns; the rest are the translation's
    // own business only for a tab, where they are separate cells.
    const target = cleanCell(kind === "tab" ? rest.split(/\t+/)[0] : rest);

    if (!source && !target) {
      return null;
    }

    return { source, target, separator: kind };
  }

  return { source: cleanCell(text), target: "", separator: "" };
};

export const resolveRowStatus = ({ source, target }) => {
  if (!String(source ?? "").trim()) {
    return ROW_STATUS.missingWord;
  }

  if (!String(target ?? "").trim()) {
    return ROW_STATUS.missingTranslation;
  }

  return ROW_STATUS.ready;
};

export const parseWordList = (text) => {
  const lines = String(text ?? "").replace(/\r\n?/g, "\n").split("\n");
  const rows = [];

  lines.forEach((line, index) => {
    const parsed = splitWordLine(line);

    if (!parsed) {
      return;
    }

    rows.push({
      line: index + 1,
      raw: line.trim(),
      source: parsed.source,
      target: parsed.target,
      status: resolveRowStatus(parsed),
    });
  });

  return rows;
};

export const looksLikeWordList = (text) =>
  String(text ?? "")
    .split(/\r?\n/)
    .filter((line) => line.trim()).length > 1;
