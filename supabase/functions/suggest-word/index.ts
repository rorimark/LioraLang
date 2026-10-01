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
import { buildGeminiRequest, DEFAULT_MODEL, pickFlashModels, readGeminiSuggestion, validateRequest } from "./gemini.ts";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
// The app waits 15 seconds; everything here fits inside that.
const TOTAL_BUDGET_MS = 13_000;
const ATTEMPT_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;
// Overloaded, rate-limited or gone: worth asking the next model.
const TRY_NEXT = new Set([404, 429, 500, 503, 504]);

// The models to ask, best first, for as long as this instance runs: the
// one named in the secrets, then the stable Flash models Google lists.
let modelQueue: string[] = [];

const listModels = async (apiKey: string): Promise<string[]> => {
  try {
    const response = await fetch(`${GEMINI_API}/models?pageSize=200`, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(4_000),
    });
    return response.ok ? pickFlashModels(await response.json()) : [];
  } catch {
    return [];
  }
};

const resolveModels = async (apiKey: string): Promise<string[]> => {
  if (!modelQueue.length) {
    const named = Deno.env.get("GEMINI_MODEL");
    const listed = await listModels(apiKey);
    const queue = [named, ...listed].filter((name): name is string => Boolean(name));
    modelQueue = queue.length ? [...new Set(queue)] : [DEFAULT_MODEL];
  }

  return modelQueue;
};

const askGemini = (apiKey: string, model: string, body: unknown, timeoutMs: number) =>
  fetch(`${GEMINI_API}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
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

  const startedAt = Date.now();
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

  // Ask the best model; when it is overloaded or gone, the next one. A
  // model that does not take the thinking setting is asked again without.
  const models = await resolveModels(apiKey);
  let overloaded = false;

  for (const model of models.slice(0, MAX_ATTEMPTS)) {
    const timeLeft = TOTAL_BUDGET_MS - (Date.now() - startedAt);

    if (timeLeft < 1_500) {
      break;
    }

    try {
      const timeout = Math.min(ATTEMPT_TIMEOUT_MS, timeLeft);
      let response = await askGemini(apiKey, model, buildGeminiRequest(suggestRequest, model), timeout);

      if (response.status === 400) {
        console.warn("suggest-word: asking again without the thinking setting", model, (await response.text()).slice(0, 200));
        response = await askGemini(apiKey, model, buildGeminiRequest(suggestRequest, model, { withThinking: false }), timeout);
      }

      if (TRY_NEXT.has(response.status)) {
        overloaded = overloaded || response.status !== 404;
        console.warn("suggest-word: trying the next model after", model, response.status);

        if (response.status === 404) {
          modelQueue = modelQueue.filter((name) => name !== model);
        }

        continue;
      }

      if (!response.ok) {
        console.error("suggest-word: Gemini answered", model, response.status, (await response.text()).slice(0, 300));
        return reply(502, { error: "unavailable" });
      }

      const answer = await response.json();
      const suggestion = readGeminiSuggestion(answer);

      if (!suggestion) {
        console.error("suggest-word: no suggestion in the answer", model, JSON.stringify(answer).slice(0, 300));
        continue;
      }

      return reply(200, { suggestion });
    } catch (error) {
      overloaded = true;
      console.warn("suggest-word: no answer in time from", model, String(error));
    }
  }

  // Busy is passing: the app says nothing and asks again on the next word.
  return overloaded ? reply(429, { error: "busy" }) : reply(502, { error: "unavailable" });
});
