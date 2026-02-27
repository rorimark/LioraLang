import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDecks, useDeckWords } from "@entities/deck";
import {
  LEARN_FLIP_SHORTCUT_MODES,
  LEARN_NAV_SHORTCUT_MODES,
  useShortcutSettings,
} from "@shared/lib/shortcutSettings";
import { readLearnProgress, saveLearnProgress } from "./learnProgressStorage";

const buildCardFrontText = (word) => word?.source || "-";

const buildCardBackText = (word) => {
  const parts = [word?.target, word?.tertiary].filter(Boolean).join(" • ");

  return parts || "No translation";
};

const buildCardMetaBadges = (word) => {
  if (!word) {
    return [];
  }

  const badges = [];

  if (word.level) {
    badges.push({ key: "level", text: `Level ${word.level}`, accent: false });
  }

  if (word.part_of_speech) {
    badges.push({
      key: "partOfSpeech",
      text: word.part_of_speech,
      accent: false,
    });
  }

  return badges;
};

const isInteractiveEventTarget = (target) => {
  if (!target || typeof target !== "object") {
    return false;
  }

  const elementTagName = target.tagName;
  const tagName =
    typeof elementTagName === "string" ? elementTagName.toLowerCase() : "";

  if (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    tagName === "option"
  ) {
    return true;
  }

  return Boolean(target.isContentEditable);
};

const hasNoModifiers = (event) =>
  !event.metaKey && !event.ctrlKey && !event.altKey;

const matchesFlipShortcut = (event, mode) => {
  if (mode === LEARN_FLIP_SHORTCUT_MODES.disabled || !hasNoModifiers(event)) {
    return false;
  }

  if (mode === LEARN_FLIP_SHORTCUT_MODES.enter) {
    return event.code === "Enter";
  }

  return event.code === "Space";
};

const matchesNextShortcut = (event, mode) => {
  if (mode === LEARN_NAV_SHORTCUT_MODES.disabled || !hasNoModifiers(event)) {
    return false;
  }

  if (mode === LEARN_NAV_SHORTCUT_MODES.ad) {
    return event.code === "KeyD";
  }

  if (mode === LEARN_NAV_SHORTCUT_MODES.jl) {
    return event.code === "KeyL";
  }

  return event.code === "ArrowRight";
};

const matchesPrevShortcut = (event, mode) => {
  if (mode === LEARN_NAV_SHORTCUT_MODES.disabled || !hasNoModifiers(event)) {
    return false;
  }

  if (mode === LEARN_NAV_SHORTCUT_MODES.ad) {
    return event.code === "KeyA";
  }

  if (mode === LEARN_NAV_SHORTCUT_MODES.jl) {
    return event.code === "KeyJ";
  }

  return event.code === "ArrowLeft";
};

const resolveFlipShortcutHint = (mode) => {
  if (mode === LEARN_FLIP_SHORTCUT_MODES.enter) {
    return "Enter";
  }

  if (mode === LEARN_FLIP_SHORTCUT_MODES.disabled) {
    return "Off";
  }

  return "Space";
};

const resolveNavigationShortcutHint = (mode) => {
  if (mode === LEARN_NAV_SHORTCUT_MODES.ad) {
    return "A / D";
  }

  if (mode === LEARN_NAV_SHORTCUT_MODES.jl) {
    return "J / L";
  }

  if (mode === LEARN_NAV_SHORTCUT_MODES.disabled) {
    return "Off";
  }

  return "← / →";
};

export const useLearnFlashcardsPanel = () => {
  const { decks, isLoading: isDecksLoading, error: decksError } = useDecks();
  const { shortcutSettings } = useShortcutSettings();
  const [progressState, setProgressState] = useState(() => readLearnProgress());
  const selectedDeckIdState = progressState.selectedDeckId;
  const isBackVisible = progressState.isBackVisible;
  const indexByDeckId = progressState.indexByDeckId;

  const selectedDeckId = useMemo(() => {
    if (!selectedDeckIdState) {
      return decks[0] ? String(decks[0].id) : "";
    }

    const hasSelectedDeck = decks.some(
      (deckItem) => String(deckItem.id) === selectedDeckIdState,
    );

    if (hasSelectedDeck) {
      return selectedDeckIdState;
    }

    return decks[0] ? String(decks[0].id) : "";
  }, [decks, selectedDeckIdState]);

  const {
    deck,
    words,
    isLoading: isWordsLoading,
    error: wordsError,
  } = useDeckWords(selectedDeckId);

  const safeWords = useMemo(() => (Array.isArray(words) ? words : []), [words]);
  const currentIndex = useMemo(() => {
    if (!selectedDeckId) {
      return 0;
    }

    const deckIndex = Number(indexByDeckId[selectedDeckId]);

    if (!Number.isFinite(deckIndex) || deckIndex < 0) {
      return 0;
    }

    return Math.floor(deckIndex);
  }, [indexByDeckId, selectedDeckId]);
  const hasCards = safeWords.length > 0;
  const resolvedIndex = hasCards
    ? Math.min(currentIndex, safeWords.length - 1)
    : 0;
  const currentWord = hasCards ? safeWords[resolvedIndex] : null;
  const normalizedIndexByDeckIdForSave = useMemo(() => {
    if (!selectedDeckId) {
      return indexByDeckId;
    }

    const expectedIndex = hasCards ? resolvedIndex : 0;
    const storedIndex = Number(indexByDeckId[selectedDeckId]);
    const safeStoredIndex =
      Number.isFinite(storedIndex) && storedIndex >= 0
        ? Math.floor(storedIndex)
        : 0;

    if (safeStoredIndex === expectedIndex) {
      return indexByDeckId;
    }

    return {
      ...indexByDeckId,
      [selectedDeckId]: expectedIndex,
    };
  }, [indexByDeckId, selectedDeckId, hasCards, resolvedIndex]);
  const cardFrontText = useMemo(
    () => buildCardFrontText(currentWord),
    [currentWord],
  );
  const cardBackText = useMemo(
    () => buildCardBackText(currentWord),
    [currentWord],
  );
  const cardMetaBadges = useMemo(
    () => buildCardMetaBadges(currentWord),
    [currentWord],
  );

  const handleDeckChange = useCallback((deckId) => {
    const normalizedDeckId = String(deckId || "");

    setProgressState((prevState) => {
      const existingDeckIndex = Number(prevState.indexByDeckId[normalizedDeckId]);
      const hasExistingDeckIndex =
        Number.isFinite(existingDeckIndex) && existingDeckIndex >= 0;

      return {
        selectedDeckId: normalizedDeckId,
        isBackVisible: false,
        indexByDeckId: hasExistingDeckIndex
          ? prevState.indexByDeckId
          : {
              ...prevState.indexByDeckId,
              [normalizedDeckId]: 0,
            },
      };
    });
  }, []);

  const handleDeckSelectChange = useCallback(
    (event) => {
      handleDeckChange(event.target.value);
    },
    [handleDeckChange],
  );

  const toggleBackVisibility = useCallback(() => {
    setProgressState((prevState) => ({
      ...prevState,
      isBackVisible: !prevState.isBackVisible,
    }));
  }, []);

  const handleNextCard = useCallback(() => {
    if (!hasCards || !selectedDeckId) {
      return;
    }

    setProgressState((prevState) => {
      const currentDeckIndex = Number(prevState.indexByDeckId[selectedDeckId]);
      const safeCurrentDeckIndex =
        Number.isFinite(currentDeckIndex) && currentDeckIndex >= 0
          ? Math.floor(currentDeckIndex)
          : 0;
      const nextDeckIndex = (safeCurrentDeckIndex + 1) % safeWords.length;

      return {
        ...prevState,
        isBackVisible: false,
        indexByDeckId: {
          ...prevState.indexByDeckId,
          [selectedDeckId]: nextDeckIndex,
        },
      };
    });
  }, [hasCards, safeWords.length, selectedDeckId]);

  const handlePrevCard = useCallback(() => {
    if (!hasCards || !selectedDeckId) {
      return;
    }

    setProgressState((prevState) => {
      const currentDeckIndex = Number(prevState.indexByDeckId[selectedDeckId]);
      const safeCurrentDeckIndex =
        Number.isFinite(currentDeckIndex) && currentDeckIndex >= 0
          ? Math.floor(currentDeckIndex)
          : 0;
      const prevDeckIndex =
        (safeCurrentDeckIndex - 1 + safeWords.length) % safeWords.length;

      return {
        ...prevState,
        isBackVisible: false,
        indexByDeckId: {
          ...prevState.indexByDeckId,
          [selectedDeckId]: prevDeckIndex,
        },
      };
    });
  }, [hasCards, safeWords.length, selectedDeckId]);

  useEffect(() => {
    saveLearnProgress({
      selectedDeckId,
      isBackVisible,
      indexByDeckId: normalizedIndexByDeckIdForSave,
    });
  }, [selectedDeckId, isBackVisible, normalizedIndexByDeckIdForSave]);

  const keyboardHandlersRef = useRef({
    canHandleCards: false,
    handleFlip: () => {},
    handleNext: () => {},
    handlePrev: () => {},
    flipShortcutMode: LEARN_FLIP_SHORTCUT_MODES.space,
    navigationShortcutMode: LEARN_NAV_SHORTCUT_MODES.arrows,
  });

  useEffect(() => {
    keyboardHandlersRef.current.canHandleCards = hasCards;
    keyboardHandlersRef.current.handleFlip = toggleBackVisibility;
    keyboardHandlersRef.current.handleNext = handleNextCard;
    keyboardHandlersRef.current.handlePrev = handlePrevCard;
    keyboardHandlersRef.current.flipShortcutMode = shortcutSettings.learnFlip;
    keyboardHandlersRef.current.navigationShortcutMode =
      shortcutSettings.learnNavigation;
  }, [
    hasCards,
    toggleBackVisibility,
    handleNextCard,
    handlePrevCard,
    shortcutSettings.learnFlip,
    shortcutSettings.learnNavigation,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleWindowKeyDown = (event) => {
      if (isInteractiveEventTarget(event.target)) {
        return;
      }

      const { canHandleCards, handleFlip, handleNext, handlePrev } =
        keyboardHandlersRef.current;
      const { flipShortcutMode, navigationShortcutMode } =
        keyboardHandlersRef.current;

      if (!canHandleCards) {
        return;
      }

      if (matchesFlipShortcut(event, flipShortcutMode)) {
        event.preventDefault();
        handleFlip();
        return;
      }

      if (matchesNextShortcut(event, navigationShortcutMode)) {
        event.preventDefault();
        handleNext();
        return;
      }

      if (matchesPrevShortcut(event, navigationShortcutMode)) {
        event.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, []);

  return {
    deck,
    decks,
    decksError,
    wordsError,
    isDecksLoading,
    isWordsLoading,
    selectedDeckId,
    currentWord,
    cardFrontText,
    cardBackText,
    cardMetaBadges,
    currentCardIndex: Math.min(resolvedIndex + 1, safeWords.length),
    cardsCount: safeWords.length,
    isBackVisible,
    flipShortcutHint: resolveFlipShortcutHint(shortcutSettings.learnFlip),
    navigationShortcutHint: resolveNavigationShortcutHint(
      shortcutSettings.learnNavigation,
    ),
    handleDeckSelectChange,
    handlePrevCard,
    handleNextCard,
    toggleBackVisibility,
  };
};
