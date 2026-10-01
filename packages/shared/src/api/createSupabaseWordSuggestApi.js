import { getSupabaseClient, hasSupabaseConfig } from "./supabaseClient";

// Asks the suggest-word function for the rest of a card. The Gemini key is
// on the server; this side only sends the word and the deck's languages
// with the person's own token.

const FUNCTION_NAME = "suggest-word";
const TIMEOUT_MS = 15_000;
// A list or a whole deck is a longer answer.
const LONG_TIMEOUT_MS = 45_000;

// Why there is no suggestion, for the interface to say (or not).
export const WORD_SUGGEST_ERRORS = Object.freeze({
  signin: "signin",
  quota: "quota",
  busy: "busy",
  offline: "offline",
  unavailable: "unavailable",
  aborted: "aborted",
});

const suggestError = (code) => Object.assign(new Error(`Word suggestion: ${code}`), { code });

const readErrorCode = async (error) => {
  if (error?.name === "FunctionsFetchError") {
    return WORD_SUGGEST_ERRORS.offline;
  }

  const response = error?.context;
  const status = Number(response?.status) || 0;
  let reason = "";

  try {
    reason = String((await response.json())?.error || "");
  } catch {
    reason = "";
  }

  if (status === 401) {
    return WORD_SUGGEST_ERRORS.signin;
  }

  if (status === 429) {
    return reason === "quota" ? WORD_SUGGEST_ERRORS.quota : WORD_SUGGEST_ERRORS.busy;
  }

  return WORD_SUGGEST_ERRORS.unavailable;
};

// Today's allowance as last read from the server, kept in step with every
// call made from this app so the count moves without asking again.
// null until it has been read.
let allowance = null;
const allowanceListeners = new Set();

const setAllowance = (next) => {
  allowance = next;
  allowanceListeners.forEach((listener) => listener(allowance));
};

const spendOne = () => {
  if (allowance) {
    setAllowance({ ...allowance, used: allowance.used + 1, remaining: Math.max(0, allowance.remaining - 1) });
  }
};

// Calls the function as the signed-in person and returns its answer.
const invoke = async (body, { signal, timeout }) => {
  const client = getSupabaseClient();

  if (!client) {
    throw suggestError(WORD_SUGGEST_ERRORS.unavailable);
  }

  const { data: sessionData } = await client.auth.getSession();

  if (!sessionData?.session) {
    throw suggestError(WORD_SUGGEST_ERRORS.signin);
  }

  const { data, error } = await client.functions.invoke(FUNCTION_NAME, { body, signal, timeout });

  if (signal?.aborted) {
    throw suggestError(WORD_SUGGEST_ERRORS.aborted);
  }

  if (error) {
    const code = await readErrorCode(error);

    if (code === WORD_SUGGEST_ERRORS.quota && allowance) {
      setAllowance({ ...allowance, used: allowance.allowance, remaining: 0 });
    }

    throw suggestError(code);
  }

  spendOne();
  return data || {};
};

const toCount = (value) => (Number.isFinite(Number(value)) ? Math.max(0, Math.trunc(Number(value))) : 0);

export const createSupabaseWordSuggestApi = () => ({
  isConfigured: () => hasSupabaseConfig(),

  // The rest of one card.
  async suggestWord(request, { signal } = {}) {
    return (await invoke(request, { signal, timeout: TIMEOUT_MS }))?.suggestion || null;
  },

  // Cards for the lines of a pasted list, by index.
  async suggestList(request, { signal } = {}) {
    return (await invoke({ ...request, task: "list" }, { signal, timeout: LONG_TIMEOUT_MS }))?.result?.cards || [];
  },

  // A deck on a topic: a name and its cards.
  async suggestTopic(request, { signal } = {}) {
    const result = (await invoke({ ...request, task: "topic" }, { signal, timeout: LONG_TIMEOUT_MS }))?.result;
    return {
      name: result?.name || "",
      description: result?.description || "",
      deckTags: result?.deckTags || [],
      cards: result?.cards || [],
    };
  },

  // A description and tags for a deck that already has a name or words.
  async suggestDeck(request, { signal } = {}) {
    const result = (await invoke({ ...request, task: "deck" }, { signal, timeout: TIMEOUT_MS }))?.result;
    return { description: result?.description || "", tags: result?.tags || [] };
  },

  // Today's allowance: { allowance, used, remaining, resetsAt }, or null
  // when no one is signed in or it cannot be read.
  async getAllowance() {
    const client = getSupabaseClient();
    const { data: sessionData } = client ? await client.auth.getSession() : { data: null };

    if (!sessionData?.session) {
      setAllowance(null);
      return null;
    }

    const { data, error } = await client.rpc("word_suggestion_allowance");
    const row = Array.isArray(data) ? data[0] : data;

    if (error || !row) {
      return allowance;
    }

    setAllowance({
      allowance: toCount(row.allowance),
      used: toCount(row.used),
      remaining: toCount(row.remaining),
      resetsAt: String(row.resets_at || ""),
    });
    return allowance;
  },

  peekAllowance: () => allowance,

  subscribeAllowance(listener) {
    allowanceListeners.add(listener);
    return () => allowanceListeners.delete(listener);
  },

  // A short hint for a word missed in Learn.
  async suggestHint(request, { signal } = {}) {
    return (await invoke({ ...request, task: "hint" }, { signal, timeout: TIMEOUT_MS }))?.result?.hint || "";
  },
});
