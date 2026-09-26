import { memo } from "react";

export const LearnEmptyDeckState = memo(({ onCreateDeck, onOpenBrowse }) => (
  <div className="learn-desk__note-card learn-desk__note-card--empty">
    <strong>No decks yet.</strong>
    <p>Make your first deck, or take one that other learners published.</p>
    <div className="learn-desk__note-actions">
      <button
        type="button"
        className="learn-desk__key learn-desk__key--primary"
        onClick={onCreateDeck}
      >
        Create deck
      </button>
      <button type="button" className="learn-desk__key" onClick={onOpenBrowse}>
        Browse the hub
      </button>
    </div>
  </div>
));

LearnEmptyDeckState.displayName = "LearnEmptyDeckState";
