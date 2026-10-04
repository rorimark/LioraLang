import { describe, expect, it } from "vitest";
import { renderMathFormula } from "./mathRenderer";

describe("formula rendering", () => {
  it("renders fractions and accessible MathML", () => {
    const result = renderMathFormula(String.raw`\frac{a}{b}`);
    expect(result.error).toBe(false);
    expect(result.html).toContain("<math");
    expect(result.html).toContain("mfrac");
  });
  it("returns the original text path for invalid syntax", () => {
    expect(renderMathFormula(String.raw`\frac{a`)).toEqual({ html: "", error: true });
  });
  it.each([String.raw`\href{javascript:alert(1)}{click}`, String.raw`\includegraphics{https://evil.test/image}`, String.raw`\htmlStyle{position:fixed}{x}`])("never creates active content from %s", (source) => {
    const container = document.createElement("div");
    container.innerHTML = renderMathFormula(source).html;
    expect(container.querySelector('a,img,script,[style*="position:fixed"]')).toBeNull();
  });
  it("bounds macro expansion", () => {
    expect(renderMathFormula(String.raw`\def\x{\x}\x`).error).toBe(true);
  });
});
