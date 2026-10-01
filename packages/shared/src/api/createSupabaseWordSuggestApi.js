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
    throw suggestError(await readErrorCode(error));
  }

  return data || {};
};

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
    return { name: result?.name || "", cards: result?.cards || [] };
  },

  // A short hint for a word missed in Learn.
  async suggestHint(request, { signal } = {}) {
    return (await invoke({ ...request, task: "hint" }, { signal, timeout: TIMEOUT_MS }))?.result?.hint || "";
  },
});
