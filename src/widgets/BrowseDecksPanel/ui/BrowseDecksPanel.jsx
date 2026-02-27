import { memo } from "react";
import "./BrowseDecksPanel.css";

export const BrowseDecksPanel = memo(() => {
  return (
    <article className="panel browse-decks-panel">
      <h2>Browse Community Decks</h2>
      <p>
        This section is coming soon. Here you will be able to discover and
        download curated deck packages from LioraLangHub.
      </p>

      <div className="browse-decks-panel__placeholder" role="status" aria-live="polite">
        <strong>Coming soon</strong>
        <span>
          Search, filters, ratings, and one-click import will be available in
          the next iterations.
        </span>
      </div>
    </article>
  );
});

BrowseDecksPanel.displayName = "BrowseDecksPanel";
