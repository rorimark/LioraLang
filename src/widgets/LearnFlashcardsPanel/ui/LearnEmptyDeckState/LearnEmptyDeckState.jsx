import { memo } from "react";

export const LearnEmptyDeckState = memo(
  ({ onCreateDeck, onOpenBrowse }) => {
    return (
      <div className="learn-page-panel__status learn-page-panel__status--fill">
        <div className="learn-page-panel__empty-state">
          <strong>No decks yet.</strong>
          <span>Create your first deck or import one from Browse.</span>
          <div className="learn-page-panel__empty-actions">
            <button
              type="button"
              className="learn-page-panel__empty-action learn-page-panel__empty-action--primary"
              onClick={onCreateDeck}
            >
              Create deck
            </button>
            <button
              type="button"
              className="learn-page-panel__empty-action"
              onClick={onOpenBrowse}
            >
              Open Browse
            </button>
          </div>
        </div>
      </div>
    );
  },
);

LearnEmptyDeckState.displayName = "LearnEmptyDeckState";
