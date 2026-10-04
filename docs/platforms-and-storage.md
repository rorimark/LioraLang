# Platforms, storage and sync

**English** | [Русский](platforms-and-storage.ru.md) | [Polski](platforms-and-storage.pl.md)

Decks and reviews are stored locally. An account adds server exchange without replacing local storage. Web and desktop share the core and use different adapters.

## Data locations

| Data | Web | Desktop |
| --- | --- | --- |
| Decks and entries | IndexedDB `decks`, `words` | SQLite `decks`, `words` |
| Schedule | `reviewCards` | `review_cards` |
| Answer log | `reviewLogs` | `review_logs` |
| Images | Binary data in `mediaAssets` | BLOB in `media_assets` |
| Settings | `settings` and browser environment preferences | App and database settings |
| Exchange state | `syncQueue`, state in `settings` | SQLite sync service |

The browser database is `lioralang-web`, schema version 4, initialized in `packages/shared/src/platform/web/db/webDb.js`. SQLite initializes and migrates in `electron/db/initDb.js`. Do not modify the user's database for development; integration checks use separate data.

Decks have `subject` and `subjectFields`, and entries have their own `subjectFields`. SQLite uses `subject_fields_json`. An empty subject means language, so old language data does not need forced rewriting.

## Offline use

Editing, study, grades and statistics use local data. Desktop includes its resources. Web must first be visited online so the service worker can cache the shell, routes, styles, math and fonts.

`public/sw.js` uses `asset-manifest.json` from the web build. Assets are rooted at the site root. `/app/asset-manifest.json` may return app-route HTML instead of JSON, so it is not a valid manifest address.

App cache and user IndexedDB serve different purposes. Updating cache must not erase decks. Clearing site data, switching browser profiles or using private-mode storage restrictions may remove the local library.

## Private sync

`packages/shared/src/sync/createSyncRepository.js` combines the Supabase API with a platform-local queue adapter.

Decks have a stable `syncId`, content hash and origin metadata. Successful exchange records the last known state. The next exchange compares it with local content and server versions, avoiding unnecessary new versions.

Answers travel as events with `opId`. Repeated delivery must not count an answer twice. Events include the next schedule state and FSRS memory. Images upload before the deck package referencing them.

Private library files use the closed `user-library-decks` bucket. Public Hub uses `decks` and separate tables. A privately synced deck is not automatically published.

## Profiles and conflicts

Progress and exchange state belong to a guest profile or a specific user. Switching accounts clears the active study session so answers do not enter the previous profile. Local word ID alone is insufficient for merging progress.

If both local and remote deck content changed since the last sync, the implementation preserves a local conflict copy and applies the remote version to the main deck. Remote deletion with local edits also preserves a copy. This protects material; it is not collaborative line-by-line editing.

Removing a deck from one device differs from deleting it from the private library. Sync tracks local removals to avoid downloading the same deck on every update.

Tests cover basic cases; simultaneous real devices need separate verification. Compare conflict copies before deletion. Background sync should not repeatedly replace the study card with a loading screen; errors and manual exchange have separate status.

## Images

Full images and thumbnails are local; entries reference `assetId`. Cloud images belong to a user and use byte hashes in their paths. Downloads verify hashes. Missing files show a placeholder without deleting the reference.

Unused-file cleanup is delayed to protect files needed by other devices or packages. Remote cleanup checks current packages. [Image parameters and format](card-media.md).

## Accounts and tokens

The client uses a public Supabase key. RLS and server checks protect other users' data; the public key is not an administrative secret.

Desktop stores Supabase sessions through IPC in `secureStorage.service.js`. When Electron `safeStorage` is available, values use OS encryption. Otherwise the implementation stores plaintext. Do not promise unconditional token encryption. Web uses the default Supabase session storage.

Account deletion is a server function with email confirmation. Server data is removed while local decks remain. [Server setup](../supabase/README.md).

## Backups

`.lioradeck` export includes one deck's content and images, not the full SRS log or account. It is not a database snapshot.

Desktop can relocate the database and schedule backups. Copies go in `backups` beside SQLite; settings control interval and count. The current implementation checkpoints WAL and copies the database file. Close the app before restoring or moving a database, and keep the original until verification.

Use deck export in the browser. Sync helps across devices but does not replace a separate copy of important material.

## Checks after changes

Verify save and reopen on both platforms, export/import, profile switching, repeated event delivery, edit conflicts, deletion and media recovery. Objects in memory alone do not prove persistence compatibility.

[Commands](onboarding.md) · [Deck format](deck-format.md) · [Security notes](code-audit.md)
