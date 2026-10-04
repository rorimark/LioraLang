// Explicit math delimiters preserve prose, currency and literal code.
const escaped = (text, index) => {
  let count = 0;
  while (index > 0 && text[--index] === "\\") count += 1;
  return count % 2 === 1;
};
export const splitMathText = value => {
  const text = String(value ?? "");
  const tokens = [];
  let plainStart = 0, cursor = 0;
  while (cursor < text.length) {
    if (text[cursor] === "`") {
      const fence = text.slice(cursor).match(/^`+/)[0];
      const end = text.indexOf(fence, cursor + fence.length);
      cursor = end < 0 ? text.length : end + fence.length;
      continue;
    }
    const open = ["$$", "\\[", "\\(", "$"].find(delimiter => text.startsWith(delimiter, cursor) && !escaped(text, cursor));
    if (!open) { cursor += 1; continue; }
    const close = open === "\\[" ? "\\]" : open === "\\(" ? "\\)" : open;
    let end = text.indexOf(close, cursor + open.length);
    while (end >= 0 && escaped(text, end)) end = text.indexOf(close, end + close.length);
    if (end < 0) { cursor += open.length; continue; }
    const source = text.slice(cursor + open.length, end);
    // Single-dollar inline notation must hug its content and stay on one line.
    // This leaves prices such as '$5 and $10' alone.
    if (!source.trim() || (open === "$" && (source !== source.trim() || source.includes("\n") || /\d/.test(text[end + 1] || "")))) {
      cursor += open.length; continue;
    }
    if (cursor > plainStart) tokens.push({ type: "text", value: text.slice(plainStart, cursor) });
    tokens.push({ type: "math", value: source, raw: text.slice(cursor, end + close.length), display: open === "$$" || open === "\\[" });
    cursor = end + close.length;
    plainStart = cursor;
  }
  if (plainStart < text.length) tokens.push({ type: "text", value: text.slice(plainStart) });
  return tokens;
};
