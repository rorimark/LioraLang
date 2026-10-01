import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useDecks, useDeckWords } from "@entities/deck";
import { ROUTE_PATHS } from "@shared/config/routes";
import { useAppPreferences } from "@shared/lib/appPreferences";
import {
  LEARN_FLIP_SHORTCUT_MODES,
  LEARN_RATING_SHORTCUT_MODES,
  resolveLearnFlipKeyLabel,
  resolveLearnRatingKeyLabels,
  useShortcutSettings,
} from "@shared/lib/shortcutSettings";
import { EMPTY_SRS_SESSION as EMPTY_SESSION } from "@shared/core/usecases/srs";
import { useSrsSession } from "./useSrsSession";
import { buildSessionReceipt } from "./sessionReceipt";
import {
  hasStoredLearnProgressViewMode,
  readLearnProgressFromSession,
  readBrowseProgressFromStorage,
  writeBrowseProgressToStorage,
  writeLearnProgressToSession,
} from "./learnProgressStorage";
import {
  LEARN_EXERCISE_MODE_FLASHCARDS,
  LEARN_SESSION_DIRECTION_MIXED,
  LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE,
  normalizeLearnSessionSettings,
  pickLocalOnlyLearnSessionSettings,
  readLearnSessionSettingsFromStorage,
  writeLearnSessionSettingsToStorage,
} from "./learnSessionSettings";
import { resolveDeckSideLabels } from "./deckSideLabels";
import { CONTENT_TYPES, resolveCardDirection, resolveCardFaces, TEXT_ROLES } from "@shared/core/usecases/cardContent";
import {
  LEARN_VIEW_MODE_BROWSE,
  LEARN_VIEW_MODE_SRS,
  resolveLoopedBrowseIndex,
  resolvePreferredLearnViewMode,
} from "./learnViewMode";
import { useI18n } from "@shared/lib/i18n";

// Labels and descriptions are messages: grades.<key>.label / .description.
const RATING_OPTIONS = [
  { key: "again", tone: "danger" },
  { key: "hard", tone: "warning" },
  { key: "good", tone: "neutral" },
  { key: "easy", tone: "success" },
];

const AUTO_FLIP_DELAY_TO_MS = {
  off: 0,
  "1s": 1000,
  "2s": 2000,
  "3s": 3000,
};

const SHUFFLE_MODE_OFF = "off";
const SHUFFLE_MODE_PER_SESSION = "per_session";
const createShuffleSeed = () => Math.floor(Math.random() * 2_147_483_646) + 1;

const buildDirectionSummary = (
  directionMode = LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  deck = {},
  i18n,
) => {
  const { source, target } = resolveDeckSideLabels(deck, i18n);

  if (directionMode === LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE) {
    return `${target} → ${source}`;
  }

  if (directionMode === LEARN_SESSION_DIRECTION_MIXED) {
    return `${source} ↔ ${target}`;
  }

  return `${source} → ${target}`;
};

// What one side of the card shows, from the entry's content: text as a
// line, a picture as an image. A missing translation says so.
const toFaceText = (content, t) => {
  if (!content || content.type !== CONTENT_TYPES.text) {
    return "";
  }

  if (content.text) {
    return content.text;
  }

  return content.role === TEXT_ROLES.translation ? t("learn.noTranslation") : "-";
};

const toFaceImage = (content, alt) =>
  content?.type === CONTENT_TYPES.image ? { assetId: content.assetId, alt } : null;

const buildCardMetaBadges = (word, sessionSettings = {}, { t, partOfSpeechName }) => {
  if (!word) {
    return [];
  }

  const badges = [];

  if (sessionSettings.showLevel && word.level) {
    badges.push({ key: "level", text: t("learn.level", { level: word.level }), accent: false });
  }

  if (sessionSettings.showPartOfSpeech && word.part_of_speech) {
    badges.push({
      key: "partOfSpeech",
      text: partOfSpeechName(word.part_of_speech),
      accent: false,
    });
  }

  return badges;
};

const buildCardBackDetails = (word, sessionSettings = {}) => {
  if (!word || !sessionSettings.showExamples || !Array.isArray(word.examples)) {
    return [];
  }

  return word.examples
    .map((example) => (typeof example === "string" ? example.trim() : ""))
    .filter(Boolean)
    .slice(0, 3);
};

const isInteractiveEventTarget = (target) => {
  if (!target || typeof target !== "object") {
    return false;
  }

  const tagName =
    typeof target.tagName === "string" ? target.tagName.toLowerCase() : "";

  if (["input", "textarea", "select", "option"].includes(tagName)) {
    return true;
  }

  return Boolean(target.isContentEditable);
};

const hasNoModifiers = (event) =>
  !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;

const matchesFlipShortcut = (event, mode) => {
  if (mode === LEARN_FLIP_SHORTCUT_MODES.disabled || !hasNoModifiers(event)) {
    return false;
  }

  if (mode === LEARN_FLIP_SHORTCUT_MODES.enter) {
    return event.code === "Enter";
  }

  return event.code === "Space";
};

const resolveRatingFromKeyboardShortcut = (event, mode) => {
  if (
    mode === LEARN_RATING_SHORTCUT_MODES.disabled ||
    !hasNoModifiers(event)
  ) {
    return "";
  }

  const { code } = event;

  if (mode === LEARN_RATING_SHORTCUT_MODES.asdf) {
    if (code === "KeyA") {
      return "again";
    }

    if (code === "KeyS") {
      return "hard";
    }

    if (code === "KeyD") {
      return "good";
    }

    if (code === "KeyF") {
      return "easy";
    }

    return "";
  }

  if (mode === LEARN_RATING_SHORTCUT_MODES.arrows) {
    if (code === "ArrowLeft") {
      return "again";
    }

    if (code === "ArrowDown") {
      return "hard";
    }

    if (code === "ArrowUp") {
      return "good";
    }

    if (code === "ArrowRight") {
      return "easy";
    }

    return "";
  }

  if (code === "Digit1" || code === "Numpad1") {
    return "again";
  }

  if (code === "Digit2" || code === "Numpad2") {
    return "hard";
  }

  if (code === "Digit3" || code === "Numpad3") {
    return "good";
  }

  if (code === "Digit4" || code === "Numpad4") {
    return "easy";
  }

  return "";
};

const resolveBrowseNavigationShortcut = (event) => {
  const { code } = event;

  if (code === "ArrowLeft") {
    return "prev";
  }

  if (code === "ArrowRight") {
    return "next";
  }

  return "";
};

const buildCompletionMessage = (session, t) => {
  if (!session?.completionState?.done) return "";
  if (session.completionState.reason === "daily-limit") return t("learn.done.dailyLimit");
  if (session.completionState.reason === "empty-deck") return t("learn.done.emptyDeck");
  if (session.completionState.reason === "learning-wait") return t("learn.done.learningWait");
  return t("learn.done.allDone");
};

export const useLearnFlashcardsPanel = () => {
  const i18n = useI18n();
  const { t, formatInterval } = i18n;
  const navigate = useNavigate();
  const location = useLocation();
  const srsRepository = usePlatformService("srsRepository");
  const authRepository = usePlatformService("authRepository");
  const syncRepository = usePlatformService("syncRepository");
  const { decks, isLoading: isDecksLoading, error: decksError } = useDecks();
  const { appPreferences, updateAppPreferences } = useAppPreferences();
  const { shortcutSettings } = useShortcutSettings();
  // The last thing that took a card off the desk: a grade, or a step back or
  // forward while browsing. The view animates the card away from it.
  const [cardMove, setCardMove] = useState(null);
  const cardMoveTokenRef = useRef(0);
  const [gradesByDeckId, setGradesByDeckId] = useState({});
  const announceCardMove = useCallback((kind) => {
    cardMoveTokenRef.current += 1;
    setCardMove({ token: cardMoveTokenRef.current, kind });
  }, []);
  const preferredLearnViewMode = resolvePreferredLearnViewMode(
    appPreferences?.studySession?.defaultStudyMode,
  );
  const [learnProgress, setLearnProgress] = useState(() => {
    const baseProgress = readLearnProgressFromSession(preferredLearnViewMode);
    const persistedBrowse = readBrowseProgressFromStorage();

    return {
      ...baseProgress,
      lastBrowseWordIdByDeck: {
        ...persistedBrowse,
        ...baseProgress.lastBrowseWordIdByDeck,
      },
    };
  });
  const [handledImportKey, setHandledImportKey] = useState(null);
  const importedDeckId = String(location.state?.importedDeckId || "").trim();
  if (importedDeckId && handledImportKey !== location.key) {
    setHandledImportKey(location.key);
    setLearnProgress((previous) => ({ ...previous, selectedDeckId: importedDeckId, isBackVisible: false }));
  }
  const [hasPersistedViewMode, setHasPersistedViewMode] = useState(() =>
    hasStoredLearnProgressViewMode(),
  );
  const [localSessionSettings, setSessionSettings] = useState(() =>
    readLearnSessionSettingsFromStorage(appPreferences),
  );
  const sessionSettings = useMemo(() => normalizeLearnSessionSettings(
    pickLocalOnlyLearnSessionSettings(localSessionSettings), appPreferences,
  ), [localSessionSettings, appPreferences]);
  const [isSessionSettingsOpen, setIsSessionSettingsOpen] = useState(false);
  const [shuffleSeed] = useState(createShuffleSeed);

  const spacedRepetitionSettings = appPreferences.spacedRepetition;
  const shuffleMode = sessionSettings.shuffleMode || SHUFFLE_MODE_OFF;
  const autoFlipDelayMs =
    AUTO_FLIP_DELAY_TO_MS[sessionSettings.autoFlipDelay] || 0;
  const learnViewMode = !hasPersistedViewMode ? preferredLearnViewMode :
    learnProgress.viewMode === LEARN_VIEW_MODE_BROWSE ||
    learnProgress.viewMode === LEARN_VIEW_MODE_SRS
      ? learnProgress.viewMode
      : preferredLearnViewMode;
  const isBrowseMode = learnViewMode === LEARN_VIEW_MODE_BROWSE;

  const selectedDeckId = useMemo(() => {
    if (!learnProgress.selectedDeckId) {
      return decks[0] ? String(decks[0].id) : "";
    }

    const hasSelectedDeck = decks.some(
      (deckItem) => String(deckItem.id) === learnProgress.selectedDeckId,
    );

    if (hasSelectedDeck) {
      return learnProgress.selectedDeckId;
    }

    return decks[0] ? String(decks[0].id) : "";
  }, [decks, learnProgress.selectedDeckId]);

  const {
    deck: deckDetails,
    words: deckWords,
    isLoading: isDeckWordsLoading,
    error: deckWordsError,
    refreshDeckWords,
  } = useDeckWords(selectedDeckId);

  const srsSettings = useMemo(() => ({
    spacedRepetition: spacedRepetitionSettings,
    studySession: {
      dailyGoal: sessionSettings.dailyGoal,
      repeatWrongCards: sessionSettings.repeatWrongCards,
      shuffleMode,
      shuffleSeed: shuffleMode === SHUFFLE_MODE_PER_SESSION ? shuffleSeed : null,
    },
  }), [spacedRepetitionSettings, sessionSettings.dailyGoal, sessionSettings.repeatWrongCards, shuffleMode, shuffleSeed]);
  const {
    session, error: sessionError, isLoading: isSessionLoading, isRatingPending,
    rate: rateSrsCard, refresh: refreshSession, startExtra: handleStartNewSession,
  } = useSrsSession({ deckId: selectedDeckId, enabled: !isBrowseMode, settings: srsSettings,
    repository: srsRepository, authRepository, syncRepository });
  const isExtendedSession = session.sessionMode === "extended";
  const baseDeck = isBrowseMode ? deckDetails : session?.deck || deckDetails || null;
  // Which side is pictures, and which language is learned, come from the
  // deck list; the study session's own copy of the deck carries only its
  // languages.
  const listedDeck = decks.find((deck) => String(deck?.id) === String(selectedDeckId));
  const listedPictureSide = listedDeck?.pictureSide || "";
  const listedLearnedSide = listedDeck?.learnedSide || "";
  const currentDeck = useMemo(
    () =>
      baseDeck
        ? {
            ...baseDeck,
            pictureSide: baseDeck.pictureSide || listedPictureSide,
            learnedSide: baseDeck.learnedSide || listedLearnedSide,
          }
        : null,
    [baseDeck, listedLearnedSide, listedPictureSide],
  );
  const directionSummary = useMemo(
    () => buildDirectionSummary(sessionSettings.directionMode, currentDeck, i18n),
    [currentDeck, i18n, sessionSettings.directionMode],
  );
  const sessionSummary = useMemo(() => {
    const engineLabel = isBrowseMode ? t("learn.engine.review") : t("learn.engine.srs");
    return `${engineLabel} · ${t("learn.exercise.flashcards")} · ${directionSummary}`;
  }, [directionSummary, isBrowseMode, t]);

  const setBrowseProgressCardWordId = useCallback((deckId, wordId) => {
    const normalizedWordId =
      typeof wordId === "string"
        ? wordId.trim()
        : typeof wordId === "number" && Number.isFinite(wordId) && wordId > 0
          ? String(wordId)
          : "";

    setLearnProgress((prevState) => {
      const nextMap = {
        ...prevState.lastBrowseWordIdByDeck,
      };

      if (normalizedWordId) {
        nextMap[deckId] = normalizedWordId;
      } else {
        delete nextMap[deckId];
      }

      const nextState = {
        ...prevState,
        lastBrowseWordIdByDeck: nextMap,
      };

      writeLearnProgressToSession(nextState);
      writeBrowseProgressToStorage(nextMap);

      return nextState;
    });
  }, []);

  const lastViewedWordId =
    learnProgress.lastBrowseWordIdByDeck[selectedDeckId];
  const browseIndexById = useMemo(() => {
    const indexMap = new Map();
    deckWords.forEach((word, index) => {
      if (word?.id != null) {
        indexMap.set(String(word.id), index);
      }
    });
    return indexMap;
  }, [deckWords]);
  const browseWordIndex = useMemo(() => {
    if (deckWords.length === 0) {
      return 0;
    }

    if (lastViewedWordId != null) {
      const resolvedIndex = browseIndexById.get(String(lastViewedWordId));
      if (Number.isInteger(resolvedIndex)) {
        return resolvedIndex;
      }
    }

    return 0;
  }, [browseIndexById, deckWords.length, lastViewedWordId]);
  const browseWord = deckWords[browseWordIndex] || null;
  const browseProgressLabel =
    deckWords.length > 0
      ? `${browseWordIndex + 1} / ${deckWords.length}`
      : "";
  const canBrowsePrev = deckWords.length > 1;
  const canBrowseNext = deckWords.length > 1;

  useEffect(() => {
    const routeState =
      location.state && typeof location.state === "object" ? location.state : null;
    const importedDeckId =
      typeof routeState?.importedDeckId === "string" || typeof routeState?.importedDeckId === "number"
        ? String(routeState.importedDeckId).trim()
        : "";

    if (!importedDeckId) {
      return;
    }

    const nextState = { ...routeState };
    delete nextState.importedDeckId;

    navigate(
      {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash,
      },
      {
        replace: true,
        state: Object.keys(nextState).length > 0 ? nextState : null,
      },
    );
  }, [location.hash, location.pathname, location.search, location.state, navigate]);

  useEffect(() => {
    writeLearnProgressToSession({ ...learnProgress, selectedDeckId, viewMode: learnViewMode });
  }, [learnProgress, learnViewMode, selectedDeckId]);

  useEffect(() => {
    writeBrowseProgressToStorage(learnProgress.lastBrowseWordIdByDeck);
  }, [learnProgress.lastBrowseWordIdByDeck]);

  useEffect(() => {
    writeLearnSessionSettingsToStorage(sessionSettings, appPreferences);
  }, [appPreferences, sessionSettings]);

  const srsCard = session?.card || null;
  const currentWord = isBrowseMode ? browseWord : srsCard;
  const srsIdentity = `${selectedDeckId}:${srsCard?.wordId}:${srsCard?.revision}`;
  const isBackVisible = learnProgress.isBackVisible && (isBrowseMode || learnProgress.revealedSrsIdentity === srsIdentity);

  useEffect(() => {
    if (isSessionSettingsOpen || !currentWord || isBackVisible || autoFlipDelayMs <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLearnProgress((prevState) => ({
        ...prevState,
        isBackVisible: true,
        revealedSrsIdentity: srsIdentity,
      }));
    }, autoFlipDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoFlipDelayMs, currentWord, isBackVisible, isSessionSettingsOpen, srsIdentity]);

  const handleDeckChange = useCallback((deckId) => {
    const normalizedDeckId = String(deckId || "");

    setLearnProgress((prevState) => ({
      ...prevState,
      selectedDeckId: normalizedDeckId,
      isBackVisible: false,
    }));
  }, []);

  const handleDeckSelectChange = useCallback(
    (event) => {
      handleDeckChange(event.target.value);
    },
    [handleDeckChange],
  );

  const openSessionSettings = useCallback(() => {
    setIsSessionSettingsOpen(true);
  }, []);

  const closeSessionSettings = useCallback(() => {
    setIsSessionSettingsOpen(false);
  }, []);

  const updateSessionSettings = useCallback((patch) => {
    const nextSharedStudySessionPatch = {};

    if (Object.hasOwn(patch, "dailyGoal")) {
      nextSharedStudySessionPatch.dailyGoal = patch.dailyGoal;
    }

    if (Object.hasOwn(patch, "autoFlipDelay")) {
      nextSharedStudySessionPatch.autoFlipDelay = patch.autoFlipDelay;
    }

    if (Object.hasOwn(patch, "shuffleMode")) {
      nextSharedStudySessionPatch.shuffleMode = patch.shuffleMode;
    }

    if (Object.hasOwn(patch, "repeatWrongCards")) {
      nextSharedStudySessionPatch.repeatWrongCards = patch.repeatWrongCards;
    }

    setSessionSettings((prevState) =>
      normalizeLearnSessionSettings(
        {
          ...prevState,
          ...patch,
        },
        appPreferences,
      ),
    );
    setLearnProgress((prevState) => ({
      ...prevState,
      isBackVisible: false,
    }));

    if (Object.keys(nextSharedStudySessionPatch).length > 0) {
      updateAppPreferences({
        studySession: nextSharedStudySessionPatch,
      });
    }
  }, [appPreferences, updateAppPreferences]);

  const setViewMode = useCallback((mode) => {
    const nextMode =
      mode === LEARN_VIEW_MODE_BROWSE ? LEARN_VIEW_MODE_BROWSE : LEARN_VIEW_MODE_SRS;

    setHasPersistedViewMode(true);
    setLearnProgress((prevState) => ({
      ...prevState,
      viewMode: nextMode,
      isBackVisible: false,
    }));
  }, []);

  const switchToSrsMode = useCallback(() => {
    setViewMode(LEARN_VIEW_MODE_SRS);
  }, [setViewMode]);

  const switchToBrowseMode = useCallback(() => {
    setViewMode(LEARN_VIEW_MODE_BROWSE);
  }, [setViewMode]);

  const handleDirectionModeChange = useCallback(
    (directionMode) => {
      updateSessionSettings({ directionMode });
    },
    [updateSessionSettings],
  );

  const handleExerciseModeChange = useCallback(
    (exerciseMode) => {
      if (exerciseMode !== LEARN_EXERCISE_MODE_FLASHCARDS) {
        return;
      }

      updateSessionSettings({ exerciseMode });
    },
    [updateSessionSettings],
  );

  const handleSessionDailyGoalChange = useCallback(
    (event) => {
      const numeric = Number(event.target.value);

      updateSessionSettings({
        dailyGoal: Number.isFinite(numeric) ? numeric : sessionSettings.dailyGoal,
      });
    },
    [sessionSettings.dailyGoal, updateSessionSettings],
  );

  const handleSessionAutoFlipDelayChange = useCallback(
    (event) => {
      updateSessionSettings({ autoFlipDelay: event.target.value });
    },
    [updateSessionSettings],
  );

  const handleSessionShuffleModeChange = useCallback(
    (event) => {
      updateSessionSettings({ shuffleMode: event.target.value });
    },
    [updateSessionSettings],
  );

  const handleSessionRepeatWrongCardsChange = useCallback(
    (event) => {
      updateSessionSettings({ repeatWrongCards: event.target.checked });
    },
    [updateSessionSettings],
  );

  const handleShowExamplesChange = useCallback(
    (event) => {
      updateSessionSettings({ showExamples: event.target.checked });
    },
    [updateSessionSettings],
  );

  const handleShowLevelChange = useCallback(
    (event) => {
      updateSessionSettings({ showLevel: event.target.checked });
    },
    [updateSessionSettings],
  );

  const handleShowPartOfSpeechChange = useCallback(
    (event) => {
      updateSessionSettings({ showPartOfSpeech: event.target.checked });
    },
    [updateSessionSettings],
  );

  const toggleBackVisibility = useCallback(() => {
    if (!currentWord || isRatingPending) {
      return;
    }

    setLearnProgress((prevState) => ({
      ...prevState,
      isBackVisible: !isBackVisible,
      revealedSrsIdentity: srsIdentity,
    }));
  }, [currentWord, isRatingPending, isBackVisible, srsIdentity]);

  // The card just missed, for a hint on how to remember it. Any other grade
  // moves on, and the hint with it.
  const [missedCard, setMissedCard] = useState(null);
  const dismissMissedCard = useCallback(() => setMissedCard(null), []);

  const handleRateCard = useCallback(async (rating) => {
    if (isBrowseMode || !isBackVisible || isRatingPending) return;
    const ratedWord = currentWord;
    // The direction it was shown in: the hint is about what was asked.
    const ratedDirection = resolveCardDirection(sessionSettings.directionMode, ratedWord || {});
    if (!await rateSrsCard(rating)) return;
    setMissedCard(
      rating === "again" && ratedWord ? { word: ratedWord, deckId: selectedDeckId, direction: ratedDirection } : null,
    );
    announceCardMove(rating);
    setGradesByDeckId((previous) => ({
      ...previous, [selectedDeckId]: [...(previous[selectedDeckId] || []), rating],
    }));
    setLearnProgress((previous) => ({ ...previous, isBackVisible: false }));
  }, [
    announceCardMove,
    currentWord,
    isBackVisible,
    isBrowseMode,
    isRatingPending,
    rateSrsCard,
    selectedDeckId,
    sessionSettings.directionMode,
  ]);

  const handleBrowsePrev = useCallback(() => {
    if (!isBrowseMode || !selectedDeckId || deckWords.length === 0) {
      return;
    }

    const nextWord = deckWords[
      resolveLoopedBrowseIndex({
        currentIndex: browseWordIndex,
        total: deckWords.length,
        direction: -1,
      })
    ];
    if (!nextWord) {
      return;
    }

    announceCardMove("prev");
    setBrowseProgressCardWordId(selectedDeckId, nextWord.id);
    setLearnProgress((prevState) => ({
      ...prevState,
      isBackVisible: false,
    }));
  }, [
    announceCardMove,
    browseWordIndex,
    deckWords,
    isBrowseMode,
    selectedDeckId,
    setBrowseProgressCardWordId,
  ]);

  const handleBrowseNext = useCallback(() => {
    if (!isBrowseMode || !selectedDeckId || deckWords.length === 0) {
      return;
    }

    const nextWord = deckWords[
      resolveLoopedBrowseIndex({
        currentIndex: browseWordIndex,
        total: deckWords.length,
        direction: 1,
      })
    ];
    if (!nextWord) {
      return;
    }

    announceCardMove("next");
    setBrowseProgressCardWordId(selectedDeckId, nextWord.id);
    setLearnProgress((prevState) => ({
      ...prevState,
      isBackVisible: false,
    }));
  }, [
    announceCardMove,
    browseWordIndex,
    deckWords,
    isBrowseMode,
    selectedDeckId,
    setBrowseProgressCardWordId,
  ]);

  const keyboardHandlersRef = useRef({
    canFlip: false,
    canRate: false,
    canBrowse: false,
    handleFlip: () => {},
    handleRate: () => {},
    handleBrowsePrev: () => {},
    handleBrowseNext: () => {},
    flipShortcutMode: LEARN_FLIP_SHORTCUT_MODES.space,
    ratingShortcutMode: LEARN_RATING_SHORTCUT_MODES.digits,
  });

  useEffect(() => {
    keyboardHandlersRef.current.canFlip = Boolean(currentWord) && !isRatingPending;
    keyboardHandlersRef.current.canRate =
      Boolean(currentWord) &&
      isBackVisible &&
      !isRatingPending &&
      !isBrowseMode;
    keyboardHandlersRef.current.canBrowse =
      Boolean(currentWord) && !isRatingPending && isBrowseMode;
    keyboardHandlersRef.current.handleFlip = toggleBackVisibility;
    keyboardHandlersRef.current.handleRate = handleRateCard;
    keyboardHandlersRef.current.handleBrowsePrev = handleBrowsePrev;
    keyboardHandlersRef.current.handleBrowseNext = handleBrowseNext;
    keyboardHandlersRef.current.flipShortcutMode = shortcutSettings.learnFlip;
    keyboardHandlersRef.current.ratingShortcutMode =
      shortcutSettings.learnRating;
  }, [
    currentWord,
    handleBrowseNext,
    handleBrowsePrev,
    handleRateCard,
    isBrowseMode,
    isRatingPending,
    isBackVisible,
    shortcutSettings.learnFlip,
    shortcutSettings.learnRating,
    toggleBackVisibility,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleWindowKeyDown = (event) => {
      // Keys pressed in a dialog over the desk belong to the dialog.
      if (
        isInteractiveEventTarget(event.target) ||
        event.target?.closest?.('[aria-modal="true"]')
      ) {
        return;
      }

      const {
        canFlip,
        canRate,
        canBrowse,
        handleFlip,
        handleRate,
        handleBrowsePrev,
        handleBrowseNext,
        flipShortcutMode,
        ratingShortcutMode,
      } = keyboardHandlersRef.current;

      if (canFlip && matchesFlipShortcut(event, flipShortcutMode)) {
        event.preventDefault();
        handleFlip();
        return;
      }

      if (canBrowse) {
        const browseAction = resolveBrowseNavigationShortcut(event);

        if (browseAction === "prev") {
          event.preventDefault();
          handleBrowsePrev();
          return;
        }

        if (browseAction === "next") {
          event.preventDefault();
          handleBrowseNext();
          return;
        }
      }

      if (!canRate) {
        return;
      }

      const ratingFromShortcut = resolveRatingFromKeyboardShortcut(
        event,
        ratingShortcutMode,
      );

      if (ratingFromShortcut) {
        event.preventDefault();
        handleRate(ratingFromShortcut);
      }
    };

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, []);

  const ratingOptions = useMemo(() => {
    if (isBrowseMode) {
      return [];
    }

    const preview = currentWord?.ratingPreview || {};

    return RATING_OPTIONS.map((option) => ({
      ...option,
      label: t(`grades.${option.key}.label`),
      description: t(`grades.${option.key}.description`),
      value: preview[option.key] ? formatInterval(preview[option.key]) : "-",
    }));
  }, [currentWord, formatInterval, isBrowseMode, t]);
  const cardFaces = useMemo(
    () => resolveCardFaces(currentWord || {}, sessionSettings.directionMode, currentDeck || {}),
    [currentDeck, currentWord, sessionSettings.directionMode],
  );
  // The side names on the card, in the interface's language: a language,
  // or "Picture" for a picture side.
  const sideLabels = resolveDeckSideLabels(currentDeck || {}, i18n);
  const labelForContent = (content) =>
    content?.role === TEXT_ROLES.source || (content?.type === CONTENT_TYPES.image && currentDeck?.pictureSide === "source")
      ? sideLabels.source
      : sideLabels.target;
  const cardFrontLabel = labelForContent(cardFaces.front);
  const cardBackLabel = labelForContent(cardFaces.back);
  const cardFrontText = toFaceText(cardFaces.front, t);
  const cardBackText = toFaceText(cardFaces.back, t);
  // A picture asked about on the front is described without naming the
  // word, which is the answer; one shown as the answer may name it.
  const cardFrontImage = toFaceImage(cardFaces.front, cardFaces.front?.alt || t("learn.pictureToName"));
  const cardBackImage = toFaceImage(
    cardFaces.back,
    cardFaces.back?.alt || (cardFaces.front?.type === CONTENT_TYPES.text ? cardFaces.front.text : ""),
  );
  const cardMetaBadges = useMemo(
    () => buildCardMetaBadges(currentWord, sessionSettings, i18n),
    [currentWord, i18n, sessionSettings],
  );
  const cardBackDetails = useMemo(
    () => buildCardBackDetails(currentWord, sessionSettings),
    [currentWord, sessionSettings],
  );

  const handleOpenDeckCreatePage = useCallback(() => {
    navigate(ROUTE_PATHS.deckCreate);
  }, [navigate]);

  // Adding words from the desk: the dialog writes straight to the deck, and
  // the desk picks the new cards up once it closes, so the card on the table
  // does not change under the user while they type.
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const quickAddDeckIdRef = useRef("");
  const openQuickAdd = useCallback(() => {
    quickAddDeckIdRef.current = "";
    setIsQuickAddOpen(true);
  }, []);
  const handleQuickAddWords = useCallback(({ deck } = {}) => {
    if (deck?.id) {
      quickAddDeckIdRef.current = String(deck.id);
    }
  }, []);
  const closeQuickAdd = useCallback(
    ({ addedTotal = 0 } = {}) => {
      setIsQuickAddOpen(false);
      const touchedDeckId = quickAddDeckIdRef.current;

      if (!touchedDeckId) {
        return;
      }

      if (touchedDeckId !== String(selectedDeckId)) {
        if (addedTotal > 0) {
          handleDeckChange(touchedDeckId);
        }
        return;
      }

      void refreshDeckWords();
      void refreshSession();
    },
    [handleDeckChange, refreshDeckWords, refreshSession, selectedDeckId],
  );
  const handleOpenBrowsePage = useCallback(() => {
    navigate(ROUTE_PATHS.browse);
  }, [navigate]);
  const canStartNewSession = Boolean(
    session?.completionState?.done &&
      session?.completionState?.canStartNewSession &&
      !isExtendedSession,
  );

  const sessionStats = session?.stats || EMPTY_SESSION.stats;
  const sessionReceipt = useMemo(
    () =>
      buildSessionReceipt({
        studied: sessionStats.totalStudiedToday,
        remaining: sessionStats.dueTotal,
        grades: gradesByDeckId[selectedDeckId] || [],
        hasCurrentCard: Boolean(currentWord),
      }),
    [
      currentWord,
      gradesByDeckId,
      selectedDeckId,
      sessionStats.dueTotal,
      sessionStats.totalStudiedToday,
    ],
  );
  const shortcutKeyLabels = useMemo(() => {
    if (!shortcutSettings.showLearnShortcuts) {
      return { flip: "", ratings: {} };
    }

    return {
      flip: resolveLearnFlipKeyLabel(shortcutSettings.learnFlip),
      ratings: resolveLearnRatingKeyLabels(shortcutSettings.learnRating),
    };
  }, [
    shortcutSettings.learnFlip,
    shortcutSettings.learnRating,
    shortcutSettings.showLearnShortcuts,
  ]);

  return {
    deck: isBrowseMode ? deckDetails : session?.deck || null,
    sessionMode: session?.sessionMode || EMPTY_SESSION.sessionMode,
    decks,
    decksError,
    wordsError: isBrowseMode ? deckWordsError : sessionError,
    isDecksLoading,
    hasDecks: decks.length > 0,
    isWordsLoading: isBrowseMode ? isDeckWordsLoading : isSessionLoading,
    isRatingPending,
    selectedDeckId,
    learnViewMode,
    isBrowseMode,
    currentDeck,
    currentWord,
    // Only for the deck it was missed in.
    missedCard: missedCard && missedCard.deckId === selectedDeckId && !isBrowseMode ? missedCard.word : null,
    missedCardDirection: missedCard?.direction || "",
    dismissMissedCard,
    cardFrontLabel,
    cardBackLabel,
    cardFrontText,
    cardBackText,
    cardFrontImage,
    cardBackImage,
    cardMetaBadges,
    cardBackDetails,
    isBackVisible,
    sessionSummary,
    directionSummary,
    sessionSettings,
    exerciseMode: sessionSettings.exerciseMode,
    isSessionSettingsOpen,
    sessionStats,
    sessionReceipt,
    cardMove,
    shortcutKeyLabels,
    sessionLimits: session?.limits || EMPTY_SESSION.limits,
    nextDueAt: session.nextDueAt,
    nextLearningDueAt: session.nextLearningDueAt,
    refreshSession,
    completionMessage: isBrowseMode ? "" : buildCompletionMessage(session, t),
    canStartNewSession: isBrowseMode ? false : canStartNewSession,
    isExtendedSession,
    ratingOptions,
    browseProgressLabel,
    canBrowsePrev,
    canBrowseNext,
    handleDeckSelectChange,
    switchToSrsMode,
    switchToBrowseMode,
    openSessionSettings,
    closeSessionSettings,
    handleDirectionModeChange,
    handleExerciseModeChange,
    handleSessionDailyGoalChange,
    handleSessionAutoFlipDelayChange,
    handleSessionShuffleModeChange,
    handleSessionRepeatWrongCardsChange,
    handleShowExamplesChange,
    handleShowLevelChange,
    handleShowPartOfSpeechChange,
    handleRateCard,
    handleStartNewSession,
    handleBrowsePrev,
    handleBrowseNext,
    toggleBackVisibility,
    openDeckCreatePage: handleOpenDeckCreatePage,
    openBrowsePage: handleOpenBrowsePage,
    isQuickAddOpen,
    openQuickAdd,
    closeQuickAdd,
    handleQuickAddWords,
  };
};
