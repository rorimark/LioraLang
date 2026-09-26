import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SRS_SETTINGS,
  DEFAULT_STUDY_SETTINGS,
  buildRatingPreview,
  normalizeReviewCard,
} from "@shared/core/usecases/srs";
import { LANDING_DEMO_DECK } from "./landingDemoDeck";

// Same labels and tones as the Learn page's grading buttons.
const RATING_OPTIONS = [
  { key: "again", label: "Again", tone: "danger" },
  { key: "hard", label: "Hard", tone: "warning" },
  { key: "good", label: "Good", tone: "neutral" },
  { key: "easy", label: "Easy", tone: "success" },
];

// Every demo word is new, so the preview the engine gives for a new card is
// exactly what the app shows the first time a word is studied.
const NEW_CARD_PREVIEW = buildRatingPreview({
  card: normalizeReviewCard({}),
  srsSettings: DEFAULT_SRS_SETTINGS,
  studySettings: DEFAULT_STUDY_SETTINGS,
  nowMs: 0,
});

export const useLandingDemoSession = () => {
  const { words } = LANDING_DEMO_DECK;
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [log, setLog] = useState([]);

  const isDone = index >= words.length;
  const word = isDone ? null : words[index];

  const handleFlip = useCallback(() => setIsFlipped((value) => !value), []);

  const handleRate = useCallback(
    (ratingKey) => {
      if (!word) return;
      const option = RATING_OPTIONS.find((item) => item.key === ratingKey);
      setLog((entries) => [
        ...entries,
        {
          word: word.source,
          rating: option?.label ?? ratingKey,
          interval: NEW_CARD_PREVIEW[ratingKey],
        },
      ]);
      setIsFlipped(false);
      setIndex((value) => value + 1);
    },
    [word],
  );

  // The same keys as the Learn page: Space flips, 1 to 4 grade. Ignored while
  // the visitor is typing somewhere or holding a modifier.
  useEffect(() => {
    if (isDone) return undefined;

    const handleKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("input, textarea, select, [contenteditable]")) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        handleFlip();
        return;
      }

      const ratingIndex = ["1", "2", "3", "4"].indexOf(event.key);
      if (ratingIndex >= 0 && isFlipped) {
        event.preventDefault();
        handleRate(RATING_OPTIONS[ratingIndex].key);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleRate, isDone, isFlipped]);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setIsFlipped(false);
    setLog([]);
  }, []);

  const card = useMemo(() => {
    if (!word) return null;
    return {
      frontLabel: LANDING_DEMO_DECK.sourceLanguage,
      frontText: word.source,
      backLabel: LANDING_DEMO_DECK.targetLanguage,
      backText: word.target,
      backMetaBadges: [{ key: "level", text: word.level }],
      backDetails: [word.example],
      isFlipped,
      onFlip: handleFlip,
    };
  }, [handleFlip, isFlipped, word]);

  const ratingOptions = useMemo(
    () =>
      RATING_OPTIONS.map((option) => ({
        ...option,
        value: NEW_CARD_PREVIEW[option.key] || "-",
      })),
    [],
  );

  return {
    deckName: LANDING_DEMO_DECK.name,
    card,
    ratingOptions,
    canRate: isFlipped,
    position: Math.min(index + 1, words.length),
    total: words.length,
    isDone,
    log,
    handleRate,
    handleRestart,
  };
};
