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
import {
  buildGeminiRequest,
  DEFAULT_MODEL,
  pickFlashModels,
  raceModels,
  readGeminiSuggestion,
  validateRequest,
  type Attempt,
  type SuggestRequest,
} from "./gemini.ts";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
// The app waits 15 seconds; everything here fits inside that.
const TOTAL_BUDGET_MS = 13_000;
const ATTEMPT_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 3;
// A model that has not answered by then is not waited on alone (see
// raceModels): an overloaded model can take seconds to say so.
const HEDGE_MS = 2_500;
// Overloaded, rate-limited or gone: worth asking the next model.
const TRY_NEXT = new Set([404, 429, 500, 503, 504]);

// The models to ask, best first, for as long as this instance runs: the
// one named in the secrets, then the stable Flash models Google lists
// (Flash-Lite first).
let modelQueue: string[] = [];

const listModels = async (apiKey: string): Promise<string[]> => {
  try {
    const response = await fetch(`${GEMINI_API}/models?pageSize=200`, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(3_000),
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

const askGemini = (apiKey: string, model: string, body: unknown, signal: AbortSignal) =>
  fetch(`${GEMINI_API}/models/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
    signal,
  });

// One model, asked once (and once more without the thinking setting if it
// does not take it).
const attempt = async (
  apiKey: string,
  model: string,
  request: SuggestRequest,
  stop: AbortSignal,
  timeoutMs: number,
): Promise<Attempt> => {
  const signal = AbortSignal.any([stop, AbortSignal.timeout(timeoutMs)]);

  try {
    let response = await askGemini(apiKey, model, buildGeminiRequest(request, model), signal);

    if (response.status === 400) {
      console.warn("suggest-word: asking again without the thinking setting", model, (await response.text()).slice(0, 200));
      response = await askGemini(apiKey, model, buildGeminiRequest(request, model, { withThinking: false }), signal);
    }

    if (TRY_NEXT.has(response.status)) {
      console.warn("suggest-word: trying the next model after", model, response.status);

      if (response.status === 404) {
        modelQueue = modelQueue.filter((name) => name !== model);
      }

      return { overloaded: response.status !== 404 };
    }

    if (!response.ok) {
      console.error("suggest-word: Gemini answered", model, response.status, (await response.text()).slice(0, 300));
      return {};
    }

    const answer = await response.json();
    const suggestion = readGeminiSuggestion(answer);

    if (!suggestion) {
      console.error("suggest-word: no suggestion in the answer", model, JSON.stringify(answer).slice(0, 300));
    }

    return suggestion ? { suggestion } : {};
  } catch (error) {
    if (stop.aborted) {
      return {};
    }

    console.warn("suggest-word: no answer in time from", model, String(error));
    return { overloaded: true };
  }
};

const askModels = (apiKey: string, models: string[], request: SuggestRequest, deadline: number) =>
  raceModels(models, (model, stop, timeoutMs) => attempt(apiKey, model, request, stop, timeoutMs), {
    hedgeMs: HEDGE_MS,
    attemptMs: ATTEMPT_TIMEOUT_MS,
    deadline,
  });

// The gateway has already checked the token's signature (verify_jwt), so
// who is asking is read from the token itself: no round trip to the auth
// server. Only a signed-in person, not the public key, gets suggestions.
const isSignedInToken = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload?.role === "authenticated" && Boolean(payload?.sub) && Number(payload?.exp) * 1000 > Date.now();
  } catch {
    return false;
  }
};

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

  if (!isSignedInToken(token)) {
    return reply(401, { error: "signin" });
  }

  // The allowance is counted against the token's own user: the database
  // checks the token again, so a forged one gets no suggestion.
  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

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

  // The allowance and the list of models are asked for together.
  const [{ data: allowed, error: quotaError }, models] = await Promise.all([
    supabase.rpc("consume_word_suggestion"),
    resolveModels(apiKey),
  ]);

  if (quotaError && !isMissingFunction(quotaError)) {
    console.error("suggest-word: allowance check failed", quotaError.message);
    return reply(503, { error: "unavailable" });
  }

  if (allowed === false) {
    return reply(429, { error: "quota" });
  }

  const result = await askModels(apiKey, models.slice(0, MAX_ATTEMPTS), suggestRequest, startedAt + TOTAL_BUDGET_MS);

  if (result.suggestion) {
    return reply(200, { suggestion: result.suggestion });
  }

  // Busy is passing: the app says nothing and asks again on the next word.
  return result.overloaded ? reply(429, { error: "busy" }) : reply(502, { error: "unavailable" });
});
