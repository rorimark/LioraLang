import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { desktopApi } from "@shared/api";
import { ROUTE_PATHS } from "@shared/config/routes";

const LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const PART_OF_SPEECH_OPTIONS = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "phrase",
  "other",
];
const LANGUAGE_OPTIONS = [
  "English",
  "Ukrainian",
  "Russian",
  "Polish",
  "German",
  "Spanish",
  "French",
  "Italian",
  "Portuguese",
  "Turkish",
  "Czech",
  "Japanese",
];
const WORDS_PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_WORDS_PAGE_SIZE = WORDS_PAGE_SIZE_OPTIONS[0];
const MAX_TOTAL_TAGS = 10;

const createDefaultDeckForm = () => ({
  name: "",
  description: "",
  sourceLanguage: "English",
  targetLanguage: "Ukrainian",
  tertiaryLanguage: "",
  tagsInput: "",
});

const createDefaultWordDraft = () => ({
  eng: "",
  ru: "",
  pl: "",
  level: "A1",
  part_of_speech: "noun",
  example: "",
});

const toEditableWord = (word, fallbackIndex) => ({
  id: word?.id ?? `tmp-${fallbackIndex}`,
  externalId: word?.externalId ?? "",
  eng: word?.eng ?? "",
  ru: word?.ru ?? "",
  pl: word?.pl ?? "",
  level: word?.level || "A1",
  part_of_speech: word?.part_of_speech || "other",
  example: Array.isArray(word?.examples) ? word.examples[0] || "" : "",
});

const toWordDraft = (word) => ({
  eng: word?.eng ?? "",
  ru: word?.ru ?? "",
  pl: word?.pl ?? "",
  level: word?.level || "A1",
  part_of_speech: word?.part_of_speech || "noun",
  example: word?.example ?? "",
});

const parseNumericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseTagsJson = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item) => typeof item === "string" && item.trim())
      .map((item) => item.trim());
  } catch {
    return [];
  }
};

const parseTagsInput = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  return [...new Set(
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  )];
};

export const useDeckEditorPanel = () => {
  const navigate = useNavigate();
  const { deckId } = useParams();
  const numericDeckId = parseNumericId(deckId);
  const isEditMode = Boolean(numericDeckId);
  const nextTempIdRef = useRef(1);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState("info");
  const [deckForm, setDeckForm] = useState(() => createDefaultDeckForm());
  const [words, setWords] = useState([]);
  const [wordsPage, setWordsPage] = useState(1);
  const [wordsPageSize, setWordsPageSize] = useState(DEFAULT_WORDS_PAGE_SIZE);
  const [wordDraft, setWordDraft] = useState(() => createDefaultWordDraft());
  const [editingWordId, setEditingWordId] = useState(null);
  const [previewWordId, setPreviewWordId] = useState(null);

  const reportStatus = useCallback((text, variant = "info") => {
    setStatusMessage(text);
    setStatusVariant(variant);
  }, []);

  const resetWordDraft = useCallback(() => {
    setWordDraft(createDefaultWordDraft());
    setEditingWordId(null);
  }, []);

  const applyLoadedDeck = useCallback((deck, loadedWords) => {
    const deckTags = parseTagsJson(deck?.tagsJson);

    setDeckForm({
      name: deck?.name || "",
      description: deck?.description || "",
      sourceLanguage: deck?.sourceLanguage || "English",
      targetLanguage: deck?.targetLanguage || "Ukrainian",
      tertiaryLanguage: deck?.tertiaryLanguage || "",
      tagsInput: deckTags.join(", "),
    });

    const editableWords = Array.isArray(loadedWords)
      ? loadedWords.map((word, index) => toEditableWord(word, index + 1))
      : [];

    setWords(editableWords);
    setPreviewWordId(editableWords[0]?.id ?? null);
    resetWordDraft();
  }, [resetWordDraft]);

  const loadDeckForEdit = useCallback(async () => {
    if (!numericDeckId) {
      return;
    }

    setIsLoading(true);
    setLoadError("");

    try {
      const [deck, loadedWords] = await Promise.all([
        desktopApi.getDeckById(numericDeckId),
        desktopApi.getDeckWords(numericDeckId),
      ]);

      if (!deck) {
        throw new Error("Deck not found");
      }

      applyLoadedDeck(deck, loadedWords);
    } catch (error) {
      setLoadError(error.message || "Failed to load deck");
    } finally {
      setIsLoading(false);
    }
  }, [applyLoadedDeck, numericDeckId]);

  useEffect(() => {
    if (!isEditMode) {
      setIsLoading(false);
      return;
    }

    loadDeckForEdit();
  }, [isEditMode, loadDeckForEdit]);

  const handleDeckFormChange = useCallback((event) => {
    const { name, value } = event.target;
    setDeckForm((currentState) => ({
      ...currentState,
      [name]: value,
    }));
  }, []);

  const handleWordDraftChange = useCallback((event) => {
    const { name, value } = event.target;
    setWordDraft((currentState) => ({
      ...currentState,
      [name]: value,
    }));
  }, []);

  const handleUpsertWordDraft = useCallback(() => {
    const cleanedEng = wordDraft.eng.trim();

    if (!cleanedEng) {
      reportStatus("Source word cannot be empty", "error");
      return;
    }

    const nextWord = {
      id: editingWordId ?? `tmp-${nextTempIdRef.current++}`,
      eng: cleanedEng,
      ru: wordDraft.ru.trim(),
      pl: wordDraft.pl.trim(),
      level: wordDraft.level || "A1",
      part_of_speech: wordDraft.part_of_speech || "other",
      example: wordDraft.example.trim(),
    };

    setWords((currentState) => {
      if (editingWordId === null) {
        return [...currentState, nextWord];
      }

      return currentState.map((word) => {
        if (String(word.id) !== String(editingWordId)) {
          return word;
        }

        return {
          ...word,
          ...nextWord,
        };
      });
    });

    setPreviewWordId(nextWord.id);
    setStatusMessage("");
    resetWordDraft();
  }, [editingWordId, reportStatus, resetWordDraft, wordDraft]);

  const handleEditWord = useCallback(
    (wordId) => {
      const editableWord = words.find((word) => String(word.id) === String(wordId));

      if (!editableWord) {
        return;
      }

      setWordDraft(toWordDraft(editableWord));
      setEditingWordId(editableWord.id);
      setPreviewWordId(editableWord.id);
      setStatusMessage("");
    },
    [words],
  );

  const handleDeleteWord = useCallback(
    (wordId) => {
      setWords((currentState) =>
        currentState.filter((word) => String(word.id) !== String(wordId)),
      );

      if (String(editingWordId) === String(wordId)) {
        resetWordDraft();
      }

      if (String(previewWordId) === String(wordId)) {
        setPreviewWordId(null);
      }
    },
    [editingWordId, previewWordId, resetWordDraft],
  );

  const handleViewWord = useCallback((wordId) => {
    setPreviewWordId(wordId);
  }, []);

  const wordsTotalPages = useMemo(() => {
    return Math.max(1, Math.ceil(words.length / wordsPageSize));
  }, [words.length, wordsPageSize]);

  useEffect(() => {
    setWordsPage((currentPage) => {
      if (currentPage > wordsTotalPages) {
        return wordsTotalPages;
      }

      if (currentPage < 1) {
        return 1;
      }

      return currentPage;
    });
  }, [wordsTotalPages]);

  const handleWordsPageChange = useCallback((nextPage) => {
    setWordsPage((currentPage) => {
      const parsedPage = Number(nextPage);

      if (!Number.isInteger(parsedPage)) {
        return currentPage;
      }

      if (parsedPage < 1) {
        return 1;
      }

      if (parsedPage > wordsTotalPages) {
        return wordsTotalPages;
      }

      return parsedPage;
    });
  }, [wordsTotalPages]);

  const handleWordsPageSizeChange = useCallback((nextPageSize) => {
    const parsedPageSize = Number(nextPageSize);

    if (!WORDS_PAGE_SIZE_OPTIONS.includes(parsedPageSize)) {
      return;
    }

    setWordsPageSize(parsedPageSize);
    setWordsPage(1);
  }, []);

  const paginatedWords = useMemo(() => {
    const rangeStart = (wordsPage - 1) * wordsPageSize;
    const rangeEnd = rangeStart + wordsPageSize;

    return words.slice(rangeStart, rangeEnd);
  }, [words, wordsPage, wordsPageSize]);

  const wordsRangeStart = useMemo(() => {
    if (words.length === 0) {
      return 0;
    }

    return (wordsPage - 1) * wordsPageSize + 1;
  }, [words.length, wordsPage, wordsPageSize]);

  const wordsRangeEnd = useMemo(() => {
    if (words.length === 0) {
      return 0;
    }

    return Math.min(words.length, wordsRangeStart + paginatedWords.length - 1);
  }, [words.length, wordsRangeStart, paginatedWords.length]);

  const clearStatus = useCallback(() => {
    setStatusMessage("");
  }, []);

  const goToDecks = useCallback(() => {
    navigate(ROUTE_PATHS.decks);
  }, [navigate]);

  const goToDeckDetails = useCallback(() => {
    if (!numericDeckId) {
      return;
    }

    navigate(`/decks/${numericDeckId}`);
  }, [navigate, numericDeckId]);

  const handleSaveDeck = useCallback(async () => {
    const deckName = deckForm.name.trim();
    const sourceLanguage = deckForm.sourceLanguage.trim();
    const targetLanguage = deckForm.targetLanguage.trim();

    if (!deckName) {
      reportStatus("Deck name is required", "error");
      return;
    }

    if (!sourceLanguage || !targetLanguage) {
      reportStatus("Source and target languages are required", "error");
      return;
    }

    setIsSaving(true);
    setStatusMessage("");

    try {
      const tertiaryLanguage = deckForm.tertiaryLanguage.trim();
      const hasTertiaryLanguage = Boolean(tertiaryLanguage);
      const deckLanguagesCount = new Set(
        [sourceLanguage, targetLanguage, tertiaryLanguage].filter(Boolean),
      ).size;
      const customTagsLimit = Math.max(0, MAX_TOTAL_TAGS - deckLanguagesCount);
      const savePayload = {
        name: deckName,
        description: deckForm.description.trim(),
        sourceLanguage,
        targetLanguage,
        tertiaryLanguage,
        tags: parseTagsInput(deckForm.tagsInput).slice(0, customTagsLimit),
        words: words.map((word, index) => ({
          id: parseNumericId(word.id),
          externalId: word.externalId || `manual-${index + 1}`,
          eng: word.eng,
          ru: word.ru,
          pl: hasTertiaryLanguage ? word.pl : "",
          level: word.level,
          part_of_speech: word.part_of_speech,
          example: word.example,
        })),
      };

      if (numericDeckId) {
        savePayload.deckId = numericDeckId;
      }

      const saveResult = await desktopApi.saveDeck(savePayload);
      const savedDeck = saveResult?.deck || null;
      const savedWords = Array.isArray(saveResult?.words) ? saveResult.words : [];

      if (!savedDeck) {
        throw new Error("Deck save result is invalid");
      }

      applyLoadedDeck(savedDeck, savedWords);
      reportStatus(
        numericDeckId ? "Deck updated successfully" : "Deck created successfully",
        "info",
      );

      if (!numericDeckId) {
        navigate(`/decks/${savedDeck.id}/edit`, { replace: true });
      }
    } catch (saveError) {
      reportStatus(saveError.message || "Failed to save deck", "error");
    } finally {
      setIsSaving(false);
    }
  }, [
    applyLoadedDeck,
    deckForm.name,
    deckForm.description,
    deckForm.sourceLanguage,
    deckForm.targetLanguage,
    deckForm.tertiaryLanguage,
    deckForm.tagsInput,
    navigate,
    numericDeckId,
    reportStatus,
    words,
  ]);

  const previewWord = useMemo(
    () => words.find((word) => String(word.id) === String(previewWordId)) || null,
    [previewWordId, words],
  );

  const languageLabels = useMemo(() => {
    const sourceLanguage = deckForm.sourceLanguage.trim() || "Source";
    const targetLanguage = deckForm.targetLanguage.trim() || "Target";
    const tertiaryLanguage = deckForm.tertiaryLanguage.trim();

    return {
      sourceLanguage,
      targetLanguage,
      tertiaryLanguage,
      hasTertiaryLanguage: Boolean(tertiaryLanguage),
    };
  }, [
    deckForm.sourceLanguage,
    deckForm.targetLanguage,
    deckForm.tertiaryLanguage,
  ]);

  return {
    isEditMode,
    isLoading,
    isSaving,
    loadError,
    statusMessage,
    statusVariant,
    deckForm,
    words,
    paginatedWords,
    wordDraft,
    editingWordId,
    previewWord,
    wordsPage,
    wordsPageSize,
    wordsPageSizeOptions: WORDS_PAGE_SIZE_OPTIONS,
    wordsTotalPages,
    wordsRangeStart,
    wordsRangeEnd,
    languageLabels,
    levelOptions: LEVEL_OPTIONS,
    partOfSpeechOptions: PART_OF_SPEECH_OPTIONS,
    languageOptions: LANGUAGE_OPTIONS,
    handleDeckFormChange,
    handleWordDraftChange,
    handleUpsertWordDraft,
    handleEditWord,
    handleDeleteWord,
    handleViewWord,
    handleWordsPageChange,
    handleWordsPageSizeChange,
    handleSaveDeck,
    resetWordDraft,
    clearStatus,
    goToDecks,
    goToDeckDetails,
    reloadDeck: loadDeckForEdit,
  };
};
