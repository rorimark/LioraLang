import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { usePlatformService } from "@shared/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { LANGUAGE_OPTIONS } from "@shared/config/languages";
import { buildDeckDetailsRoute, buildDeckEditRoute, ROUTE_PATHS } from "@shared/config/routes";
import { normalizePictureSide, PICTURE_SIDES } from "@shared/core/usecases/cardContent";
import { collectDeckTags } from "@shared/core/usecases/wordSuggest";
import { useI18n } from "@shared/lib/i18n";
import {
  applySavedIds,
  buildSavePayload,
  createDefaultDeckForm,
  createEmptyWordDraft,
  draftToWord,
  LEVEL_OPTIONS,
  matchesWordQuery,
  PART_OF_SPEECH_OPTIONS,
  toDeckForm,
  toEditableWord,
  toWordDraft,
  validateDeckForm,
  validateWordDraft,
} from "./deckEditorModel";

// A deck being made or changed.
//
// A new deck is written once, with "Create deck". From then on every change
// is saved as it happens: a word the moment it is added, changed or
// removed, the deck's settings a moment after typing stops. Saves run one
// at a time, and a change made while one is on its way goes in the next.

const SETTINGS_SAVE_DELAY_MS = 700;
const WORDS_PAGE = 60;

const SAVE_STATE = Object.freeze({
  idle: "idle",
  pending: "pending",
  saving: "saving",
  saved: "saved",
  error: "error",
});

const parseNumericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

// Storage says "already exists" in English; the editor says it in the
// person's language.
const toSaveErrorKey = (error) => {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("already exists")) {
    return "editor.errors.nameTaken";
  }

  return error?.i18nKey || "editor.errors.save";
};

export const useDeckEditorPanel = () => {
  const navigate = useNavigate();
  const deckRepository = usePlatformService("deckRepository");
  const { deckId } = useParams();
  const { appPreferences } = useAppPreferences();
  const { t } = useI18n();
  const numericDeckId = parseNumericId(deckId);
  const isEditMode = Boolean(numericDeckId);
  const deckDefaults = appPreferences.deckDefaults;
  const emptyDraft = useMemo(() => createEmptyWordDraft(deckDefaults), [deckDefaults]);

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState("");
  const [deckForm, setDeckForm] = useState(() => createDefaultDeckForm(deckDefaults));
  const [words, setWords] = useState([]);
  const [addDraft, setAddDraft] = useState(emptyDraft);
  const [addError, setAddError] = useState("");
  const [editingWordId, setEditingWordId] = useState(null);
  const [editDraft, setEditDraft] = useState(emptyDraft);
  const [editError, setEditError] = useState("");
  const [lastDeleted, setLastDeleted] = useState(null);
  const [wordsQuery, setWordsQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(WORDS_PAGE);
  const [saveState, setSaveState] = useState(SAVE_STATE.idle);
  const [saveErrorKey, setSaveErrorKey] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createErrorKey, setCreateErrorKey] = useState("");
  const [isPasteOpen, setIsPasteOpen] = useState(false);

  const formRef = useRef(deckForm);
  const wordsRef = useRef(words);
  const saveTimerRef = useRef(null);
  const saveInFlightRef = useRef(null);
  const saveAgainRef = useRef(false);

  useEffect(() => {
    formRef.current = deckForm;
  }, [deckForm]);

  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  const pictureSide = normalizePictureSide(deckForm.pictureSide);
  const hasTertiary = Boolean(deckForm.tertiaryLanguage.trim());
  // What a suggestion needs to know about the deck: its languages and the
  // tags its words use most.
  const deckTags = useMemo(() => collectDeckTags(words), [words]);
  const suggestDeck = useMemo(() => ({ ...deckForm, tags: deckTags }), [deckForm, deckTags]);

  // ——— Loading ———

  const loadDeck = useCallback(async () => {
    if (!numericDeckId) {
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const [deck, loadedWords] = await Promise.all([
        deckRepository.getDeckById(numericDeckId),
        deckRepository.getDeckWords(numericDeckId),
      ]);

      if (!deck) {
        setLoadError("decks.errors.notFound");
        return;
      }

      const form = toDeckForm(deck);
      const editable = (Array.isArray(loadedWords) ? loadedWords : []).map(toEditableWord);
      formRef.current = form;
      wordsRef.current = editable;
      setDeckForm(form);
      setWords(editable);
      setSaveState(SAVE_STATE.idle);
    } catch (error) {
      console.warn(error);
      setLoadError("editor.errors.load");
    } finally {
      setIsLoading(false);
    }
  }, [deckRepository, numericDeckId]);

  useEffect(() => {
    if (isEditMode) {
      void loadDeck();
    } else {
      setIsLoading(false);
    }
  }, [isEditMode, loadDeck]);

  // ——— Saving (edit mode) ———

  const runSave = useCallback(async () => {
    if (!numericDeckId) {
      return;
    }

    if (saveInFlightRef.current) {
      saveAgainRef.current = true;
      return;
    }

    const form = formRef.current;
    const formErrorKey = validateDeckForm(form);

    if (formErrorKey) {
      setSaveState(SAVE_STATE.error);
      setSaveErrorKey(formErrorKey);
      return;
    }

    setSaveState(SAVE_STATE.saving);
    const payload = buildSavePayload({ deckId: numericDeckId, form, words: wordsRef.current });

    saveInFlightRef.current = deckRepository
      .saveDeck(payload)
      .then((result) => {
        const savedWords = Array.isArray(result?.words) ? result.words : [];
        setWords((current) => applySavedIds(current, savedWords));
        setSaveErrorKey("");
        setSaveState(saveAgainRef.current ? SAVE_STATE.pending : SAVE_STATE.saved);
      })
      .catch((error) => {
        console.warn(error);
        setSaveErrorKey(toSaveErrorKey(error));
        setSaveState(SAVE_STATE.error);
      })
      .finally(() => {
        saveInFlightRef.current = null;

        if (saveAgainRef.current) {
          saveAgainRef.current = false;
          void runSave();
        }
      });

    await saveInFlightRef.current;
  }, [deckRepository, numericDeckId]);

  const scheduleSave = useCallback(
    (delayMs = 0) => {
      if (!numericDeckId) {
        return;
      }

      window.clearTimeout(saveTimerRef.current);
      setSaveState(SAVE_STATE.pending);
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void runSave();
      }, delayMs);
    },
    [numericDeckId, runSave],
  );

  // Whatever is still waiting is written before the editor goes away.
  const flushSave = useCallback(async () => {
    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
      await runSave();
    }

    if (saveInFlightRef.current) {
      await saveInFlightRef.current;
    }
  }, [runSave]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
        void runSave();
      }
    },
    [runSave],
  );

  // ——— Deck settings ———

  const updateForm = useCallback(
    (patch) => {
      setDeckForm((current) => {
        const next = { ...current, ...patch };
        formRef.current = next;
        return next;
      });
      scheduleSave(SETTINGS_SAVE_DELAY_MS);
    },
    [scheduleSave],
  );

  const handleDeckFormChange = useCallback(
    (event) => {
      const { name, value, type, checked } = event.target;
      updateForm({ [name]: type === "checkbox" ? checked : value });
    },
    [updateForm],
  );

  // A side is a language or pictures, and at most one side is pictures.
  // Once words exist the sides are what those words were written for.
  const canChangeSides = words.length === 0;

  const handleSideTypeChange = useCallback(
    (side, isPicture) => {
      if (!canChangeSides) {
        return;
      }

      const current = formRef.current.pictureSide;
      updateForm({ pictureSide: isPicture ? side : current === side ? "" : current });
    },
    [canChangeSides, updateForm],
  );

  const swapSides = useCallback(() => {
    if (!canChangeSides) {
      return;
    }

    const form = formRef.current;
    const swappedSide =
      form.pictureSide === PICTURE_SIDES.source
        ? PICTURE_SIDES.target
        : form.pictureSide === PICTURE_SIDES.target
          ? PICTURE_SIDES.source
          : "";
    updateForm({
      sourceLanguage: form.targetLanguage,
      targetLanguage: form.sourceLanguage,
      pictureSide: swappedSide,
    });
  }, [canChangeSides, updateForm]);

  // ——— Words ———

  const commitWords = useCallback(
    (nextWords) => {
      wordsRef.current = nextWords;
      setWords(nextWords);
      scheduleSave(0);
    },
    [scheduleSave],
  );

  const wordOptions = useMemo(
    () => ({ pictureSide, usesWordLevels: deckForm.usesWordLevels, hasTertiary }),
    [deckForm.usesWordLevels, hasTertiary, pictureSide],
  );

  const handleAddDraftChange = useCallback((event) => {
    const { name, value } = event.target;
    setAddDraft((current) => ({ ...current, [name]: value }));
    setAddError("");
  }, []);

  // A suggestion fills fields of the draft; what it fills is the person's
  // to change like anything they typed.
  const applyAddDraftPatch = useCallback((patch) => {
    setAddDraft((current) => ({ ...current, ...patch }));
    setAddError("");
  }, []);

  const applyEditDraftPatch = useCallback((patch) => {
    setEditDraft((current) => ({ ...current, ...patch }));
    setEditError("");
  }, []);

  const handleAddDraftImageChange = useCallback((image) => {
    setAddDraft((current) => ({ ...current, image }));
    setAddError("");
  }, []);

  // Adds the typed word at the top of the list and keeps the tags, level
  // and part of speech for the next one: words come in runs. What a
  // suggestion filled in belonged to that word and is not kept.
  const submitAddDraft = useCallback((suggestedFields = null) => {
    const errorKey = validateWordDraft(addDraft, pictureSide);

    if (errorKey) {
      setAddError(errorKey);
      return false;
    }

    const word = draftToWord(addDraft, wordOptions);
    commitWords([word, ...wordsRef.current]);
    const keep = (field, current) => (suggestedFields?.has?.(field) ? emptyDraft[field] : current[field]);
    setAddDraft((current) => ({
      ...emptyDraft,
      level: keep("level", current),
      part_of_speech: keep("part_of_speech", current),
      tagsInput: keep("tagsInput", current),
    }));
    setAddError("");
    setLastDeleted(null);
    return true;
  }, [addDraft, commitWords, emptyDraft, pictureSide, wordOptions]);

  const startEditWord = useCallback((word) => {
    setEditingWordId(word.externalId);
    setEditDraft(toWordDraft(word));
    setEditError("");
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingWordId(null);
    setEditError("");
  }, []);

  const handleEditDraftChange = useCallback((event) => {
    const { name, value } = event.target;
    setEditDraft((current) => ({ ...current, [name]: value }));
    setEditError("");
  }, []);

  const handleEditDraftImageChange = useCallback((image) => {
    setEditDraft((current) => ({ ...current, image }));
    setEditError("");
  }, []);

  const submitEditDraft = useCallback(() => {
    const errorKey = validateWordDraft(editDraft, pictureSide);

    if (errorKey) {
      setEditError(errorKey);
      return false;
    }

    commitWords(
      wordsRef.current.map((word) =>
        word.externalId === editingWordId ? draftToWord(editDraft, { ...wordOptions, base: word }) : word,
      ),
    );
    setEditingWordId(null);
    return true;
  }, [commitWords, editDraft, editingWordId, pictureSide, wordOptions]);

  // A removed word can be brought back until the next change. It comes back
  // as the same word, though its study history does not.
  const deleteWord = useCallback(
    (word) => {
      const index = wordsRef.current.findIndex((item) => item.externalId === word.externalId);

      if (index < 0) {
        return;
      }

      commitWords(wordsRef.current.filter((item) => item.externalId !== word.externalId));
      setLastDeleted({ word: { ...word, id: null }, index });

      if (editingWordId === word.externalId) {
        setEditingWordId(null);
      }
    },
    [commitWords, editingWordId],
  );

  const undoDelete = useCallback(() => {
    if (!lastDeleted) {
      return;
    }

    const next = [...wordsRef.current];
    next.splice(Math.min(lastDeleted.index, next.length), 0, lastDeleted.word);
    commitWords(next);
    setLastDeleted(null);
  }, [commitWords, lastDeleted]);

  const filteredWords = useMemo(
    () => words.filter((word) => matchesWordQuery(word, wordsQuery)),
    [words, wordsQuery],
  );
  const visibleWords = useMemo(() => filteredWords.slice(0, visibleCount), [filteredWords, visibleCount]);

  const handleWordsQueryChange = useCallback((event) => {
    setWordsQuery(event.target.value);
    setVisibleCount(WORDS_PAGE);
  }, []);

  const showMoreWords = useCallback(() => setVisibleCount((count) => count + WORDS_PAGE), []);

  // ——— Creating ———

  const createDeck = useCallback(async () => {
    const form = formRef.current;
    const formErrorKey = validateDeckForm(form);

    if (formErrorKey) {
      setCreateErrorKey(formErrorKey);
      return;
    }

    setIsCreating(true);
    setCreateErrorKey("");

    try {
      const result = await deckRepository.saveDeck(buildSavePayload({ form, words: wordsRef.current }));

      if (!result?.deck?.id) {
        throw new Error("save result is invalid");
      }

      navigate(buildDeckEditRoute(result.deck.id), { replace: true });
    } catch (error) {
      console.warn(error);
      setCreateErrorKey(toSaveErrorKey(error));
    } finally {
      setIsCreating(false);
    }
  }, [deckRepository, navigate]);

  // ——— A pasted list ———
  // The list dialog writes to storage itself, so everything waiting here is
  // written first and the words are read back when it closes.

  const openPaste = useCallback(async () => {
    await flushSave();
    setIsPasteOpen(true);
  }, [flushSave]);

  const closePaste = useCallback(async () => {
    setIsPasteOpen(false);

    if (numericDeckId) {
      const loadedWords = await deckRepository.getDeckWords(numericDeckId);
      const editable = (Array.isArray(loadedWords) ? loadedWords : []).map(toEditableWord);
      wordsRef.current = editable;
      setWords(editable);
    }
  }, [deckRepository, numericDeckId]);

  // ——— Leaving ———

  const goToDecks = useCallback(async () => {
    await flushSave();
    navigate(ROUTE_PATHS.decks);
  }, [flushSave, navigate]);

  const goToDeckDetails = useCallback(async () => {
    await flushSave();

    if (numericDeckId) {
      navigate(buildDeckDetailsRoute(numericDeckId));
    }
  }, [flushSave, navigate, numericDeckId]);

  const goToLearn = useCallback(async () => {
    await flushSave();
    navigate(ROUTE_PATHS.learn, { state: { importedDeckId: String(numericDeckId) } });
  }, [flushSave, navigate, numericDeckId]);

  const retrySave = useCallback(() => scheduleSave(0), [scheduleSave]);

  return {
    isEditMode,
    isLoading,
    loadError: loadError ? t(loadError) : "",
    reloadDeck: loadDeck,
    deckId: numericDeckId,

    deckForm,
    suggestDeck,
    pictureSide,
    hasTertiary,
    canChangeSides,
    languageOptions: LANGUAGE_OPTIONS,
    levelOptions: LEVEL_OPTIONS,
    partOfSpeechOptions: PART_OF_SPEECH_OPTIONS,
    handleDeckFormChange,
    handleSideTypeChange,
    swapSides,

    words,
    totalWords: words.length,
    filteredCount: filteredWords.length,
    visibleWords,
    hasMoreWords: filteredWords.length > visibleWords.length,
    showMoreWords,
    wordsQuery,
    handleWordsQueryChange,

    addDraft,
    addDraftDefaults: emptyDraft,
    addError: addError ? t(addError) : "",
    handleAddDraftChange,
    applyAddDraftPatch,
    handleAddDraftImageChange,
    submitAddDraft,

    editingWordId,
    editDraft,
    editError: editError ? t(editError) : "",
    startEditWord,
    cancelEdit,
    handleEditDraftChange,
    handleEditDraftImageChange,
    applyEditDraftPatch,
    submitEditDraft,

    deleteWord,
    lastDeleted,
    undoDelete,

    saveState,
    saveError: saveErrorKey ? t(saveErrorKey) : "",
    retrySave,

    createDeck,
    isCreating,
    createError: createErrorKey ? t(createErrorKey) : "",

    isPasteOpen,
    openPaste,
    closePaste,

    goToDecks,
    goToDeckDetails,
    goToLearn,
  };
};
