# Supabase backend

**English** | [Русский](README.ru.md) | [Polski](README.pl.md)

Supabase handles accounts, private libraries, progress, Hub and AI. Local study does not depend on its availability. This directory contains SQL migrations and Edge Functions; deploying the website does not apply them automatically.

## Migrations

Apply files in order and check the history of applied migrations. Back up an existing project and review changes first. Do not automatically delete old data to adopt a new ownership model.

| File in `migrations/` | Adds |
| --- | --- |
| `20260331_0001_auth_hub_foundation.sql` | Profiles, Hub owners, deck versions, RLS and public storage |
| `20260427_0002_account_sync_foundation.sql` | Devices, private library, versions and progress events |
| `20260427_0003_account_sync_storage.sql` | Private file bucket and access policies |
| `20261001_0004_word_suggestion_allowance.sql` | Daily AI allowance tracking |
| `20261001_0005_hub_picture_decks.sql` | Language picture-deck publication and Hub file limits |
| `20261001_0006_hub_reports.sql` | Reports, hiding and moderation |
| `20261001_0007_word_suggestion_allowance_read.sql` | Remaining allowance lookup and a single source for its limit |

Public Hub uses the `decks` bucket; private libraries use `user-library-decks`. RLS and storage policies must restrict private data to its owner. Subject fields travel in JSON packages; a new subject alone does not require another table.

## Client configuration and Auth

The client receives only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. The key is public; administrative authority must not depend on it. Configure allowed redirect URLs for web and desktop OAuth.

Publishing and reporting require an account with a confirmed email. Anonymous sign-in is not a substitute for ownership. When migrating an older backend, inspect existing records and policies separately rather than running indiscriminate cleanup.

## Edge Functions

### suggest-word

`functions/suggest-word/` serves words, lists, topics, hints, descriptions and subject generation. It uses Gemini and requires the server secret `GEMINI_API_KEY`; `GEMINI_MODEL` is optional.

Keep JWT verification enabled. The function also checks the user, request format and allowance. The current quota is 300 accepted requests per account per UTC day; `word_suggestion_allowance()` returns the remaining allowance.

The server imports the shared subject catalog from `packages/shared`. Check that bundling includes those relative dependencies. Otherwise the site may know a new subject that the function rejects. After deployment, send a real request for each changed task. [AI contracts](../docs/word-suggestions.md).

### delete-account

`functions/delete-account/` validates the token through Auth, requires confirmation using the user's email, removes their files from both buckets, then deletes the account. Related rows are deleted through cascades. Local decks on devices are untouched.

It uses the server-only `SUPABASE_SERVICE_ROLE_KEY` supplied by Supabase. Never expose this key to clients. JWT verification stays enabled. Test deletion on a separate test account.

## Deployment commands

The project owner runs these commands from the repository root with an authenticated Supabase CLI. Replace `PROJECT_REF` with your project ref. Flags were checked against CLI 2.117.0 help; check `--help` before using a different version.

First inspect planned migrations:

```sh
supabase db push --project-ref PROJECT_REF --dry-run
```

After reviewing the list and taking a backup, apply them:

```sh
supabase db push --project-ref PROJECT_REF
```

Use a local, uncommitted file such as `.env.supabase.local` for server secrets. Do not place real keys in instructions, shell history or logs.

```sh
supabase secrets set --project-ref PROJECT_REF --env-file .env.supabase.local
supabase functions deploy suggest-word --project-ref PROJECT_REF
supabase functions deploy delete-account --project-ref PROJECT_REF
```

Do not use `--no-verify-jwt` for these functions. Bundling depends on the CLI environment: ensure shared files enter the deployment and verify it on a test project. No shared `supabase/config.toml` is committed here; configure your own local stack separately.

## Hub reports and moderation

A confirmed user can report a public deck once. Three distinct reporters hide the deck. Republishing by its owner does not remove the restriction.

Administrators can inspect the summary through SQL Editor:

```sql
select * from public.hub_deck_report_summary;
```

`moderate_hub_deck(uuid, text)` accepts `hide`, `restore` or `remove`. Ordinary clients cannot call it. Restoring unhides the deck and clears reports; removal deletes its row, but handling its storage file is separate. To hide a selected deck:

```sql
select public.moderate_hub_deck('DECK_UUID'::uuid, 'hide');
```

`DECK_UUID` is a placeholder, not a valid UUID. Verify the selected deck before administrative action.

## Access checks

On test data, check two different users, reading another user's private deck and file, access without a session, unconfirmed email, duplicate progress events, quota, hidden decks and account deletion. Disabling a client button does not replace RLS or server validation.

[Storage and sync](../docs/platforms-and-storage.md) · [Client setup](../docs/onboarding.md) · [Known limitations](../docs/code-audit.md)
