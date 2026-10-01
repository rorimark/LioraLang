import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDecks } from "@entities/deck";
import { usePlatformService } from "@shared/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import { collectDeckTags } from "@shared/core/usecases/wordSuggest";
import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, LANGUAGE_OPTIONS } from "@shared/config/languages";
import { appendWordsToDeck, createDeckForWords, removeWordsFromDeck } from "./deckWordsWriter";
import { ROW_STATUS, looksLikeWordList, parseWordList, resolveRowStatus } from "./parseWordList";
import { DUPLICATE_KIND, buildDeckWordIndex, findDuplicate, markListDuplicates } from "./wordDuplicates";

export const NEW_DECK_VALUE = "__new__";
export const LEVEL_OPTIONS = ["A1", "A2", "B1", "B2", "C1", "C2"];
export const PART_OF_SPEECH_OPTIONS = [
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
const RECENT_LIMIT = 3;

const EMPTY_DETAILS = Object.freeze({
  tertiary: "",
  examplesInput: "",
  part_of_speech: "",
  level: "",
  tagsInput: "",
});

const splitLines = (value) => {
  const seen = new Set();
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter((item) => item && !seen.has(item) && seen.add(item));
};

const splitTags = (value) => {
  const seen = new Set();
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter((item) => {
      const key = item.toLowerCase();
      return item && !seen.has(key) && seen.add(key);
    })
    .slice(0, 10);
};

const pickDefaultLanguages = (deckDefaults = {}) => {
  const source = deckDefaults?.sourceLanguage || DEFAULT_SOURCE_LANGUAGE;
  const preferredTarget = deckDefaults?.targetLanguage || DEFAULT_TARGET_LANGUAGE;
  const target =
    preferredTarget.toLowerCase() !== source.toLowerCase()
      ? preferredTarget
      : LANGUAGE_OPTIONS.find((language) => language !== source);

  return { sourceLanguage: source, targetLanguage: target };
};

let rowKeySeed = 0;
const nextRowKey = () => `row-${(rowKeySeed += 1)}`;

// Rows the user edits, re-marked against the deck on every change.
const markRows = (rows, index) =>
  markListDuplicates(
    rows.map((row) => ({ ...row, status: resolveRowStatus(row) })),
    index,
  ).map((row) => ({
    ...row,
    // An exact copy starts unticked, with the reason shown; one tick adds
    // it anyway. Nothing is dropped behind the user's back.
    include: row.includeTouched
      ? row.include
      : row.duplicate.kind !== DUPLICATE_KIND.exact &&
        row.duplicate.kind !== DUPLICATE_KIND.repeatedInList,
  }));

export const useQuickAddWords = ({ isOpen, initialDeckId = "", initialTab = "single", onWordsAdded, sourceInputRef } = {}) => {
  const deckRepository = usePlatformService("deckRepository");
  const { decks, isLoading: isDecksLoading } = useDecks();
  const { appPreferences } = useAppPreferences();
  const onWordsAddedRef = useRef(onWordsAdded);

  useEffect(() => {
    onWordsAddedRef.current = onWordsAdded;
  }, [onWordsAdded]);

  const [deckChoice, setDeckChoice] = useState(initialDeckId ? String(initialDeckId) : "");
  const [newDeck, setNewDeck] = useState(() => ({
    name: "",
    ...pickDefaultLanguages(appPreferences.deckDefaults),
  }));
  // A deck made in this dialog, used until the deck list catches up.
  const [createdDeck, setCreatedDeck] = useState(null);
  const [deckWords, setDeckWords] = useState([]);
  const [tab, setTab] = useState(initialTab === "list" ? "list" : "single");
  const [draft, setDraft] = useState({ source: "", target: "" });
  const [details, setDetails] = useState(EMPTY_DETAILS);
  // The picture for the word being typed, already stored locally.
  const [draftImage, setDraftImage] = useState(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [confirmedPair, setConfirmedPair] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  // What happened last, as message keys; translated when shown.
  const [notice, setNotice] = useState(null);
  const [recent, setRecent] = useState([]);
  const [addedTotal, setAddedTotal] = useState(0);
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState([]);

  // Every time the dialog opens it starts from the deck the user is on.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setDeckChoice(initialDeckId ? String(initialDeckId) : "");
    setNotice(null);
    setRecent([]);
    setAddedTotal(0);
    setConfirmedPair("");
  }, [initialDeckId, isOpen]);

  // With no deck given, the first deck; with no decks at all, a new one.
  useEffect(() => {
    if (!isOpen || isDecksLoading || deckChoice) {
      return;
    }

    setDeckChoice(decks[0] ? String(decks[0].id) : NEW_DECK_VALUE);
  }, [deckChoice, decks, isDecksLoading, isOpen]);

  const isNewDeck = deckChoice === NEW_DECK_VALUE;
  const selectedDeck = useMemo(
    () =>
      isNewDeck
        ? null
        : decks.find((deck) => String(deck.id) === deckChoice) ||
          (createdDeck && String(createdDeck.id) === deckChoice ? createdDeck : null),
    [createdDeck, deckChoice, decks, isNewDeck],
  );
  const languages = selectedDeck
    ? {
        sourceLanguage: selectedDeck.sourceLanguage,
        targetLanguage: selectedDeck.targetLanguage,
        tertiaryLanguage: selectedDeck.tertiaryLanguage || "",
        // A side that is pictures takes a picture where it would take text.
        pictureSide: selectedDeck.pictureSide || "",
      }
    : { ...newDeck, tertiaryLanguage: "", pictureSide: "" };
  const usesWordLevels = selectedDeck ? selectedDeck.usesWordLevels !== false : true;
  const pictureSide = languages.pictureSide;

  const loadDeckWords = useCallback(async () => {
    if (!selectedDeck) {
      setDeckWords([]);
      return;
    }

    try {
      const words = await deckRepository.getDeckWords(selectedDeck.id);
      setDeckWords(Array.isArray(words) ? words : []);
    } catch (error) {
      console.warn("[quick-add] deck words failed to load", error);
      setDeckWords([]);
    }
  }, [deckRepository, selectedDeck]);

  useEffect(() => {
    if (isOpen) {
      void loadDeckWords();
    }
  }, [isOpen, loadDeckWords]);

  const wordIndex = useMemo(() => buildDeckWordIndex(deckWords), [deckWords]);
  // The tags the deck uses most, so suggested tags match them.
  const deckTags = useMemo(() => collectDeckTags(deckWords), [deckWords]);

  useEffect(() => {
    setRows((current) => (current.length ? markRows(current, wordIndex) : current));
  }, [wordIndex]);

  const draftDuplicate = useMemo(
    () => (draft.source.trim() ? findDuplicate(wordIndex, draft) : { kind: DUPLICATE_KIND.none, matches: [] }),
    [draft, wordIndex],
  );

  const focusSource = useCallback(() => {
    window.requestAnimationFrame(() => sourceInputRef?.current?.focus());
  }, [sourceInputRef]);

  // The deck to write to: the chosen one, or the new one made on the spot.
  const ensureDeck = useCallback(async () => {
    if (selectedDeck) {
      return selectedDeck;
    }

    const name = newDeck.name.trim();

    if (!name) {
      throw Object.assign(new Error("name"), { i18nKey: "quickAdd.errors.deckName" });
    }

    if (decks.some((deck) => deck.name.trim().toLowerCase() === name.toLowerCase())) {
      throw Object.assign(new Error("taken"), { i18nKey: "quickAdd.errors.deckNameTaken" });
    }

    if (newDeck.sourceLanguage === newDeck.targetLanguage) {
      throw Object.assign(new Error("languages"), { i18nKey: "quickAdd.errors.sameLanguages" });
    }

    const result = await createDeckForWords(deckRepository, newDeck);
    const created = result?.deck;

    if (!created?.id) {
      throw new Error("deck not created");
    }

    setCreatedDeck(created);
    setDeckChoice(String(created.id));
    setNewDeck((current) => ({ ...current, name: "" }));
    return created;
  }, [deckRepository, decks, newDeck, selectedDeck]);

  const writeWords = useCallback(
    async (drafts) => {
      const deck = await ensureDeck();
      const result = await appendWordsToDeck(deckRepository, deck.id, drafts);

      setDeckWords(result.words);
      setAddedTotal((total) => total + result.added.length);
      setRecent((current) =>
        [
          {
            id: `${deck.id}-${Date.now()}`,
            deckId: deck.id,
            words: result.added.map(({ id, source, target }) => ({ id, source, target })),
          },
          ...current,
        ].slice(0, RECENT_LIMIT),
      );
      onWordsAddedRef.current?.({ deck: result.deck || deck, added: result.added });

      return result;
    },
    [deckRepository, ensureDeck],
  );

  const handleDraftChange = useCallback((event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setConfirmedPair("");
  }, []);

  const handleDetailsChange = useCallback((event) => {
    const { name, value } = event.target;
    setDetails((current) => ({ ...current, [name]: value }));
  }, []);

  // The tags a suggestion put in: they belong to that word, so they are not
  // kept for the next one the way chosen tags are.
  const suggestedTagsRef = useRef("");

  // A suggestion fills the card's sides and its details; each goes back to
  // where the form keeps it.
  const applySuggestion = useCallback((patch) => {
    if (typeof patch?.tagsInput === "string") {
      suggestedTagsRef.current = patch.tagsInput;
    }

    const { source, target, ...rest } = patch || {};
    const sides = Object.fromEntries(
      Object.entries({ source, target }).filter(([, value]) => typeof value === "string"),
    );

    if (Object.keys(sides).length) {
      setDraft((current) => ({ ...current, ...sides }));
      setConfirmedPair("");
    }

    if (Object.keys(rest).length) {
      setDetails((current) => ({ ...current, ...rest }));
    }

    setNotice((current) => (current?.kind === "error" ? null : current));
  }, []);

  const addDraft = useCallback(async () => {
    const source = draft.source.trim();
    const target = draft.target.trim();

    if (pictureSide && !draftImage) {
      setNotice({ kind: "error", key: "quickAdd.errors.emptyPicture" });
      return;
    }

    if (pictureSide !== "source" && !source) {
      setNotice({ kind: "error", key: "quickAdd.errors.emptyWord" });
      focusSource();
      return;
    }

    if (pictureSide !== "target" && !target) {
      setNotice({ kind: "error", key: "quickAdd.errors.emptyTranslation" });
      return;
    }

    // The same card twice is asked about once; Enter again means yes.
    const pairKey = `${source}\u0000${target}`.toLowerCase();

    if (draftDuplicate.kind === DUPLICATE_KIND.exact && confirmedPair !== pairKey) {
      setConfirmedPair(pairKey);
      setNotice({ kind: "warning", key: "quickAdd.duplicate.confirm" });
      return;
    }

    setIsSaving(true);

    try {
      const { added } = await writeWords([
        {
          source,
          target,
          tertiary: details.tertiary,
          examples: splitLines(details.examplesInput),
          part_of_speech: details.part_of_speech,
          level: usesWordLevels ? details.level : "",
          tags: splitTags(details.tagsInput),
          image: pictureSide ? draftImage : null,
        },
      ]);

      setDraft({ source: "", target: "" });
      setDraftImage(null);
      setDetails((current) => ({
        ...EMPTY_DETAILS,
        tagsInput: current.tagsInput === suggestedTagsRef.current ? "" : current.tagsInput,
      }));
      suggestedTagsRef.current = "";
      setConfirmedPair("");
      setNotice(
        pictureSide
          ? { kind: "added", key: "quickAdd.added.withPicture", params: { word: pictureSide === "source" ? target : source } }
          : { kind: "added", key: "quickAdd.added.single", params: { word: added[0]?.source || source, translation: added[0]?.target || target } },
      );
      focusSource();
    } catch (error) {
      console.warn("[quick-add] add failed", error);
      // What was typed stays in the fields, to try again.
      setNotice({ kind: "error", key: error?.i18nKey || "quickAdd.errors.save" });
    } finally {
      setIsSaving(false);
    }
  }, [confirmedPair, details, draft, draftDuplicate.kind, draftImage, focusSource, pictureSide, usesWordLevels, writeWords]);

  const undo = useCallback(
    async (entryId) => {
      const entry = recent.find((item) => item.id === entryId);

      if (!entry) {
        return;
      }

      setIsSaving(true);

      try {
        const result = await removeWordsFromDeck(
          deckRepository,
          entry.deckId,
          entry.words.map((word) => word.id),
        );

        if (selectedDeck && String(selectedDeck.id) === String(entry.deckId)) {
          setDeckWords(result.words);
        }

        setRecent((current) => current.filter((item) => item.id !== entryId));
        setAddedTotal((total) => Math.max(0, total - result.removed));
        setNotice({ kind: "info", key: "quickAdd.undone", params: { count: result.removed } });
        onWordsAddedRef.current?.({ deck: result.deck, added: [], removedIds: entry.words.map((word) => word.id) });
      } catch (error) {
        console.warn("[quick-add] undo failed", error);
        setNotice({ kind: "error", key: "quickAdd.errors.undo" });
      } finally {
        setIsSaving(false);
        focusSource();
      }
    },
    [deckRepository, focusSource, recent, selectedDeck],
  );

  // Enter in the word goes to the translation; Enter in the translation adds.
  const handleSourceKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" || event.isComposing) {
        return;
      }

      event.preventDefault();

      if (draft.source.trim() && !draft.target.trim()) {
        event.currentTarget.form?.elements?.namedItem("target")?.focus();
        return;
      }

      void addDraft();
    },
    [addDraft, draft],
  );

  const handleTargetKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" || event.isComposing) {
        return;
      }

      event.preventDefault();
      void addDraft();
    },
    [addDraft],
  );

  const loadList = useCallback(
    (text) => {
      setPasteText(text);
      setRows(
        markRows(
          parseWordList(text).map((row) => ({ ...row, key: nextRowKey() })),
          wordIndex,
        ),
      );
    },
    [wordIndex],
  );

  // A list pasted into the word field opens as a list.
  const handleSourcePaste = useCallback(
    (event) => {
      const text = event.clipboardData?.getData("text") || "";

      if (!looksLikeWordList(text)) {
        return;
      }

      event.preventDefault();
      setTab("list");
      loadList(text);
    },
    [loadList],
  );

  const handlePasteTextChange = useCallback((event) => {
    setPasteText(event.target.value);
  }, []);

  const showPreview = useCallback(() => {
    loadList(pasteText);
  }, [loadList, pasteText]);

  const handleListPaste = useCallback(
    (event) => {
      const text = event.clipboardData?.getData("text") || "";

      if (!text.trim() || rows.length > 0) {
        return;
      }

      event.preventDefault();
      loadList(text);
    },
    [loadList, rows.length],
  );

  const updateRow = useCallback(
    (key, patch) => {
      setRows((current) =>
        markRows(
          current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
          wordIndex,
        ),
      );
    },
    [wordIndex],
  );

  const handleRowChange = useCallback(
    (key, field, value) => updateRow(key, { [field]: value }),
    [updateRow],
  );

  const toggleRow = useCallback(
    (key, include) => updateRow(key, { include, includeTouched: true }),
    [updateRow],
  );

  const removeRow = useCallback(
    (key) => {
      setRows((current) => markRows(current.filter((row) => row.key !== key), wordIndex));
    },
    [wordIndex],
  );

  const swapColumns = useCallback(() => {
    setRows((current) =>
      markRows(
        current.map((row) => ({ ...row, source: row.target, target: row.source })),
        wordIndex,
      ),
    );
  }, [wordIndex]);

  const clearList = useCallback(() => {
    setRows([]);
    setPasteText("");
  }, []);

  const rowsToAdd = useMemo(
    () => rows.filter((row) => row.include && row.status === ROW_STATUS.ready),
    [rows],
  );
  const rowsToFix = useMemo(
    () => rows.filter((row) => row.status !== ROW_STATUS.ready),
    [rows],
  );

  const addRows = useCallback(async () => {
    if (rowsToAdd.length === 0) {
      return;
    }

    setIsSaving(true);

    try {
      const { added } = await writeWords(
        rowsToAdd.map((row) => ({ source: row.source.trim(), target: row.target.trim() })),
      );
      const addedKeys = new Set(rowsToAdd.map((row) => row.key));
      // What was added leaves the preview; what still needs fixing stays.
      const remaining = rows.filter((row) => !addedKeys.has(row.key));

      setRows(remaining);
      setPasteText(remaining.length ? pasteText : "");
      setNotice({ kind: "added", key: "quickAdd.added.list", params: { count: added.length } });
    } catch (error) {
      console.warn("[quick-add] list add failed", error);
      setNotice({ kind: "error", key: error?.i18nKey || "quickAdd.errors.save" });
    } finally {
      setIsSaving(false);
    }
  }, [pasteText, rows, rowsToAdd, writeWords]);

  const handleDeckChoiceChange = useCallback((event) => {
    setDeckChoice(event.target.value);
    setNotice(null);
    setConfirmedPair("");
  }, []);

  const handleNewDeckChange = useCallback((event) => {
    const { name, value } = event.target;
    setNewDeck((current) => ({ ...current, [name]: value }));
  }, []);

  // A new picture answers a "picture first" notice.
  const changeDraftImage = useCallback((image) => {
    setDraftImage(image);
    setNotice((current) => (current?.key === "quickAdd.errors.emptyPicture" ? null : current));
  }, []);

  const hasUnsavedInput =
    Boolean(draft.source.trim() || draft.target.trim() || draftImage) || rows.some((row) => row.source || row.target);

  return {
    decks,
    isDecksLoading,
    deckChoice,
    isNewDeck,
    selectedDeck,
    newDeck,
    languages,
    languageOptions: LANGUAGE_OPTIONS,
    usesWordLevels,
    tab,
    setTab,
    draft,
    draftImage,
    setDraftImage: changeDraftImage,
    details,
    isDetailsOpen,
    setIsDetailsOpen,
    draftDuplicate,
    isSaving,
    notice,
    clearNotice: () => setNotice(null),
    recent,
    addedTotal,
    pasteText,
    rows,
    rowsToAdd,
    rowsToFix,
    hasUnsavedInput,
    handleDeckChoiceChange,
    handleNewDeckChange,
    handleDraftChange,
    handleDetailsChange,
    applySuggestion,
    deckTags,
    handleSourceKeyDown,
    handleTargetKeyDown,
    handleSourcePaste,
    handlePasteTextChange,
    handleListPaste,
    showPreview,
    handleRowChange,
    toggleRow,
    removeRow,
    swapColumns,
    clearList,
    addDraft,
    addRows,
    undo,
  };
};
