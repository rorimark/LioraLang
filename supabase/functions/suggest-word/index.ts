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
import { buildGeminiRequest, DEFAULT_MODEL, readGeminiSuggestion, validateRequest } from "./gemini.ts";

const GEMINI_TIMEOUT_MS = 12_000;

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

  const model = Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL;
  let response: Response;

  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(buildGeminiRequest(suggestRequest, model)),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("suggest-word: Gemini unreachable", String(error));
    return reply(504, { error: "unavailable" });
  }

  if (response.status === 429) {
    return reply(429, { error: "busy" });
  }

  if (!response.ok) {
    console.error("suggest-word: Gemini answered", response.status, (await response.text()).slice(0, 300));
    return reply(502, { error: "unavailable" });
  }

  const suggestion = readGeminiSuggestion(await response.json());

  if (!suggestion) {
    return reply(502, { error: "unavailable" });
  }

  return reply(200, { suggestion });
});
