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

## Edge Functions

- `functions/suggest-word` — suggestions for the rest of a card (translation, examples, level, part of speech) from Google Gemini. Needs the `GEMINI_API_KEY` secret (`GEMINI_MODEL` is optional) and the `20261001_0004_word_suggestion_allowance` migration for the daily allowance. Deploy with JWT verification on. See `docs/word-suggestions.md`.
- `functions/delete-account` — deletes the signed-in person's account: checks the session with the auth server, requires their email address typed as confirmation, removes their files from the `decks` and `user-library-decks` buckets, then deletes the user (every table row goes with it, all reference `auth.users` on delete cascade). Uses the built-in `SUPABASE_SERVICE_ROLE_KEY`. Deploy with JWT verification on.

## Hub moderation

Migration `20261001_0006_hub_reports` adds reports. Anyone signed in with a confirmed email can report a public deck once; three reports from different people hide it (`hub_decks.is_hidden`), and the owner cannot unhide it by publishing again. Look after the Hub from the SQL editor:

```sql
select * from public.hub_deck_report_summary;           -- what was reported, newest and hidden first
select public.moderate_hub_deck('<deck id>', 'hide');     -- hide now
select public.moderate_hub_deck('<deck id>', 'restore');  -- show again, reports cleared
select public.moderate_hub_deck('<deck id>', 'remove');   -- delete the deck; its file stays in Storage → decks → <owner id>
```

None of these can be called from the app.

