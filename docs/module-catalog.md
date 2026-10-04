# Module map

**English** | [Русский](module-catalog.ru.md) | [Polski](module-catalog.pl.md)

These are the main entry points in 0.9.1. This map does not list every component; start with a module's public `index.js`, nearby model and tests.

## Application and pages

| Path | Purpose |
| --- | --- |
| `src/main.jsx`, `src/app/App.jsx` | Startup and composition |
| `src/app/layouts/AppLayout.jsx` | Shared layout |
| `src/app/router/` | Common, web and desktop routes |
| `src/app/prerender/landingPrerender.jsx` | Landing SSR |
| `src/pages/learn/` | Study |
| `src/pages/decks/`, `deck-details/`, `deck-editor/` | Library and editor |
| `src/pages/browse/` | Hub |
| `src/pages/progress/` | Progress and sticker album |
| `src/pages/account/`, `settings/` | Account and settings |
| `src/pages/landing/`, `share/` | Public web pages |

Short paths in the same cell share the `src/pages/` parent.

## Widgets and actions

| Module | Contents |
| --- | --- |
| `src/widgets/LearnFlashcardsPanel/` | Session, Flashcard data, timers and grades |
| `src/widgets/DeckEditorPanel/` | Deck fields and entry editing |
| `src/widgets/DecksOverviewPanel/` | Library, creation menu and generator entry |
| `src/widgets/DeckDetailsPanel/` | Local deck page |
| `src/widgets/BrowseDecksPanel/`, `BrowseDeckDetailsPanel/` | Hub list and details |
| `src/widgets/ProgressOverviewPanel/` | Progress data and UI |
| `src/features/flashcard/` | Card, subject blocks and styles |
| `src/features/subject-fields/` | Profile-driven form fields |
| `src/features/quick-add-words/` | Quick add and deck generation |
| `src/features/word-suggest/` | Suggestions, requests and stale-response handling |
| `src/features/srs-rating-controls/` | Rating buttons |
| `src/features/deck-import/` | Import flow |
| `src/features/word-image-field/` | Adding images |
| `src/features/app-preferences/`, `sync-settings/` | App and sync settings |

`GenerateDeckDialog` is currently defined in `src/features/quick-add-words/ui/QuickAddWordsDialog.jsx`. Styles are in `GenerateDeckDialog.css`; its model uses `useQuickAddWords` in creation mode. This version has no `GenerateDeckDialog.jsx` file.

## Shared core

Paths below start at `packages/shared/src/core/usecases/`.

| Directory | Purpose |
| --- | --- |
| `subjects/` | Subject registry, fields, capabilities, composition and technologies |
| `cardContent/` | Content, images and presentation building |
| `srs/` | FSRS-5, intervals, normalization, queue and limits |
| `importExport/` | Deck parsing and export, matching and media |
| `sync/` | Identity, hash, profile and exchange state |
| `hub/` | Publishing preparation and checks |

For mathematical text, see `packages/shared/src/ui/MathFormula/`: `MathText`, `parseMathText`, `MathFormula` and local KaTeX loading.

## Shared services and infrastructure

| Path under `packages/shared/src/` | Purpose |
| --- | --- |
| `providers/PlatformProvider/` | UI service access |
| `platform/target/` | Build-time platform choice |
| `platform/web/` | IndexedDB and browser adapters |
| `platform/electron/` | Electron API adapters |
| `api/` | Supabase auth, sync, Hub, AI and compatible desktop API |
| `sync/` | Library and image exchange |
| `config/` | Preferences, languages, routes, CSS tokens and AI features |
| `lib/i18n/` | Translations and formatting |
| `lib/media/` | Image preparation and local URLs |
| `ui/` | Shared controls |

## Electron and server

`electron/main.js` composes the app. `electron/main/` handles windows, menus, navigation, import, backups, OAuth and updates. IPC handlers are in `electron/main/ipc/`; the bridge is `electron/preload.cjs`.

`electron/db/initDb.js` creates the schema. `electron/db/services/` contains decks, SRS, progress, settings, media and sync operations. `electron/services/` includes Hub, integrity, database paths, legacy storage migration and token storage.

`supabase/migrations/` holds the server schema. `supabase/functions/suggest-word/` serves AI; `delete-account/` deletes accounts. [Server documentation](../supabase/README.md).

## Build and checks

`vite.config.js` selects targets, routes, aliases and the manifest. `scripts/prerender-landing.mjs` builds static pages. `public/sw.js` controls web caching.

`scripts/check-*` checks layers, UI strings and packaged dependencies. `scripts/acceptance/` contains browser scenarios. `electron/scripts/` contains SQLite integration checks. `.github/workflows/release.yml` builds and publishes desktop releases.

[Commands](onboarding.md) · [Architecture](architecture.md)
