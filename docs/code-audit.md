# Quality checks and known limitations

**English** | [Русский](code-audit.ru.md) | [Polski](code-audit.pl.md)

Snapshot for 0.9.1, October 4, 2026. These are implementation and verification notes, not an independent security audit or a promise of no bugs. Earlier subjective scores and placeholder claims no longer describe the app.

## Consistent foundations

- Web and desktop share SRS, import, hashes and subject rules.
- Grading verifies revision and profile, then writes schedule and log in one transaction.
- Profiles define subjects; fields, layouts, language and AI capabilities are shared with the server.
- Unsupported formats are rejected to prevent older clients discarding unknown fields.
- Sync has profile state, queued events and conflict copies; it is implemented.
- Generation shows editable drafts and saves after confirmation.
- Images have verified hashes and separate local storage.
- Client builds contain neither Gemini secrets nor Supabase service role.

## Automated coverage

| Check | Confirms | Does not confirm |
| --- | --- | --- |
| Vitest | Contracts, normalization, queues, races and components | Every possible user action |
| SQLite checks | Storage, logs, media and subject fields | Every migration of real user data |
| Browser acceptance | Offline use, layouts and mocked generation | Gemini factual quality or real allowance |
| Lint and boundaries | Code errors and prohibited imports | Complete architectural correctness |
| `app.asar` check | Packaged dependency presence and resolution | Every feature running on each OS |

Before 0.9.1, 544 tests passed across 77 files. [Onboarding](onboarding.md) describes commands and environment; [baseline](baseline.md) records the snapshot. New behavior needs its own checks.

## Areas needing attention

### Desktop sessions

`electron/services/secureStorage.service.js` uses OS `safeStorage` when available, otherwise `plain` storage. Make fallback behavior explicit and test session restoration on supported OSes. Encryption is not guaranteed for every token.

### Electron navigation

The window has context isolation, no Node integration, CSP and devtools controls. `windowLifecycle.js` has no explicit `setWindowOpenHandler` or general `will-navigate` guard. Check allowed addresses and external-browser handling before adding links.

### Remote import

`importWorkflow.js` first accepts HTTP/HTTPS, then checks `isTrustedHubStorageUrl`. Configured origins require exact equality; fallback requires HTTPS and a Supabase domain. This is not arbitrary HTTP download support, but configuration and redirect rules need review before adding import sources.

### SQLite backups

Backups checkpoint WAL and copy the database file. Checkpoint is best effort, so consistency under every concurrent access pattern is not established. Backup and migration changes require restoration tests on separate databases.

### Concurrent devices

Events have IDs and content conflicts preserve copies. Tests do not replace two-device checks, interrupted exchanges, account switches and deletions. Test these before changing push/pull order.

### AI quality

Validation checks shape, lengths and fields, not code, historical facts or solutions. Browser scenarios use fixtures, not a real provider. Requests can time out or overload even with allowance remaining.

### Public Hub

Hub supports language decks including images. Other subjects are blocked in UI and core until publishing expands. Hiding a button is not server security; access relies on RLS and RPC.

### Releases and CI

Builds are unsigned; macOS updates are manual. Release CI exists, but no general workflow guarantees every check on each push. Renderer checks alone do not verify packaged dependencies.

## Safe changes

Change rules where they belong. Do not duplicate SRS in adapters, profiles in components or server normalization. A failed save must not advance the card, and clearing user data is not a test fix.

Measure performance: bundle size/loading, requests, long lists, calculation time and image memory. Add memoization, caches and abstractions for demonstrated needs.

[Smoke checklist](smoke-checklist.md) · [Architecture](architecture.md) · [Code rules](../rules/code-and-components-rules.md)
