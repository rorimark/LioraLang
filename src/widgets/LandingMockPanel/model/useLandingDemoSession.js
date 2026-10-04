import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SRS_SETTINGS,
  DEFAULT_STUDY_SETTINGS,
  buildRatingPreview,
  normalizeReviewCard,
} from "@shared/core/usecases/srs";
import { useI18n } from "@shared/lib/i18n";
import { buildLandingDemoDeck } from "./landingDemoDeck";

// Same grades and tones as the Learn page's buttons; the words for them
// come from the interface's language when shown.
const RATING_OPTIONS = [
  { key: "again", tone: "danger" },
  { key: "hard", tone: "warning" },
  { key: "good", tone: "neutral" },
  { key: "easy", tone: "success" },
];

// Every demo word is new, so the preview the engine gives for a new card is
// exactly what the app shows the first time a word is studied.
const NEW_CARD_PREVIEW = buildRatingPreview({
  card: normalizeReviewCard({}),
  srsSettings: DEFAULT_SRS_SETTINGS,
  studySettings: DEFAULT_STUDY_SETTINGS,
  nowMs: 0,
});

// Keys belong to the page unless the demo is on screen: a visitor scrolling
// with Space, or pressing it on a focused link or button, must get what the
// browser normally does, not a card flipping out of sight.
const INTERACTIVE_SELECTOR =
  "a, button, input, textarea, select, summary, [contenteditable], [role='button']";

const isOnScreen = (element) => {
  if (!element) return false;
  const { top, bottom } = element.getBoundingClientRect();
  return bottom > 0 && top < window.innerHeight;
};

export const useLandingDemoSession = (demoRef) => {
  const { t, locale, languageName, formatInterval } = useI18n();
  const deck = useMemo(() => buildLandingDemoDeck(locale), [locale]);
  const { words } = deck;
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [log, setLog] = useState([]);

  const isDone = index >= words.length;
  const word = isDone ? null : words[index];

  const handleFlip = useCallback(() => setIsFlipped((value) => !value), []);
  const handleReveal = useCallback(() => setIsFlipped(true), []);

  const handleRate = useCallback(
    (ratingKey) => {
      if (!word) return;
      setLog((entries) => [
        ...entries,
        {
          word: word.source,
          rating: ratingKey,
          interval: NEW_CARD_PREVIEW[ratingKey],
        },
      ]);
      setIsFlipped(false);
      setIndex((value) => value + 1);
    },
    [word],
  );

  // The same keys as the Learn page: Space flips, 1 to 4 grade. Only while
  // the demo is visible, with no modifier held and no control focused (a
  // focused button already answers Space by itself).
  useEffect(() => {
    if (isDone) return undefined;

    const handleKeyDown = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement && target.closest(INTERACTIVE_SELECTOR)) {
        return;
      }
      if (!isOnScreen(demoRef?.current)) return;

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
  }, [demoRef, handleFlip, handleRate, isDone, isFlipped]);

  const handleRestart = useCallback(() => {
    setIndex(0);
    setIsFlipped(false);
    setLog([]);
  }, []);

  const card = useMemo(() => {
    if (!word) return null;
    return {
      frontLabel: languageName(deck.sourceLanguage),
      frontText: word.source,
      backLabel: languageName(deck.targetLanguage),
      backText: word.target,
      backMetaBadges: [{ key: "level", text: word.level }],
      backDetails: [word.example],
      isFlipped,
      onFlip: handleFlip,
    };
  }, [deck, handleFlip, isFlipped, languageName, word]);

  const ratingOptions = useMemo(
    () =>
      RATING_OPTIONS.map((option) => ({
        ...option,
        label: t(`grades.${option.key}.label`),
        value: NEW_CARD_PREVIEW[option.key] ? formatInterval(NEW_CARD_PREVIEW[option.key]) : "-",
      })),
    [formatInterval, t],
  );

  return {
    deck,
    card,
    ratingOptions,
    canRate: isFlipped,
    position: Math.min(index + 1, words.length),
    total: words.length,
    isDone,
    log,
    handleRate,
    handleReveal,
    handleRestart,
  };
};
