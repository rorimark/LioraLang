# Supabase

This directory stores the database schema changes that must exist for:

- account-backed authentication
- Hub deck ownership
- Hub deck versioning
- row-level security
- storage policies for published deck packages

Apply migrations with the Supabase CLI or copy them into the Supabase SQL Editor if you are still migrating from a manually managed project.

Important:

- disable anonymous sign-ins before enabling the account-backed Hub flow
- delete legacy anonymous Hub data before applying the new ownership model
- the client still needs a protected Edge Function for full account deletion because deleting `auth.users` safely requires service-role privileges

## Edge Functions

- `functions/suggest-word` — suggestions for the rest of a card (translation, examples, level, part of speech) from Google Gemini. Needs the `GEMINI_API_KEY` secret (`GEMINI_MODEL` is optional) and the `20261001_0004_word_suggestion_allowance` migration for the daily allowance. Deploy with JWT verification on. See `docs/word-suggestions.md`.
