import { useEffect, useState } from "react";
import { useI18n } from "@shared/lib/i18n";
import "katex/dist/katex.min.css";
import "./MathFormula.css";

// Only mathematical content loads the renderer. Other subjects keep their small bundle.
let renderer;
const loadRenderer = () => renderer ||= import("./mathRenderer");
export const MathFormula = ({ value, label = "", inline = false, displayMode = false, fallback = value }) => {
  const { t } = useI18n();
  const [rendered, setRendered] = useState({ value: "", html: "", error: false, displayMode: false });
  useEffect(() => {
    let live = true;
    if (value) loadRenderer().then(({ renderMathFormula }) => {
      if (live) setRendered({ value, displayMode, ...renderMathFormula(value, { displayMode }) });
    }).catch(() => { if (live) setRendered({ value, displayMode, html: "", error: true }); });
    return () => { live = false; };
  }, [value, displayMode]);
  if (!value) return null;
  const current = rendered.value === value && rendered.displayMode === displayMode ? rendered : {};
  return <span className={`math-formula${inline ? " math-formula--inline" : ""}`} role="group" aria-label={label || t("knowledge.fields.formula")}>
    {current.html ? <span className="math-formula__rendered" dangerouslySetInnerHTML={{ __html: current.html }} />
      : <code className="math-formula__source">{fallback}</code>}
    {current.error && !inline ? <span className="math-formula__error">{t("knowledge.invalidFormula")}</span> : null}
  </span>;
};
