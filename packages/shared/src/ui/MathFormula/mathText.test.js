import { describe, expect, it } from "vitest";
import { splitMathText } from "./parseMathText";

describe("math in prose", () => {
  it("mixes words, inline formulas and display formulas without losing text", () => {
    expect(splitMathText(String.raw`Solve $x^2=4$. Then \(x=2\) and $$\frac{a}{b}$$.`)).toEqual([
      {type:"text",value:"Solve "}, {type:"math",value:"x^2=4",raw:"$x^2=4$",display:false},
      {type:"text",value:". Then "}, {type:"math",value:"x=2",raw:String.raw`\(x=2\)`,display:false},
      {type:"text",value:" and "}, {type:"math",value:String.raw`\frac{a}{b}`,raw:String.raw`$$\frac{a}{b}$$`,display:true},
      {type:"text",value:"."},
    ]);
  });
  it("accepts multiline display notation", () => {
    expect(splitMathText("Before \\[a+b\n=c\\] after")[1]).toMatchObject({type:"math",value:"a+b\n=c",display:true});
  });
  it.each(["Pay $5 and $10", "An unfinished $x", String.raw`literal \$x\$`, "`$variable$`", "```\n$x$\n```", "普通文本", "x² + y²"])('preserves plain prose and literal code: %s', source => {
    expect(splitMathText(source)).toEqual([{type:"text",value:source}]);
  });
  it("preserves invalid math verbatim for the renderer's fallback", () => {
    expect(splitMathText(String.raw`Try $\frac{a$ now`)[1].raw).toBe(String.raw`$\frac{a$`);
  });
});
