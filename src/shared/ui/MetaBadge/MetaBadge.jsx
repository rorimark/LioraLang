import { memo } from "react";
import "./MetaBadge.css";

export const MetaBadge = memo(({ text, accent = false }) => {
  return (
    <span className={`meta-badge ${accent ? "meta-badge--accent" : ""}`}>
      {text}
    </span>
  );
});

MetaBadge.displayName = "MetaBadge";
