// suggest-word: the rest of a card for a word someone has typed, and the
// larger jobs built on the same model (tasks.ts): a pasted list, a deck on
// a topic, a hint for a word missed in Learn.
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
} from "./gemini.ts";
import { buildTaskRequest, readTaskAnswer, validateTaskRequest } from "./tasks.ts";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta";
const MAX_ATTEMPTS = 3;
// How long a job may take: the app waits 15 seconds for a word or a hint
// and 45 for a list or a deck, and everything here fits inside that. A
// model that has not answered by hedgeMs is not waited on alone (see
// raceModels): an overloaded model can take seconds to say so.
const QUICK = { totalMs: 13_000, attemptMs: 8_000, hedgeMs: 2_500 };
const LONG = { totalMs: 42_000, attemptMs: 30_000, hedgeMs: 14_000 };
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

// A job for the models: how to ask one, and what of its answer to keep.
type Job = {
  build: (model: string, options: { withThinking?: boolean }) => unknown;
  read: (answer: unknown) => Record<string, unknown> | null;
  budget: typeof QUICK;
};

const resolveJob = (body: unknown): Job | null => {
  const task = (body as Record<string, unknown> | null)?.task;

  if (task === undefined || task === "word") {
    const request = validateRequest(body);
    return request
      ? {
          build: (model, options) => buildGeminiRequest(request, model, options),
          read: (answer) => {
            const suggestion = readGeminiSuggestion(answer);
            return suggestion ? { suggestion } : null;
          },
          budget: QUICK,
        }
      : null;
  }

  const request = validateTaskRequest(body);
  return request
    ? {
        build: (model, options) => buildTaskRequest(request, model, options),
        read: (answer) => {
          const result = readTaskAnswer(request, answer);
          return result ? { result } : null;
        },
        budget: request.task === "hint" ? QUICK : LONG,
      }
    : null;
};

type Reply = Record<string, unknown>;

// One model, asked once (and once more without the thinking setting if it
// does not take it).
const attempt = async (
  apiKey: string,
  model: string,
  job: Job,
  stop: AbortSignal,
  timeoutMs: number,
): Promise<Attempt<Reply>> => {
  const signal = AbortSignal.any([stop, AbortSignal.timeout(timeoutMs)]);

  try {
    let response = await askGemini(apiKey, model, job.build(model, {}), signal);

    if (response.status === 400) {
      console.warn("suggest-word: asking again without the thinking setting", model, (await response.text()).slice(0, 200));
      response = await askGemini(apiKey, model, job.build(model, { withThinking: false }), signal);
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
    const value = job.read(answer);

    if (!value) {
      console.error("suggest-word: nothing usable in the answer", model, JSON.stringify(answer).slice(0, 300));
    }

    return value ? { value } : {};
  } catch (error) {
    if (stop.aborted) {
      return {};
    }

    console.warn("suggest-word: no answer in time from", model, String(error));
    return { overloaded: true };
  }
};

const askModels = (apiKey: string, models: string[], job: Job, startedAt: number) =>
  raceModels(models, (model, stop, timeoutMs) => attempt(apiKey, model, job, stop, timeoutMs), {
    hedgeMs: job.budget.hedgeMs,
    attemptMs: job.budget.attemptMs,
    deadline: startedAt + job.budget.totalMs,
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

  const job = resolveJob(body);

  if (!job) {
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

  const result = await askModels(apiKey, models.slice(0, MAX_ATTEMPTS), job, startedAt);

  if (result.value) {
    return reply(200, result.value);
  }

  // Busy is passing: the app says nothing and asks again on the next word.
  return result.overloaded ? reply(429, { error: "busy" }) : reply(502, { error: "unavailable" });
});
