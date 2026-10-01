// suggest-word: the rest of a card for a word someone has typed.
//
// The Gemini key lives here, as the GEMINI_API_KEY secret, and never in
// the app. Only a signed-in person gets suggestions, and each person has a
// daily allowance (consume_word_suggestion), so a leaked app build cannot
// spend the key.
//
// Secrets: GEMINI_API_KEY (required), GEMINI_MODEL (optional).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildGeminiRequest, DEFAULT_MODEL, pickFlashModel, readGeminiSuggestion, validateRequest } from "./gemini.ts";

const GEMINI_TIMEOUT_MS = 12_000;
const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";

// The model in use, for as long as this instance runs. Google retires
// models; when the one in use is gone (404), the newest stable Flash from
// Google's own list takes its place.
let activeModel = "";

const findReplacementModel = async (apiKey: string): Promise<string> => {
  try {
    const response = await fetch(`${GEMINI_API}/models?pageSize=200`, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
    return response.ok ? pickFlashModel(await response.json()) : "";
  } catch {
    return "";
  }
};

const askGemini = (apiKey: string, model: string, body: unknown) =>
  fetch(`${GEMINI_API}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
  });

// The app's own pages call this with a bearer token, from the web and from
// the desktop app, so any origin may ask; the token decides who gets an
// answer.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });

// The allowance is a database function. Until its migration is applied the
// function still answers, so the feature does not wait on the database.
const isMissingFunction = (error: { code?: string; message?: string } | null) =>
  Boolean(error && (error.code === "PGRST202" || error.code === "42883"));

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return reply(405, { error: "method" });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    return reply(503, { error: "unconfigured" });
  }

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "");
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await supabase.auth.getUser(token);

  if (!userData?.user) {
    return reply(401, { error: "signin" });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return reply(400, { error: "bad_request" });
  }

  const suggestRequest = validateRequest(body);

  if (!suggestRequest) {
    return reply(400, { error: "bad_request" });
  }

  const { data: allowed, error: quotaError } = await supabase.rpc("consume_word_suggestion");

  if (quotaError && !isMissingFunction(quotaError)) {
    console.error("suggest-word: allowance check failed", quotaError.message);
    return reply(503, { error: "unavailable" });
  }

  if (allowed === false) {
    return reply(429, { error: "quota" });
  }

  // A model named in the secrets is used as it is; otherwise the newest
  // stable Flash Google lists, looked up once per instance.
  if (!activeModel) {
    activeModel = Deno.env.get("GEMINI_MODEL") || (await findReplacementModel(apiKey)) || DEFAULT_MODEL;
  }

  let model = activeModel;
  let response: Response;

  try {
    response = await askGemini(apiKey, model, buildGeminiRequest(suggestRequest, model));

    if (response.status === 404) {
      const replacement = await findReplacementModel(apiKey);

      if (replacement && replacement !== model) {
        console.warn(`suggest-word: ${model} is gone, using ${replacement}`);
        model = replacement;
        activeModel = replacement;
        response = await askGemini(apiKey, model, buildGeminiRequest(suggestRequest, model));
      }
    }

    // A model that does not take the thinking setting is asked again
    // without it.
    if (response.status === 400) {
      console.warn("suggest-word: retrying without the thinking setting", model, (await response.text()).slice(0, 200));
      response = await askGemini(apiKey, model, buildGeminiRequest(suggestRequest, model, { withThinking: false }));
    }
  } catch (error) {
    console.error("suggest-word: Gemini unreachable", String(error));
    return reply(504, { error: "unavailable" });
  }

  if (response.status === 429) {
    return reply(429, { error: "busy" });
  }

  if (!response.ok) {
    console.error("suggest-word: Gemini answered", model, response.status, (await response.text()).slice(0, 300));
    return reply(502, { error: "unavailable" });
  }

  const answer = await response.json();
  const suggestion = readGeminiSuggestion(answer);

  if (!suggestion) {
    console.error("suggest-word: no suggestion in the answer", model, JSON.stringify(answer).slice(0, 300));
    return reply(502, { error: "unavailable" });
  }

  return reply(200, { suggestion });
});
