import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDecks } from "@entities/deck";
import { usePlatformService } from "@shared/providers";
import { useAppPreferences } from "@shared/lib/appPreferences";
import {
  AI_LIST_CHUNK,
  applyCardToRow,
  buildAiDeck,
  buildTopicRequest,
  canDraftCards,
  cardsToRows,
  chunkRows,
  collectDeckTags,
  normalizeDeckDescription,
  editRow,
  isTopicReady,
  rowsToDraft,
  rowToWord,
} from "@shared/core/usecases/wordSuggest";
import { isAiFeatureEnabled } from "@shared/config/aiFeatures";
import { useI18n } from "@shared/lib/i18n";
import { useAiAccess } from "@features/word-suggest";
import { getSubjectProfile, normalizeEntrySubjectFields, storedSubject, createDefaultSubjectFields } from "@shared/core/usecases/subjects";
import { DEFAULT_SOURCE_LANGUAGE, DEFAULT_TARGET_LANGUAGE, LANGUAGE_OPTIONS, defaultContentLanguage } from "@shared/config/languages";
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

// What the assistant is doing for the list, as the interface tells it.
export const AI_STATUS = Object.freeze({
  idle: "idle",
  filling: "filling",
  collecting: "collecting",
  done: "done",
  quota: "quota",
  busy: "busy",
  error: "error",
});

const aiErrorStatus = (error) =>
  error?.code === "quota" ? AI_STATUS.quota : error?.code === "busy" ? AI_STATUS.busy : AI_STATUS.error;

export const useQuickAddWords = ({
  isOpen,
  initialDeckId = "",
  initialTab = "single",
  onWordsAdded,
  sourceInputRef,
  deckNameRef,
} = {}) => {
  const { locale } = useI18n();
  const deckRepository = usePlatformService("deckRepository");
  const { decks, isLoading: isDecksLoading } = useDecks();
  const { appPreferences } = useAppPreferences();
  const onWordsAddedRef = useRef(onWordsAdded);

  useEffect(() => {
    onWordsAddedRef.current = onWordsAdded;
  }, [onWordsAdded]);

  // "topic" opens the list on a new deck, ready to collect words by topic.
  const startsWithTopic = initialTab === "topic";
  const initialChoice = startsWithTopic ? NEW_DECK_VALUE : initialDeckId ? String(initialDeckId) : "";
  const [deckChoice, setDeckChoice] = useState(initialChoice);
  const [newDeck, setNewDeck] = useState(() => ({
    name: "",
    subject: "", subjectFields: {},
    // Filled when the assistant drafts a deck on a topic.
    description: "",
    tags: [],
    // A side of the new deck that is pictures: "source" (the front) or
    // "target" (the back); the other side keeps its language.
    pictureSide: "",
    ...pickDefaultLanguages(appPreferences.deckDefaults),
  }));
  // Whether adding was tried with the new deck's name left empty.
  const [isDeckNameMissing, setIsDeckNameMissing] = useState(false);
  // A deck made in this dialog, used until the deck list catches up.
  const [createdDeck, setCreatedDeck] = useState(null);
  const [deckWords, setDeckWords] = useState([]);
  const [tab, setTab] = useState(initialTab === "list" || startsWithTopic ? "list" : "single");
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

    setDeckChoice(initialChoice);
    setNotice(null);
    setRecent([]);
    setAddedTotal(0);
    setConfirmedPair("");
  }, [initialChoice, isOpen]);

  // With no deck given, the first deck; with no decks at all, a new one.
  useEffect(() => {
    if (!isOpen || isDecksLoading || deckChoice) {
      return;
    }

    setDeckChoice(decks[0] ? String(decks[0].id) : NEW_DECK_VALUE);

    // With no decks yet, the first thing to fill in is the new deck's name.
    if (!decks[0]) {
      window.requestAnimationFrame(() => deckNameRef?.current?.focus());
    }
  }, [deckChoice, deckNameRef, decks, isDecksLoading, isOpen]);

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
    : {
        ...newDeck,
        sourceLanguage: newDeck.pictureSide === "source" ? "" : newDeck.sourceLanguage,
        targetLanguage: newDeck.pictureSide === "target" ? "" : newDeck.targetLanguage,
        tertiaryLanguage: "",
        pictureSide: newDeck.pictureSide || "",
      };
  // What the chosen deck is about decides the form: its fields, its labels,
  // and whether the assistant and pasted lists are on offer. A deck made
  // here follows the same profile as one made in the editor.
  const subject = selectedDeck?.subject || (isNewDeck ? newDeck.subject : "");
  const subjectProfile = getSubjectProfile(subject, selectedDeck?.subjectFields || newDeck.subjectFields);
  const usesWordLevels = subjectProfile.usesLanguages && (selectedDeck ? selectedDeck.usesWordLevels !== false : true);
  const pictureSide = languages.pictureSide;
  const activeTab = subjectProfile.usesLanguages ? tab : "single";

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

    // A new deck needs a name, and the field says so where it is: marked,
    // with the reason under it and the cursor in it.
    if (!name) {
      setIsDeckNameMissing(true);
      window.requestAnimationFrame(() => {
        deckNameRef?.current?.scrollIntoView({ block: "center", behavior: "smooth" });
        deckNameRef?.current?.focus({ preventScroll: true });
      });
      throw Object.assign(new Error("name"), { i18nKey: "quickAdd.errors.deckName", isShownAtField: true });
    }

    if (decks.some((deck) => deck.name.trim().toLowerCase() === name.toLowerCase())) {
      throw Object.assign(new Error("taken"), { i18nKey: "quickAdd.errors.deckNameTaken" });
    }

    if (getSubjectProfile(newDeck.subject).usesLanguages && !newDeck.pictureSide && newDeck.sourceLanguage === newDeck.targetLanguage) {
      throw Object.assign(new Error("languages"), { i18nKey: "quickAdd.errors.sameLanguages" });
    }

    const result = await createDeckForWords(deckRepository, newDeck);
    const created = result?.deck;

    if (!created?.id) {
      throw new Error("deck not created");
    }

    setCreatedDeck(created);
    setDeckChoice(String(created.id));
    setNewDeck((current) => ({ ...current, name: "", description: "", tags: [] }));
    return created;
  }, [deckNameRef, deckRepository, decks, newDeck, selectedDeck]);

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

    const { source, target, subjectFields, ...rest } = patch || {};
    const sides = Object.fromEntries(
      Object.entries({ source, target }).filter(([, value]) => typeof value === "string"),
    );

    if (subjectFields) sides.subjectFields = subjectFields;
    if (Object.keys(sides).length) {
      setDraft((current) => ({ ...current, ...sides }));
      setConfirmedPair("");
    }

    if (Object.keys(rest).length) {
      setDetails((current) => ({ ...current, ...rest }));
    }

    setNotice((current) => (current?.kind === "error" ? null : current));
  }, []);

  const handleSubjectFieldChange = useCallback((name, value) => {
    setDraft((current) => ({ ...current, subjectFields: { ...current.subjectFields, [name]: value } }));
  }, []);

  const addDraft = useCallback(async () => {
    const source = draft.source.trim();
    const target = draft.target.trim();
    const { entryText } = subjectProfile;

    // A subject with its own sides names what is missing in its own words.
    if (entryText && (!source || !target)) {
      setNotice({ kind: "error", key: (source ? entryText.target : entryText.source).errorKey });
      if (!source) focusSource();
      return;
    }

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
          part_of_speech: subjectProfile.usesLanguages ? details.part_of_speech : "",
          level: usesWordLevels ? details.level : "",
          tags: splitTags(details.tagsInput),
          image: pictureSide || subjectProfile.media?.optionalImage ? draftImage : null,
          subjectFields: normalizeEntrySubjectFields(subject, draft.subjectFields),
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
      setNotice(error?.isShownAtField ? null : { kind: "error", key: error?.i18nKey || "quickAdd.errors.save" });
    } finally {
      setIsSaving(false);
    }
  }, [
    confirmedPair,
    details,
    draft,
    draftDuplicate.kind,
    draftImage,
    focusSource,
    pictureSide,
    subject,
    subjectProfile,
    usesWordLevels,
    writeWords,
  ]);

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

      // On to the translation, unless the back is a picture: then there is
      // no translation to type and Enter adds the card.
      if (pictureSide !== "target" && draft.source.trim() && !draft.target.trim()) {
        event.currentTarget.form?.elements?.namedItem("target")?.focus();
        return;
      }

      void addDraft();
    },
    [addDraft, draft, pictureSide],
  );

  const handleTargetKeyDown = useCallback(
    (event) => {
      if (event.key !== "Enter" || event.isComposing || event.nativeEvent?.isComposing || (subjectProfile.entryText?.target.multiline && !event.ctrlKey && !event.metaKey)) {
        return;
      }

      event.preventDefault();
      void addDraft();
    },
    [addDraft, subjectProfile],
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
      if (!subjectProfile.usesLanguages || pictureSide) return;
      const text = event.clipboardData?.getData("text") || "";

      if (!looksLikeWordList(text)) {
        return;
      }

      event.preventDefault();
      setTab("list");
      loadList(text);
    },
    [loadList, pictureSide, subjectProfile.usesLanguages],
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
    (key, field, value) => {
      setRows((current) =>
        markRows(
          current.map((row) => (row.key === key ? editRow(row, field, value) : row)),
          wordIndex,
        ),
      );
    },
    [wordIndex],
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
        // Swapped sides make a drafted card's details wrong.
        current.map((row) => ({ ...row, source: row.target, target: row.source, ai: null })),
        wordIndex,
      ),
    );
  }, [wordIndex]);

  const clearList = useCallback(() => {
    aiControllerRef.current?.abort();
    setRows([]);
    setPasteText("");
    setAiState({ status: AI_STATUS.idle, done: 0, total: 0 });
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
      const { added } = await writeWords(rowsToAdd.map((row) => rowToWord(row, { usesWordLevels })));
      const addedKeys = new Set(rowsToAdd.map((row) => row.key));
      // What was added leaves the preview; what still needs fixing stays.
      const remaining = rows.filter((row) => !addedKeys.has(row.key));

      setRows(remaining);
      setPasteText(remaining.length ? pasteText : "");
      setNotice({ kind: "added", key: "quickAdd.added.list", params: { count: added.length } });
    } catch (error) {
      console.warn("[quick-add] list add failed", error);
      setNotice(error?.isShownAtField ? null : { kind: "error", key: error?.i18nKey || "quickAdd.errors.save" });
    } finally {
      setIsSaving(false);
    }
  }, [pasteText, rows, rowsToAdd, usesWordLevels, writeWords]);

  // ——— The assistant ———

  const ai = useAiAccess({ enabled: isOpen });
  const aiDeck = useMemo(
    () =>
      buildAiDeck({
        languages: { sourceLanguage: languages.sourceLanguage, targetLanguage: languages.targetLanguage, tertiaryLanguage: languages.tertiaryLanguage },
        usesWordLevels,
        tags: deckTags,
        tagLanguage: ai.language,
      }),
    [ai.language, deckTags, languages.sourceLanguage, languages.targetLanguage, languages.tertiaryLanguage, usesWordLevels],
  );
  const canUseAi = ai.isWanted && !pictureSide && subjectProfile.assistant?.batch && canDraftCards(aiDeck);
  const canFillList = canUseAi && isAiFeatureEnabled(appPreferences, "listCompletion");
  const canCollectTopic = canUseAi && isAiFeatureEnabled(appPreferences, "topicCollection");
  const [aiState, setAiState] = useState({ status: AI_STATUS.idle, done: 0, total: 0 });
  const [topic, setTopic] = useState({ text: "", level: "", count: 20 });
  const aiControllerRef = useRef(null);
  const rowsRef = useRef(rows);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    // Disabling a running function cancels its request without touching the other one.
    if ((aiState.status === AI_STATUS.filling && !canFillList) || (aiState.status === AI_STATUS.collecting && !canCollectTopic)) aiControllerRef.current?.abort();
  }, [aiState.status, canCollectTopic, canFillList]);
  useEffect(() => () => aiControllerRef.current?.abort(), []);

  const startAi = useCallback(() => {
    aiControllerRef.current?.abort();
    const controller = new AbortController();
    aiControllerRef.current = controller;
    controller.signal.addEventListener("abort", () => {
      if (aiControllerRef.current === controller) setAiState({ status: AI_STATUS.idle, done: 0, total: 0 });
    }, { once: true });
    return controller;
  }, []);

  // Fills in every line not drafted yet: an empty side, and the rest of
  // the card beside it. Long lists go in parts, each shown as it arrives.
  const fillWithAi = useCallback(async () => {
    const pending = rowsToDraft(rowsRef.current);

    if (!canFillList || !ai.isReady || pending.length === 0) {
      return;
    }

    const controller = startAi();
    let done = 0;
    setAiState({ status: AI_STATUS.filling, done, total: pending.length });

    try {
      for (const part of chunkRows(pending, AI_LIST_CHUNK)) {
        const asked = part.map((row) => ({ key: row.key, source: row.source.trim(), target: row.target.trim() }));
        const cards = await ai.repository.suggestList(
          { deck: aiDeck, rows: asked.map(({ source, target }) => ({ source, target })) },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const byKey = new Map(
          cards
            .filter((card) => asked[card?.index])
            .map((card) => [asked[card.index].key, { card, asked: asked[card.index] }]),
        );

        setRows((current) =>
          markRows(
            current.map((row) => {
              const answer = byKey.get(row.key);
              return answer
                ? applyCardToRow(row, answer.card, aiDeck, { askedText: answer.asked.source || answer.asked.target })
                : row;
            }),
            wordIndex,
          ),
        );
        done += part.length;
        setAiState({ status: AI_STATUS.filling, done, total: pending.length });
      }

      setAiState({ status: AI_STATUS.done, done, total: pending.length });
    } catch (error) {
      if (error?.code !== "aborted") {
        setAiState({ status: aiErrorStatus(error), done, total: pending.length });
      }
    }
  }, [ai.isReady, ai.repository, aiDeck, canFillList, startAi, wordIndex]);

  const changeTopic = useCallback((patch) => setTopic((current) => ({ ...current, ...patch })), []);

  // A deck on a topic: the assistant drafts the words, the person looks
  // them over in the list and adds them like any other.
  const collectByTopic = useCallback(async () => {
    if (!canCollectTopic || !ai.isReady || !isTopicReady(topic.text)) {
      return;
    }

    const controller = startAi();
    setAiState({ status: AI_STATUS.collecting, done: 0, total: topic.count });

    try {
      const avoid = [...deckWords.map((word) => word.source), ...rowsRef.current.map((row) => row.source)];
      const { name, description, deckTags, cards } = await ai.repository.suggestTopic(
        buildTopicRequest({ deck: aiDeck, topic: topic.text, level: topic.level, count: topic.count, avoid }),
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      const drafted = cardsToRows(cards, aiDeck, nextRowKey);

      if (drafted.length === 0) {
        setAiState({ status: AI_STATUS.error, done: 0, total: topic.count });
        return;
      }

      setRows((current) => markRows([...current, ...drafted], wordIndex));
      // A new deck takes the drafted name, description and tags; the person
      // sees the name in the deck picker and can change it before adding.
      setNewDeck((current) => ({
        ...current,
        name: current.name.trim() ? current.name : name || topic.text.trim(),
        description: current.description || description || "",
        tags: current.tags?.length ? current.tags : normalizeDeckDescription({ tags: deckTags }).tags,
      }));
      setAiState({ status: AI_STATUS.done, done: drafted.length, total: drafted.length });
    } catch (error) {
      if (error?.code !== "aborted") {
        setAiState({ status: aiErrorStatus(error), done: 0, total: topic.count });
      }
    }
  }, [ai.isReady, ai.repository, aiDeck, canCollectTopic, deckWords, startAi, topic, wordIndex]);

  // A misspelt line takes the word the assistant meant, and is asked again.
  const applyCorrection = useCallback(
    (key) => {
      setRows((current) =>
        markRows(
          current.map((row) =>
            row.key === key && row.ai?.correction ? { ...row, [row.ai.side]: row.ai.correction, ai: null } : row,
          ),
          wordIndex,
        ),
      );
    },
    [wordIndex],
  );

  const handleDeckChoiceChange = useCallback((event) => {
    const choice = event.target.value;
    aiControllerRef.current?.abort();
    setAiState({ status: AI_STATUS.idle, done: 0, total: 0 });

    setDeckChoice(choice);
    setNotice(null);
    setConfirmedPair("");
    setIsDeckNameMissing(false);

    // A new deck starts with its name: the cursor goes there first.
    if (choice === NEW_DECK_VALUE) {
      window.requestAnimationFrame(() => deckNameRef?.current?.focus());
    }
  }, [deckNameRef]);

  const handleNewDeckChange = useCallback((event) => {
    const { name, value } = event.target;
    setNewDeck((current) => ({ ...current, [name]: value }));

    if (name === "name" && value.trim()) {
      setIsDeckNameMissing(false);
    }
  }, []);

  const handleNewDeckSubjectChange = useCallback((event) => {
    const subject = storedSubject(event.target.value);
    aiControllerRef.current?.abort();
    setAiState({ status: AI_STATUS.idle, done: 0, total: 0 });
    setNewDeck((current) => ({ ...current, subject, subjectFields: createDefaultSubjectFields(subject, defaultContentLanguage(locale)), pictureSide: "" }));
    setDraft((current) => ({ ...current, subjectFields: {} }));
    setDraftImage(null);
    setDetails(EMPTY_DETAILS);
    setTab("single");
    setNotice(null);
  }, [locale]);
  const handleNewDeckSubjectFieldChange = useCallback((name, value) => {
    setNewDeck((current) => ({ ...current, subjectFields: { ...current.subjectFields, [name]: value } }));
  }, []);

  // Which side of the new deck's cards is a picture, if any.
  const handleNewDeckPictureChange = useCallback((event) => {
    const { value } = event.target;
    const pictureSide = value === "source" || value === "target" ? value : "";
    setNewDeck((current) => ({ ...current, pictureSide }));
    setNotice(null);
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
    subjectProfile,
    tab: activeTab,
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
    handleNewDeckSubjectChange,
    handleNewDeckSubjectFieldChange,
    isDeckNameMissing,
    handleNewDeckPictureChange,
    handleDraftChange,
    handleSubjectFieldChange,
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
    isTopicFirst: startsWithTopic,
    ai: {
      isAvailable: canFillList || canCollectTopic,
      canFillList, canCollectTopic,
      isReady: ai.isReady,
      needsSignIn: canUseAi && ai.needsSignIn,
      ...aiState,
      isBusy: aiState.status === AI_STATUS.filling || aiState.status === AI_STATUS.collecting,
      pendingCount: rowsToDraft(rows).length,
      topic,
      changeTopic,
      fillWithAi,
      collectByTopic,
      applyCorrection,
    },
  };
};
