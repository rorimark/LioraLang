import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { usePlatformService } from "@app/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import {
  DEFAULT_SOURCE_LANGUAGE,
  DEFAULT_TARGET_LANGUAGE,
  LANGUAGE_OPTIONS,
} from "@shared/config/languages";
import {
  buildDeckDetailsRoute,
  buildDeckEditRoute,
  ROUTE_PATHS,
} from "@shared/config/routes";

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
const WORDS_PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_WORDS_PAGE_SIZE = WORDS_PAGE_SIZE_OPTIONS[0];
const MAX_TOTAL_TAGS = 10;
const MAX_WORD_TAGS = 10;
const LEVEL_OPTIONS_SET = new Set(LEVEL_OPTIONS);
const PART_OF_SPEECH_OPTIONS_SET = new Set(PART_OF_SPEECH_OPTIONS);

const buildDefaultDeckLanguages = (deckDefaults = {}) => {
  const preferredSource =
    typeof deckDefaults?.sourceLanguage === "string"
      ? deckDefaults.sourceLanguage.trim()
      : "";
  const preferredTarget =
    typeof deckDefaults?.targetLanguage === "string"
      ? deckDefaults.targetLanguage.trim()
      : "";
  const sourceLanguage = preferredSource || DEFAULT_SOURCE_LANGUAGE;
  const fallbackTarget =
    LANGUAGE_OPTIONS.find((language) => language !== sourceLanguage) ||
    DEFAULT_TARGET_LANGUAGE;
  const targetLanguage =
    preferredTarget &&
    preferredTarget.toLowerCase() !== sourceLanguage.toLowerCase()
      ? preferredTarget
      : fallbackTarget;

  return {
    sourceLanguage,
    targetLanguage,
  };
};

const buildDefaultDeckTagsInput = (deckDefaults = {}) => {
  if (!Array.isArray(deckDefaults?.tags)) {
    return "";
  }

  const tags = [];
  const seen = new Set();

  deckDefaults.tags.forEach((item) => {
    const tag = typeof item === "string" ? item.trim() : "";
    const key = tag.toLowerCase();

    if (!tag || seen.has(key)) {
      return;
    }

    seen.add(key);
    tags.push(tag);
  });

  return tags.slice(0, MAX_TOTAL_TAGS).join(", ");
};

const createDefaultDeckForm = (deckDefaults = {}) => {
  const defaultLanguages = buildDefaultDeckLanguages(deckDefaults);

  return {
    name: "",
    description: "",
    sourceLanguage: defaultLanguages.sourceLanguage,
    targetLanguage: defaultLanguages.targetLanguage,
    tertiaryLanguage: "",
    usesWordLevels: true,
    tagsInput: buildDefaultDeckTagsInput(deckDefaults),
  };
};

const createDefaultWordDraft = (deckDefaults = {}) => {
  const preferredLevel =
    typeof deckDefaults?.level === "string" ? deckDefaults.level.trim() : "";
  const preferredPart =
    typeof deckDefaults?.partOfSpeech === "string"
      ? deckDefaults.partOfSpeech.trim()
      : "";

  return {
    source: "",
    target: "",
    tertiary: "",
    level: LEVEL_OPTIONS_SET.has(preferredLevel) ? preferredLevel : "A1",
    part_of_speech: PART_OF_SPEECH_OPTIONS_SET.has(preferredPart)
      ? preferredPart
      : "noun",
    examplesInput: "",
    tagsInput: "",
  };
};

const resolveExamples = (word) => {
  const dedupedExamples = [];
  const seen = new Set();
  const pushExample = (value) => {
    if (typeof value !== "string") {
      return;
    }

    const example = value.trim();

    if (!example || seen.has(example)) {
      return;
    }

    seen.add(example);
    dedupedExamples.push(example);
  };

  if (Array.isArray(word?.examples)) {
    word.examples.forEach(pushExample);
  }

  pushExample(word?.example);

  return dedupedExamples;
};

const toEditableWord = (word, fallbackIndex) => {
  const examples = resolveExamples(word);

  return {
    id: word?.id ?? `tmp-${fallbackIndex}`,
    externalId: word?.externalId ?? "",
    source: word?.source ?? "",
    target: word?.target ?? "",
    tertiary: word?.tertiary ?? "",
    level: word?.level || "A1",
    part_of_speech: word?.part_of_speech || "other",
    tags: Array.isArray(word?.tags) ? parseTagsJson(word.tags) : [],
    examples,
    example: examples[0] || "",
    tagsInput: Array.isArray(word?.tags) ? parseTagsJson(word.tags).join(", ") : "",
  };
};

const toWordDraft = (word) => {
  const examples = resolveExamples(word);

  return {
  source: word?.source ?? "",
  target: word?.target ?? "",
  tertiary: word?.tertiary ?? "",
  level: word?.level || "A1",
  part_of_speech: word?.part_of_speech || "noun",
  examplesInput: examples.join("\n"),
  tagsInput:
    Array.isArray(word?.tags) && word.tags.length > 0
      ? parseTagsJson(word.tags).join(", ")
      : "",
  };
};

const parseNumericId = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const parseTagsJson = (value) => {
  const rawTags = (() => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value !== "string" || !value.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  const seen = new Set();
  const uniqueTags = [];

  rawTags.forEach((item) => {
    if (typeof item !== "string") {
      return;
    }

    const tag = item.trim();
    const normalizedTag = tag.toLowerCase();

    if (!tag || seen.has(normalizedTag)) {
      return;
    }

    seen.add(normalizedTag);
    uniqueTags.push(tag);
  });

  return uniqueTags;
};

const parseTagsInput = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  const seen = new Set();
  const uniqueTags = [];

  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((tag) => {
      const normalizedTag = tag.toLowerCase();

      if (seen.has(normalizedTag)) {
        return;
      }

      seen.add(normalizedTag);
      uniqueTags.push(tag);
    });

  return uniqueTags;
};

const parseExamplesInput = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  const seen = new Set();
  const uniqueExamples = [];

  value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((example) => {
      if (seen.has(example)) {
        return;
      }

      seen.add(example);
      uniqueExamples.push(example);
    });

  return uniqueExamples;
};

export const useDeckEditorPanel = () => {
  const navigate = useNavigate();
  const deckRepository = usePlatformService("deckRepository");
  const { deckId } = useParams();
  const { appPreferences } = useAppPreferences();
  const numericDeckId = parseNumericId(deckId);
  const isEditMode = Boolean(numericDeckId);
  const defaultDeckForm = useMemo(
    () => createDefaultDeckForm(appPreferences.deckDefaults),
    [appPreferences.deckDefaults],
  );
  const defaultWordDraft = useMemo(
    () => createDefaultWordDraft(appPreferences.deckDefaults),
    [appPreferences.deckDefaults],
  );
  const nextTempIdRef = useRef(1);
  const [isLoading, setIsLoading] = useState(isEditMode);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusVariant, setStatusVariant] = useState("info");
  const [deckForm, setDeckForm] = useState(() => defaultDeckForm);
  const [words, setWords] = useState([]);
  const [wordsPage, setWordsPage] = useState(1);
  const [wordsPageSize, setWordsPageSize] = useState(DEFAULT_WORDS_PAGE_SIZE);
  const [wordDraft, setWordDraft] = useState(() => defaultWordDraft);
  const [editingWordId, setEditingWordId] = useState(null);
  const [previewWordId, setPreviewWordId] = useState(null);

  const reportStatus = useCallback((text, variant = "info") => {
    setStatusMessage(text);
    setStatusVariant(variant);
  }, []);

  const resetWordDraft = useCallback(() => {
    setWordDraft(defaultWordDraft);
    setEditingWordId(null);
  }, [defaultWordDraft]);

  const applyLoadedDeck = useCallback((deck, loadedWords) => {
    const deckTags = parseTagsJson(deck?.tagsJson);

    setDeckForm({
      name: deck?.name || "",
      description: deck?.description || "",
      sourceLanguage: deck?.sourceLanguage || DEFAULT_SOURCE_LANGUAGE,
      targetLanguage: deck?.targetLanguage || DEFAULT_TARGET_LANGUAGE,
      tertiaryLanguage: deck?.tertiaryLanguage || "",
      usesWordLevels: deck?.usesWordLevels !== false,
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
        deckRepository.getDeckById(numericDeckId),
        deckRepository.getDeckWords(numericDeckId),
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
  }, [applyLoadedDeck, deckRepository, numericDeckId]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    loadDeckForEdit();
  }, [isEditMode, loadDeckForEdit]);

  useEffect(() => {
    if (isEditMode) {
      return;
    }

    setIsLoading(false);
    setDeckForm((currentState) => {
      const isPristine =
        words.length === 0 &&
        !currentState.name.trim() &&
        !currentState.description.trim() &&
        !currentState.tertiaryLanguage.trim() &&
        currentState.usesWordLevels === defaultDeckForm.usesWordLevels &&
        !currentState.tagsInput.trim();

      return isPristine ? defaultDeckForm : currentState;
    });
    setWordDraft((currentState) => {
      const isPristine =
        editingWordId === null &&
        !currentState.source.trim() &&
        !currentState.target.trim() &&
        !currentState.tertiary.trim() &&
        !currentState.examplesInput.trim() &&
        !currentState.tagsInput.trim();

      return isPristine ? defaultWordDraft : currentState;
    });
  }, [
    defaultDeckForm,
    defaultWordDraft,
    editingWordId,
    isEditMode,
    words.length,
  ]);

  const handleDeckFormChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setDeckForm((currentState) => ({
      ...currentState,
      [name]: type === "checkbox" ? checked : value,
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
    const cleanedSource = wordDraft.source.trim();

    if (!cleanedSource) {
      reportStatus("Source word cannot be empty", "error");
      return;
    }

    const normalizedExamples = parseExamplesInput(wordDraft.examplesInput);
    const normalizedTags = parseTagsInput(wordDraft.tagsInput).slice(0, MAX_WORD_TAGS);
    const nextWord = {
      id: editingWordId ?? `tmp-${nextTempIdRef.current++}`,
      source: cleanedSource,
      target: wordDraft.target.trim(),
      tertiary: wordDraft.tertiary.trim(),
      level: deckForm.usesWordLevels ? wordDraft.level || "A1" : null,
      part_of_speech: wordDraft.part_of_speech || "other",
      example: normalizedExamples[0] || "",
      examples: normalizedExamples,
      tags: normalizedTags,
      tagsInput: normalizedTags.join(", "),
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
  }, [
    deckForm.usesWordLevels,
    editingWordId,
    reportStatus,
    resetWordDraft,
    wordDraft,
  ]);

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
      const normalizedWordId = String(wordId);
      const removedWord = words.find(
        (word) => String(word.id) === normalizedWordId,
      );

      setWords((currentState) =>
        currentState.filter((word) => {
          return String(word.id) !== normalizedWordId;
        }),
      );

      if (String(editingWordId) === normalizedWordId) {
        resetWordDraft();
      }

      if (String(previewWordId) === normalizedWordId) {
        setPreviewWordId(null);
      }

      if (removedWord) {
        const removedWordLabel = removedWord.source?.trim() || "word";
        reportStatus(`Deleted: ${removedWordLabel}`, "danger");
      }
    },
    [editingWordId, previewWordId, reportStatus, resetWordDraft, words],
  );

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

    navigate(buildDeckDetailsRoute(numericDeckId));
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
        usesWordLevels: deckForm.usesWordLevels,
        words: words.map((word, index) => ({
          id: parseNumericId(word.id),
          externalId: word.externalId || `manual-${index + 1}`,
          source: word.source,
          target: word.target,
          tertiary: hasTertiaryLanguage ? word.tertiary : "",
          level: deckForm.usesWordLevels ? word.level : null,
          part_of_speech: word.part_of_speech,
          tags: Array.isArray(word.tags) ? word.tags : [],
          example: word.example,
          examples: Array.isArray(word.examples)
            ? word.examples
            : word.example
              ? [word.example]
              : [],
        })),
      };

      if (numericDeckId) {
        savePayload.deckId = numericDeckId;
      }

      const saveResult = await deckRepository.saveDeck(savePayload);
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
        navigate(buildDeckEditRoute(savedDeck.id), { replace: true });
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
    deckForm.usesWordLevels,
    deckForm.tagsInput,
    deckRepository,
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
    usesWordLevels: deckForm.usesWordLevels,
    levelOptions: LEVEL_OPTIONS,
    partOfSpeechOptions: PART_OF_SPEECH_OPTIONS,
    languageOptions: LANGUAGE_OPTIONS,
    handleDeckFormChange,
    handleWordDraftChange,
    handleUpsertWordDraft,
    handleEditWord,
    handleDeleteWord,
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
