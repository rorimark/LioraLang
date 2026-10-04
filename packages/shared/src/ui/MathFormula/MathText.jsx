import { MathFormula } from "./MathFormula";
import { splitMathText } from "./parseMathText";

// Phrasing-only markup also works inside a flashcard button or heading.
export const MathText = ({ children }) => splitMathText(children).map((token, index) =>
  token.type === "math" ? <MathFormula key={index} value={token.value} fallback={token.raw} inline={!token.display} displayMode={token.display} /> : token.value,
);
