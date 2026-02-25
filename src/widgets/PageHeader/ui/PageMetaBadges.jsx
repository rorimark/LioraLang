import { memo, useMemo } from "react";
import { MetaBadge } from "@shared/ui";

const STATIC_BADGES = [{ key: "focus", label: "Focus mode", accent: true }];

export const PageMetaBadges = memo(({ badges = STATIC_BADGES }) => {
  const formattedDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }).format(new Date()),
    [],
  );

  return (
    <div className="page-header__meta">
      <MetaBadge text={formattedDate} />
      {badges.map((badge) => (
        <MetaBadge key={badge.key} text={badge.label} accent={badge.accent} />
      ))}
    </div>
  );
});

PageMetaBadges.displayName = "PageMetaBadges";
