import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { usePlatformService } from "@app/providers";
import { useDecks } from "@entities/deck";
import { ROUTE_PATHS } from "@shared/config/routes";
import { useAppPreferences } from "@shared/lib/appPreferences";
import {
  LEARN_FLIP_SHORTCUT_MODES,
  LEARN_RATING_SHORTCUT_MODES,
  useShortcutSettings,
} from "@shared/lib/shortcutSettings";
import {
  DEFAULT_LEARN_PROGRESS,
  areLearnProgressEqual,
  createLearnProgressSettingsPatch,
  readLearnProgressFromSettings,
} from "./learnProgressStorage";

const EMPTY_SESSION = {
  deck: null,
  sessionMode: "default",
  card: null,
  stats: {
    totalCards: 0,
    dueLearning: 0,
    dueReview: 0,
    dueNew: 0,
    dueTotal: 0,
    reviewedToday: 0,
    newStudiedToday: 0,
    totalStudiedToday: 0,
  },
  limits: {
    newCardsPerDay: 20,
    maxReviewsPerDay: 100,
    newLeft: 20,
    reviewLeft: 100,
    isBypassed: false,
  },
  completionState: {
    done: false,
    reason: "",
    canStartNewSession: false,
  },
};

const RATING_OPTIONS = [
  { key: "again", label: "Again", tone: "danger" },
  { key: "hard", label: "Hard", tone: "warning" },
  { key: "good", label: "Good", tone: "neutral" },
  { key: "easy", label: "Easy", tone: "success" },
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

const buildCardFrontText = (word) => word?.source || "-";

const buildCardBackText = (word) => {
  const values = [word?.target, word?.tertiary].filter(Boolean);

  if (values.length === 0) {
    return "No translation";
  }

  return values.join(" • ");
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

const buildCompletionMessage = (session) => {
  if (!session?.completionState?.done) {
    return "";
  }

  if (session?.completionState?.reason === "daily-limit") {
    const dailyGoal = Number(session?.limits?.dailyGoal);
    const dailyLeft = Number(session?.limits?.dailyLeft);

    if (Number.isInteger(dailyLeft) && dailyLeft <= 0 && Number.isInteger(dailyGoal) && dailyGoal > 0) {
      return `Daily goal reached (${dailyGoal} cards). Continue tomorrow or start an extra session.`;
    }

    return "Today's review limits were reached. Continue tomorrow or start an extra session.";
  }

  if (session?.completionState?.reason === "empty-deck") {
    return "This deck has no cards yet.";
  }

  return "All due cards are done for now.";
};

export const useLearnFlashcardsPanel = () => {
  const navigate = useNavigate();
  const srsRepository = usePlatformService("srsRepository");
  const settingsRepository = usePlatformService("settingsRepository");
  const { decks, isLoading: isDecksLoading, error: decksError } = useDecks();
  const { appPreferences } = useAppPreferences();
  const { shortcutSettings } = useShortcutSettings();
  const [learnProgress, setLearnProgress] = useState(DEFAULT_LEARN_PROGRESS);
  const [isLearnProgressReady, setIsLearnProgressReady] = useState(false);
  const [extendedSessionByDeckId, setExtendedSessionByDeckId] = useState({});
  const [session, setSession] = useState(EMPTY_SESSION);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [isRatingPending, setIsRatingPending] = useState(false);
  const loadSessionRequestRef = useRef(0);
  const shuffleSeedByDeckRef = useRef({});

  useEffect(() => {
    let cancelled = false;

    settingsRepository
      .getAppSettings()
      .then((settings) => {
        if (cancelled) {
          return;
        }

        const nextProgress = readLearnProgressFromSettings(settings);

        setLearnProgress((prevState) =>
          areLearnProgressEqual(prevState, nextProgress)
            ? prevState
            : nextProgress,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setLearnProgress(DEFAULT_LEARN_PROGRESS);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLearnProgressReady(true);
        }
      });

    const unsubscribe = settingsRepository.subscribeAppSettingsUpdated((nextSettings) => {
      const nextProgress = readLearnProgressFromSettings(nextSettings);

      setLearnProgress((prevState) =>
        areLearnProgressEqual(prevState, nextProgress)
          ? prevState
          : nextProgress,
      );
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [settingsRepository]);

  const spacedRepetitionSettings = appPreferences.spacedRepetition;
  const studySessionSettings = appPreferences.studySession;
  const shuffleMode = studySessionSettings?.shuffleMode || SHUFFLE_MODE_OFF;
  const autoFlipDelayMs =
    AUTO_FLIP_DELAY_TO_MS[studySessionSettings.autoFlipDelay] || 0;

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
  const isExtendedSession = useMemo(
    () => Boolean(extendedSessionByDeckId[selectedDeckId]),
    [extendedSessionByDeckId, selectedDeckId],
  );

  const setProgressCardWordId = useCallback((deckId, wordId) => {
    const numericWordId = Number(wordId);

    setLearnProgress((prevState) => {
      const nextMap = {
        ...prevState.lastCardWordIdByDeck,
      };

      if (Number.isInteger(numericWordId) && numericWordId > 0) {
        nextMap[deckId] = numericWordId;
      } else {
        delete nextMap[deckId];
      }

      return {
        ...prevState,
        lastCardWordIdByDeck: nextMap,
      };
    });
  }, []);

  useEffect(() => {
    if (shuffleMode !== SHUFFLE_MODE_PER_SESSION) {
      shuffleSeedByDeckRef.current = {};
    }
  }, [shuffleMode]);

  const resolveShuffleSeed = useCallback(
    (deckId, options = {}) => {
      if (shuffleMode !== SHUFFLE_MODE_PER_SESSION) {
        return null;
      }

      const normalizedDeckId = String(deckId || "");

      if (!normalizedDeckId) {
        return null;
      }

      const shouldRenew = Boolean(options?.renew);

      if (
        shouldRenew ||
        !Number.isInteger(shuffleSeedByDeckRef.current[normalizedDeckId])
      ) {
        shuffleSeedByDeckRef.current[normalizedDeckId] = createShuffleSeed();
      }

      return shuffleSeedByDeckRef.current[normalizedDeckId];
    },
    [shuffleMode],
  );

  const loadSession = useCallback(
    async (deckId, options = {}) => {
      const normalizedDeckId = String(deckId || "");
      const forceAllCards =
        typeof options?.forceAllCards === "boolean"
          ? options.forceAllCards
          : Boolean(extendedSessionByDeckId[normalizedDeckId]);
      const shuffleSeed =
        Number.isInteger(options?.shuffleSeed) && options.shuffleSeed > 0
          ? options.shuffleSeed
          : resolveShuffleSeed(normalizedDeckId);

      if (!normalizedDeckId) {
        setSession(EMPTY_SESSION);
        setSessionError("");
        setIsSessionLoading(false);
        return;
      }

      const requestId = loadSessionRequestRef.current + 1;
      loadSessionRequestRef.current = requestId;
      setIsSessionLoading(true);
      setSessionError("");

      try {
        const nextSession = await srsRepository.getSrsSession(
          normalizedDeckId,
          {
            spacedRepetition: spacedRepetitionSettings,
            studySession: {
              dailyGoal: studySessionSettings?.dailyGoal,
              repeatWrongCards: studySessionSettings?.repeatWrongCards,
              shuffleMode,
              shuffleSeed,
            },
          },
          {
            forceAllCards,
          },
        );

        if (loadSessionRequestRef.current !== requestId) {
          return;
        }

        setSession(nextSession || EMPTY_SESSION);
        setProgressCardWordId(normalizedDeckId, nextSession?.card?.wordId);
      } catch (error) {
        if (loadSessionRequestRef.current !== requestId) {
          return;
        }

        setSession(EMPTY_SESSION);
        setSessionError(error?.message || "Failed to load SRS session");
      } finally {
        if (loadSessionRequestRef.current === requestId) {
          setIsSessionLoading(false);
        }
      }
    },
    [
      extendedSessionByDeckId,
      resolveShuffleSeed,
      setProgressCardWordId,
      shuffleMode,
      srsRepository,
      spacedRepetitionSettings,
      studySessionSettings,
    ],
  );

  useEffect(() => {
    if (!selectedDeckId) {
      return;
    }

    setLearnProgress((prevState) => {
      if (prevState.selectedDeckId === selectedDeckId) {
        return prevState;
      }

      return {
        ...prevState,
        selectedDeckId,
        isBackVisible: false,
      };
    });
  }, [selectedDeckId]);

  useEffect(() => {
    void loadSession(selectedDeckId);
  }, [loadSession, selectedDeckId]);

  useEffect(() => {
    if (!isLearnProgressReady) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void settingsRepository
        .updateAppSettings(createLearnProgressSettingsPatch(learnProgress))
        .catch(() => {});
    }, 140);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLearnProgressReady, learnProgress, settingsRepository]);

  const currentWord = session?.card || null;
  const isBackVisible = learnProgress.isBackVisible;

  useEffect(() => {
    if (!currentWord || isBackVisible || autoFlipDelayMs <= 0) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setLearnProgress((prevState) => ({
        ...prevState,
        isBackVisible: true,
      }));
    }, autoFlipDelayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [autoFlipDelayMs, currentWord, isBackVisible]);

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

  const toggleBackVisibility = useCallback(() => {
    if (!currentWord || isRatingPending) {
      return;
    }

    setLearnProgress((prevState) => ({
      ...prevState,
      isBackVisible: !prevState.isBackVisible,
    }));
  }, [currentWord, isRatingPending]);

  const handleRateCard = useCallback(
    async (rating) => {
      if (!selectedDeckId || !currentWord || isRatingPending) {
        return;
      }

      setIsRatingPending(true);
      setSessionError("");

      try {
        const nextSession = await srsRepository.gradeSrsCard({
          deckId: selectedDeckId,
          wordId: currentWord.wordId,
          rating,
          settings: {
            spacedRepetition: spacedRepetitionSettings,
            studySession: {
              dailyGoal: studySessionSettings?.dailyGoal,
              repeatWrongCards: studySessionSettings?.repeatWrongCards,
              shuffleMode,
              shuffleSeed: resolveShuffleSeed(selectedDeckId),
            },
          },
          forceAllCards: isExtendedSession,
        });

        setSession(nextSession || EMPTY_SESSION);
        setLearnProgress((prevState) => ({
          ...prevState,
          isBackVisible: false,
        }));
        setProgressCardWordId(selectedDeckId, nextSession?.card?.wordId);
      } catch (error) {
        setSessionError(error?.message || "Failed to grade card");
      } finally {
        setIsRatingPending(false);
      }
    },
    [
      currentWord,
      isRatingPending,
      selectedDeckId,
      setProgressCardWordId,
      spacedRepetitionSettings,
      studySessionSettings,
      shuffleMode,
      resolveShuffleSeed,
      srsRepository,
      isExtendedSession,
    ],
  );

  const handleStartNewSession = useCallback(() => {
    if (!selectedDeckId) {
      return;
    }

    setExtendedSessionByDeckId((prevValue) => ({
      ...prevValue,
      [selectedDeckId]: true,
    }));
    setLearnProgress((prevState) => ({
      ...prevState,
      isBackVisible: false,
    }));
    const renewedShuffleSeed = resolveShuffleSeed(selectedDeckId, { renew: true });
    void loadSession(selectedDeckId, {
      forceAllCards: true,
      shuffleSeed: renewedShuffleSeed,
    });
  }, [loadSession, resolveShuffleSeed, selectedDeckId]);

  const keyboardHandlersRef = useRef({
    canFlip: false,
    canRate: false,
    handleFlip: () => {},
    handleRate: () => {},
    flipShortcutMode: LEARN_FLIP_SHORTCUT_MODES.space,
    ratingShortcutMode: LEARN_RATING_SHORTCUT_MODES.digits,
  });

  useEffect(() => {
    keyboardHandlersRef.current.canFlip = Boolean(currentWord) && !isRatingPending;
    keyboardHandlersRef.current.canRate =
      Boolean(currentWord) && learnProgress.isBackVisible && !isRatingPending;
    keyboardHandlersRef.current.handleFlip = toggleBackVisibility;
    keyboardHandlersRef.current.handleRate = handleRateCard;
    keyboardHandlersRef.current.flipShortcutMode = shortcutSettings.learnFlip;
    keyboardHandlersRef.current.ratingShortcutMode =
      shortcutSettings.learnRating;
  }, [
    currentWord,
    handleRateCard,
    isRatingPending,
    learnProgress.isBackVisible,
    shortcutSettings.learnFlip,
    shortcutSettings.learnRating,
    toggleBackVisibility,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleWindowKeyDown = (event) => {
      if (isInteractiveEventTarget(event.target)) {
        return;
      }

      const {
        canFlip,
        canRate,
        handleFlip,
        handleRate,
        flipShortcutMode,
        ratingShortcutMode,
      } = keyboardHandlersRef.current;

      if (canFlip && matchesFlipShortcut(event, flipShortcutMode)) {
        event.preventDefault();
        handleFlip();
        return;
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
    const preview = currentWord?.ratingPreview || {};

    return RATING_OPTIONS.map((option) => ({
      ...option,
      value: preview[option.key] || "-",
    }));
  }, [currentWord]);
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
  const handleRefreshSession = useCallback(() => {
    void loadSession(selectedDeckId);
  }, [loadSession, selectedDeckId]);
  const handleOpenDeckCreatePage = useCallback(() => {
    navigate(ROUTE_PATHS.deckCreate);
  }, [navigate]);
  const handleOpenBrowsePage = useCallback(() => {
    navigate(ROUTE_PATHS.browse);
  }, [navigate]);
  const canStartNewSession = Boolean(
    session?.completionState?.done &&
      session?.completionState?.canStartNewSession &&
      !isExtendedSession,
  );

  return {
    deck: session?.deck || null,
    sessionMode: session?.sessionMode || EMPTY_SESSION.sessionMode,
    decks,
    decksError,
    wordsError: sessionError,
    isDecksLoading,
    hasDecks: decks.length > 0,
    isWordsLoading: isSessionLoading,
    isRatingPending,
    selectedDeckId,
    currentWord,
    cardFrontText,
    cardBackText,
    cardMetaBadges,
    isBackVisible,
    sessionStats: session?.stats || EMPTY_SESSION.stats,
    sessionLimits: session?.limits || EMPTY_SESSION.limits,
    completionMessage: buildCompletionMessage(session),
    canStartNewSession,
    isExtendedSession,
    ratingOptions,
    handleDeckSelectChange,
    handleRateCard,
    handleStartNewSession,
    toggleBackVisibility,
    refreshSession: handleRefreshSession,
    openDeckCreatePage: handleOpenDeckCreatePage,
    openBrowsePage: handleOpenBrowsePage,
  };
};
