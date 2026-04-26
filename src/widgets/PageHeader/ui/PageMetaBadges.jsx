import { memo, useMemo } from "react";
import { MetaBadge } from "@shared/ui";

export const PageMetaBadges = memo(() => {
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
    </div>
  );
});

PageMetaBadges.displayName = "PageMetaBadges";
