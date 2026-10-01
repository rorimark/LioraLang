import { getSupabaseClient, hasSupabaseConfig } from "./supabaseClient";

// Asks the suggest-word function for the rest of a card. The Gemini key is
// on the server; this side only sends the word and the deck's languages
// with the person's own token.

const FUNCTION_NAME = "suggest-word";
const TIMEOUT_MS = 15_000;

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

export const createSupabaseWordSuggestApi = () => ({
  isConfigured: () => hasSupabaseConfig(),

  async suggestWord(request, { signal } = {}) {
    const client = getSupabaseClient();

    if (!client) {
      throw suggestError(WORD_SUGGEST_ERRORS.unavailable);
    }

    const { data: sessionData } = await client.auth.getSession();

    if (!sessionData?.session) {
      throw suggestError(WORD_SUGGEST_ERRORS.signin);
    }

    const { data, error } = await client.functions.invoke(FUNCTION_NAME, {
      body: request,
      signal,
      timeout: TIMEOUT_MS,
    });

    if (signal?.aborted) {
      throw suggestError(WORD_SUGGEST_ERRORS.aborted);
    }

    if (error) {
      throw suggestError(await readErrorCode(error));
    }

    return data?.suggestion || null;
  },
});
