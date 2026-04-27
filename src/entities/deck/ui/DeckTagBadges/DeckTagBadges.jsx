import { memo } from "react";
import { MetaBadge } from "@shared/ui";
import "./DeckTagBadges.css";

const EMPTY_ARRAY = Object.freeze([]);

const normalizeBadge = (badge, index) => {
  if (typeof badge === "string") {
    return {
      key: `badge-${index}-${badge}`,
      text: badge,
      accent: false,
    };
  }

  if (!badge || typeof badge !== "object") {
    return null;
  }

  const text = typeof badge.text === "string" ? badge.text.trim() : "";

  if (!text) {
    return null;
  }

  return {
    key: badge.key || `badge-${index}-${text}`,
    text,
    accent: Boolean(badge.accent),
  };
};

export const DeckTagBadges = memo(({
  badges = EMPTY_ARRAY,
  className = "",
  inline = false,
}) => {
  const resolvedBadges = Array.isArray(badges) ? badges : EMPTY_ARRAY;
  const classes = [
    "deck-tag-badges",
    inline ? "deck-tag-badges--inline" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (resolvedBadges.length === 0) {
    return null;
  }

  return (
    <div className={classes}>
      {resolvedBadges.map((badge, index) => {
        const normalizedBadge = normalizeBadge(badge, index);

        if (!normalizedBadge) {
          return null;
        }

        return (
          <MetaBadge
            key={normalizedBadge.key}
            text={normalizedBadge.text}
            accent={normalizedBadge.accent}
          />
        );
      })}
    </div>
  );
});

DeckTagBadges.displayName = "DeckTagBadges";
