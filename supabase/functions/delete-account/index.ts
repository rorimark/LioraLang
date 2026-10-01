// delete-account: removes the signed-in person's account and everything
// it holds in the cloud.
//
// Deleting a user takes the service-role key, which only exists here. The
// person is checked with the auth server (not just the token), confirms
// with their email address, and only ever deletes themselves. Their files
// go first; then the user, and every table row that belongs to them goes
// with it (all of them reference auth.users on delete cascade). Decks kept
// on the person's own devices are not touched.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { inBatches, isConfirmed, listFilesUnder, USER_BUCKETS } from "./account.ts";

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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return reply(405, { error: "method" });
  }

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");

  if (!serviceKey || !url) {
    return reply(503, { error: "unconfigured" });
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: userData } = await admin.auth.getUser(token);
  const user = userData?.user;

  if (!user) {
    return reply(401, { error: "signin" });
  }

  let body: Record<string, unknown> = {};

  try {
    body = await request.json();
  } catch {
    return reply(400, { error: "bad_request" });
  }

  if (!isConfirmed(body?.confirm, user.email)) {
    return reply(400, { error: "confirm" });
  }

  // Files first: once the user is gone nothing points at them any more.
  // If this fails the account stays, and the person can try again.
  try {
    for (const bucket of USER_BUCKETS) {
      const storage = admin.storage.from(bucket);
      const files = await listFilesUnder(user.id, async (prefix, offset) => {
        const { data, error } = await storage.list(prefix, { limit: 1000, offset });

        if (error) {
          throw error;
        }

        return (data || []).map((entry) => ({ name: entry.name, id: entry.id ?? null }));
      });

      for (const batch of inBatches(files)) {
        const { error } = await storage.remove(batch);

        if (error) {
          throw error;
        }
      }
    }
  } catch (error) {
    console.error("delete-account: could not remove files", user.id, String(error));
    return reply(502, { error: "files" });
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error("delete-account: could not delete the user", user.id, deleteError.message);
    return reply(502, { error: "user" });
  }

  return reply(200, { deleted: true });
});
