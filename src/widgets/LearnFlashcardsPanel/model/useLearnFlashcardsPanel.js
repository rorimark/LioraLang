import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useDecks, useDeckWords } from "@entities/deck";
import { ROUTE_PATHS } from "@shared/config/routes";
import { useAppPreferences } from "@shared/lib/appPreferences";
import {
  LEARN_FLIP_SHORTCUT_MODES,
  LEARN_RATING_SHORTCUT_MODES,
  useShortcutSettings,
} from "@shared/lib/shortcutSettings";
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
  resolveEffectiveDirectionMode,
  writeLearnSessionSettingsToStorage,
} from "./learnSessionSettings";
import {
  LEARN_VIEW_MODE_BROWSE,
  LEARN_VIEW_MODE_SRS,
  resolveLoopedBrowseIndex,
  resolvePreferredLearnViewMode,
} from "./learnViewMode";

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

const LEARN_SESSION_CACHE = {
  sessionsByDeckId: {},
  extendedSessionByDeckId: {},
  shuffleSeedsByDeckId: {},
};
const LEARN_SESSION_STORAGE_KEY = "learnSessionCache";
let isSessionCacheHydrated = false;

const buildSessionCacheKey = (deckId, signature) => {
  const normalizedDeckId = String(deckId || "").trim();

  if (!normalizedDeckId) {
    return "";
  }

  return `${normalizedDeckId}::${JSON.stringify(signature || {})}`;
};

const buildSessionCacheSignature = ({
  forceAllCards = false,
  shuffleMode = SHUFFLE_MODE_OFF,
  shuffleSeed = null,
  spacedRepetitionSettings = {},
  studySessionSettings = {},
} = {}) => {
  return {
    forceAllCards: Boolean(forceAllCards),
    shuffleMode,
    shuffleSeed: Number.isInteger(shuffleSeed) ? shuffleSeed : null,
    spacedRepetition: {
      newCardsPerDay: Number(spacedRepetitionSettings?.newCardsPerDay) || 0,
      maxReviewsPerDay: Number(spacedRepetitionSettings?.maxReviewsPerDay) || 0,
      learningSteps: String(spacedRepetitionSettings?.learningSteps || ""),
      easyBonus: Number(spacedRepetitionSettings?.easyBonus) || 0,
      lapsePenalty: Number(spacedRepetitionSettings?.lapsePenalty) || 0,
    },
    studySession: {
      dailyGoal: Number(studySessionSettings?.dailyGoal) || 0,
      repeatWrongCards: Boolean(studySessionSettings?.repeatWrongCards),
    },
  };
};

const hydrateSessionCacheFromStorage = () => {
  if (isSessionCacheHydrated || typeof window === "undefined") {
    return;
  }

  isSessionCacheHydrated = true;

  try {
    const raw = window.sessionStorage.getItem(LEARN_SESSION_STORAGE_KEY);
    if (!raw) {
      return;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return;
    }

    if (parsed.sessionsByDeckId && typeof parsed.sessionsByDeckId === "object") {
      LEARN_SESSION_CACHE.sessionsByDeckId = parsed.sessionsByDeckId;
    }
  } catch {
    // ignore invalid cache
  }
};

const persistSessionCache = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      LEARN_SESSION_STORAGE_KEY,
      JSON.stringify({ sessionsByDeckId: LEARN_SESSION_CACHE.sessionsByDeckId }),
    );
  } catch {
    // ignore storage failures
  }
};

const buildDirectionSummary = (
  directionMode = LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
  deck = {},
) => {
  const sourceLanguage = String(deck?.sourceLanguage || "Source").trim() || "Source";
  const targetLanguages = [
    deck?.targetLanguage,
    deck?.tertiaryLanguage,
  ]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean);
  const targetLabel = targetLanguages.length > 0 ? targetLanguages.join(" + ") : "Target";

  if (directionMode === LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE) {
    return `${targetLabel} → ${sourceLanguage}`;
  }

  if (directionMode === LEARN_SESSION_DIRECTION_MIXED) {
    return `${sourceLanguage} ↔ ${targetLabel}`;
  }

  return `${sourceLanguage} → ${targetLabel}`;
};

const buildCardFrontText = (
  word,
  directionMode = LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
) => {
  const resolvedDirectionMode = resolveEffectiveDirectionMode(directionMode, word);

  if (resolvedDirectionMode === LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE) {
    const reverseValues = [word?.target, word?.tertiary].filter(Boolean);
    return reverseValues.length > 0 ? reverseValues.join(" • ") : "-";
  }

  return word?.source || "-";
};

const buildCardBackText = (
  word,
  directionMode = LEARN_SESSION_DIRECTION_SOURCE_TO_TARGET,
) => {
  const resolvedDirectionMode = resolveEffectiveDirectionMode(directionMode, word);

  if (resolvedDirectionMode === LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE) {
    return word?.source || "-";
  }

  const values = [word?.target, word?.tertiary].filter(Boolean);

  if (values.length === 0) {
    return "No translation";
  }

  return values.join(" • ");
};

const buildCardMetaBadges = (word, sessionSettings = {}) => {
  if (!word) {
    return [];
  }

  const badges = [];

  if (sessionSettings.showLevel && word.level) {
    badges.push({ key: "level", text: `Level ${word.level}`, accent: false });
  }

  if (sessionSettings.showPartOfSpeech && word.part_of_speech) {
    badges.push({
      key: "partOfSpeech",
      text: word.part_of_speech,
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
  const location = useLocation();
  const srsRepository = usePlatformService("srsRepository");
  const { decks, isLoading: isDecksLoading, error: decksError } = useDecks();
  const { appPreferences, updateAppPreferences } = useAppPreferences();
  const { shortcutSettings } = useShortcutSettings();
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
  const [hasPersistedViewMode, setHasPersistedViewMode] = useState(() =>
    hasStoredLearnProgressViewMode(),
  );
  const [sessionSettings, setSessionSettings] = useState(() =>
    readLearnSessionSettingsFromStorage(appPreferences),
  );
  const [isSessionSettingsOpen, setIsSessionSettingsOpen] = useState(false);
  const [extendedSessionByDeckId, setExtendedSessionByDeckId] = useState(
    () => LEARN_SESSION_CACHE.extendedSessionByDeckId || {},
  );
  const [session, setSession] = useState(EMPTY_SESSION);
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [isRatingPending, setIsRatingPending] = useState(false);
  const loadSessionRequestRef = useRef(0);
  const shuffleSeedByDeckRef = useRef(
    LEARN_SESSION_CACHE.shuffleSeedsByDeckId || {},
  );

  const spacedRepetitionSettings = appPreferences.spacedRepetition;
  const shuffleMode = sessionSettings.shuffleMode || SHUFFLE_MODE_OFF;
  const autoFlipDelayMs =
    AUTO_FLIP_DELAY_TO_MS[sessionSettings.autoFlipDelay] || 0;
  const learnViewMode =
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
  } = useDeckWords(selectedDeckId);

  const isExtendedSession = useMemo(
    () => Boolean(extendedSessionByDeckId[selectedDeckId]),
    [extendedSessionByDeckId, selectedDeckId],
  );
  const currentDeck = isBrowseMode ? deckDetails : session?.deck || deckDetails || null;
  const directionSummary = useMemo(
    () => buildDirectionSummary(sessionSettings.directionMode, currentDeck),
    [currentDeck, sessionSettings.directionMode],
  );
  const sessionSummary = useMemo(() => {
    const engineLabel = isBrowseMode ? "Review" : "SRS";
    return `${engineLabel} · Flashcards · ${directionSummary}`;
  }, [directionSummary, isBrowseMode]);

  const setSrsProgressCardWordId = useCallback((deckId, wordId) => {
    const normalizedWordId =
      typeof wordId === "string"
        ? wordId.trim()
        : typeof wordId === "number" && Number.isFinite(wordId) && wordId > 0
          ? String(wordId)
          : "";

    setLearnProgress((prevState) => {
      const nextMap = {
        ...prevState.lastSrsCardWordIdByDeck,
      };

      if (normalizedWordId) {
        nextMap[deckId] = normalizedWordId;
      } else {
        delete nextMap[deckId];
      }

      return {
        ...prevState,
        lastSrsCardWordIdByDeck: nextMap,
      };
    });
  }, []);

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
    if (hasPersistedViewMode) {
      return;
    }

    setLearnProgress((prevState) => {
      if (prevState.viewMode === preferredLearnViewMode) {
        return prevState;
      }

      return {
        ...prevState,
        viewMode: preferredLearnViewMode,
        isBackVisible: false,
      };
    });
  }, [hasPersistedViewMode, preferredLearnViewMode]);

  useEffect(() => {
    setSessionSettings((prevState) => {
      const nextState = normalizeLearnSessionSettings(
        pickLocalOnlyLearnSessionSettings(prevState),
        appPreferences,
      );

      return JSON.stringify(prevState) === JSON.stringify(nextState)
        ? prevState
        : nextState;
    });
  }, [appPreferences]);

  useEffect(() => {
    if (!isBrowseMode || !selectedDeckId) {
      return;
    }

    if (isDeckWordsLoading) {
      return;
    }

    if (deckWords.length === 0) {
      return;
    }

    if (!browseWord) {
      setBrowseProgressCardWordId(selectedDeckId, deckWords[0].id);
    }
  }, [
    browseWord,
    deckWords,
    isDeckWordsLoading,
    isBrowseMode,
    selectedDeckId,
    setBrowseProgressCardWordId,
  ]);

  useEffect(() => {
    if (shuffleMode !== SHUFFLE_MODE_PER_SESSION) {
      shuffleSeedByDeckRef.current = {};
      LEARN_SESSION_CACHE.shuffleSeedsByDeckId = {};
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
        LEARN_SESSION_CACHE.shuffleSeedsByDeckId = {
          ...shuffleSeedByDeckRef.current,
        };
      }

      return shuffleSeedByDeckRef.current[normalizedDeckId];
    },
    [shuffleMode],
  );

  const restoreCachedSession = useCallback(
    (sessionCacheKey) => {
      if (!sessionCacheKey) {
        return false;
      }

      hydrateSessionCacheFromStorage();
      const cached = LEARN_SESSION_CACHE.sessionsByDeckId[sessionCacheKey];

      if (!cached || !cached.session) {
        return false;
      }

      setSession(cached.session);
      setSessionError(cached.sessionError || "");
      setIsSessionLoading(false);
      setSrsProgressCardWordId(
        cached.deckId || String(cached.session?.deck?.id || ""),
        cached.session?.card?.wordId,
      );
      return true;
    },
    [setSrsProgressCardWordId],
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
      const preferCache =
        typeof options?.preferCache === "boolean" ? options.preferCache : true;
      const sessionCacheKey = buildSessionCacheKey(
        normalizedDeckId,
        buildSessionCacheSignature({
          forceAllCards,
          shuffleMode,
          shuffleSeed,
          spacedRepetitionSettings,
          studySessionSettings: sessionSettings,
        }),
      );

      if (!normalizedDeckId) {
        setSession(EMPTY_SESSION);
        setSessionError("");
        setIsSessionLoading(false);
        return;
      }

      if (preferCache && restoreCachedSession(sessionCacheKey)) {
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
              dailyGoal: sessionSettings.dailyGoal,
              repeatWrongCards: sessionSettings.repeatWrongCards,
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
        setSrsProgressCardWordId(normalizedDeckId, nextSession?.card?.wordId);
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
      restoreCachedSession,
      resolveShuffleSeed,
      setSrsProgressCardWordId,
      shuffleMode,
      srsRepository,
      spacedRepetitionSettings,
      sessionSettings,
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
    const routeState =
      location.state && typeof location.state === "object" ? location.state : null;
    const importedDeckId =
      typeof routeState?.importedDeckId === "string" || typeof routeState?.importedDeckId === "number"
        ? String(routeState.importedDeckId).trim()
        : "";

    if (!importedDeckId) {
      return;
    }

    setLearnProgress((prevState) => ({
      ...prevState,
      selectedDeckId: importedDeckId,
      isBackVisible: false,
    }));

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
    if (isBrowseMode) {
      return;
    }

    void loadSession(selectedDeckId, { preferCache: true });
  }, [isBrowseMode, loadSession, selectedDeckId]);


  useEffect(() => {
    writeLearnProgressToSession(learnProgress);
  }, [learnProgress]);

  useEffect(() => {
    writeBrowseProgressToStorage(learnProgress.lastBrowseWordIdByDeck);
  }, [learnProgress.lastBrowseWordIdByDeck]);

  useEffect(() => {
    writeLearnSessionSettingsToStorage(sessionSettings, appPreferences);
  }, [appPreferences, sessionSettings]);

  const srsCard = session?.card || null;
  const currentWord = isBrowseMode ? browseWord : srsCard;
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
      isBackVisible: !prevState.isBackVisible,
    }));
  }, [currentWord, isRatingPending]);

  const handleRateCard = useCallback(
    async (rating) => {
      if (isBrowseMode || !selectedDeckId || !currentWord || isRatingPending) {
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
              dailyGoal: sessionSettings.dailyGoal,
              repeatWrongCards: sessionSettings.repeatWrongCards,
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
        setSrsProgressCardWordId(selectedDeckId, nextSession?.card?.wordId);
      } catch (error) {
        setSessionError(error?.message || "Failed to grade card");
      } finally {
        setIsRatingPending(false);
      }
    },
    [
      currentWord,
      isBrowseMode,
      isRatingPending,
      selectedDeckId,
      setSrsProgressCardWordId,
      spacedRepetitionSettings,
      sessionSettings,
      shuffleMode,
      resolveShuffleSeed,
      srsRepository,
      isExtendedSession,
    ],
  );

  const handleStartNewSession = useCallback(() => {
    if (!selectedDeckId || isBrowseMode) {
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
      preferCache: false,
    });
  }, [isBrowseMode, loadSession, resolveShuffleSeed, selectedDeckId]);

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

    setBrowseProgressCardWordId(selectedDeckId, nextWord.id);
    setLearnProgress((prevState) => ({
      ...prevState,
      isBackVisible: false,
    }));
  }, [
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

    setBrowseProgressCardWordId(selectedDeckId, nextWord.id);
    setLearnProgress((prevState) => ({
      ...prevState,
      isBackVisible: false,
    }));
  }, [
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
      learnProgress.isBackVisible &&
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
      value: preview[option.key] || "-",
    }));
  }, [currentWord, isBrowseMode]);
  const resolvedDirectionMode = useMemo(
    () => resolveEffectiveDirectionMode(sessionSettings.directionMode, currentWord),
    [currentWord, sessionSettings.directionMode],
  );
  const cardFrontLabel = useMemo(() => {
    if (resolvedDirectionMode === LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE) {
      const labels = [currentDeck?.targetLanguage, currentDeck?.tertiaryLanguage]
        .filter(Boolean)
        .join(" + ");

      return labels || "Target";
    }

    return currentDeck?.sourceLanguage || "Source";
  }, [currentDeck?.sourceLanguage, currentDeck?.targetLanguage, currentDeck?.tertiaryLanguage, resolvedDirectionMode]);
  const cardBackLabel = useMemo(() => {
    if (resolvedDirectionMode === LEARN_SESSION_DIRECTION_TARGET_TO_SOURCE) {
      return currentDeck?.sourceLanguage || "Source";
    }

    const labels = [currentDeck?.targetLanguage, currentDeck?.tertiaryLanguage]
      .filter(Boolean)
      .join(" + ");

    return labels || "Target";
  }, [currentDeck?.sourceLanguage, currentDeck?.targetLanguage, currentDeck?.tertiaryLanguage, resolvedDirectionMode]);
  const cardFrontText = useMemo(
    () => buildCardFrontText(currentWord, sessionSettings.directionMode),
    [currentWord, sessionSettings.directionMode],
  );
  const cardBackText = useMemo(
    () => buildCardBackText(currentWord, sessionSettings.directionMode),
    [currentWord, sessionSettings.directionMode],
  );
  const cardMetaBadges = useMemo(
    () => buildCardMetaBadges(currentWord, sessionSettings),
    [currentWord, sessionSettings],
  );
  const cardBackDetails = useMemo(
    () => buildCardBackDetails(currentWord, sessionSettings),
    [currentWord, sessionSettings],
  );

  useEffect(() => {
    if (!selectedDeckId) {
      return;
    }

    if (!session?.deck && !sessionError) {
      return;
    }

    const sessionCacheKey = buildSessionCacheKey(
      selectedDeckId,
      buildSessionCacheSignature({
        forceAllCards: isExtendedSession,
        shuffleMode,
        shuffleSeed: shuffleSeedByDeckRef.current[selectedDeckId],
        spacedRepetitionSettings,
        studySessionSettings: sessionSettings,
      }),
    );

    if (!sessionCacheKey) {
      return;
    }

    LEARN_SESSION_CACHE.sessionsByDeckId[sessionCacheKey] = {
      deckId: selectedDeckId,
      session,
      sessionError,
      updatedAtMs: Date.now(),
    };
    persistSessionCache();
  }, [
    isExtendedSession,
    selectedDeckId,
    session,
    sessionError,
    sessionSettings,
    shuffleMode,
    spacedRepetitionSettings,
  ]);

  useEffect(() => {
    LEARN_SESSION_CACHE.extendedSessionByDeckId = {
      ...extendedSessionByDeckId,
    };
  }, [extendedSessionByDeckId]);
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
    cardFrontLabel,
    cardBackLabel,
    cardFrontText,
    cardBackText,
    cardMetaBadges,
    cardBackDetails,
    isBackVisible,
    sessionSummary,
    directionSummary,
    sessionSettings,
    exerciseMode: sessionSettings.exerciseMode,
    isSessionSettingsOpen,
    sessionStats: session?.stats || EMPTY_SESSION.stats,
    sessionLimits: session?.limits || EMPTY_SESSION.limits,
    completionMessage: isBrowseMode ? "" : buildCompletionMessage(session),
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
  };
};
