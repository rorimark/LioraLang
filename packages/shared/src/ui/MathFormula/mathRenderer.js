import katex from "katex";

// Formula input never enables links, HTML attributes, external images or shared macros.
export const renderMathFormula = (value) => {
  const source = String(value || "").trim();
  const math = source.startsWith("$$") && source.endsWith("$$") ? source.slice(2, -2)
    : source.startsWith("$") && source.endsWith("$") ? source.slice(1, -1) : source;
  try {
    return { html: katex.renderToString(math, { displayMode: false, output: "htmlAndMathml",
      trust: false, strict: "ignore", throwOnError: true, maxExpand: 300, maxSize: 8, macros: {} }), error: false };
  } catch {
    return { html: "", error: true };
  }
};
