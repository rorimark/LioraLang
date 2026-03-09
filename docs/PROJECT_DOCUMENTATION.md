# LioraLang Project Documentation

## About this document

This is a full technical guide for the current project version.
It explains product behavior, architecture, data storage, SRS logic, integrations, and build flow.
It does not include secrets or sensitive operational details.

## 1. What LioraLang is

LioraLang is an offline-first language learning app.
The core idea is simple. Users keep their decks and words locally, study with flashcards and spaced repetition, then optionally share decks through LioraLangHub.

The project runs on two targets.

- Desktop with Electron
- Web in a browser

Both targets use one React codebase and shared business rules.

## 2. Main capabilities

### Deck management

- Create decks
- Edit deck title, description, languages, and tags
- Add, edit, and remove words
- Delete decks
- Import and export decks

### Learning mode

- Flip flashcards
- Grade with Again, Hard, Good, Easy
- Run SRS with daily limits
- Start an extra session after daily limits
- Keep progress when moving between pages

### Progress page

- Weekly activity chart
- Top deck activity
- Retention split
- Daily intensity chart
- Milestones

### Settings

- Theme mode System, Light, Dark
- Keyboard shortcuts
- SRS and session options
- Import and export behavior
- Desktop behavior options
- Integrity check and DB recovery

### Hub

- Browse public decks
- Import a deck from Hub
- Publish a local deck to Hub
- Track downloads

## 3. Technology stack

### Frontend

- React 19
- React Router 7
- Vite 7
- React Icons

### Desktop shell

- Electron 40
- better-sqlite3
- electron-builder

### Web data layer

- IndexedDB with native browser API
- Service Worker for offline behavior
- PWA manifest

### Cloud layer

- Supabase
- PostgreSQL
- Supabase Storage

## 4. Project structure

The project follows Feature-Sliced Design.

### `src/app`

App entry and shell.

- `App.jsx` applies theme and startup accessibility settings
- `PlatformProvider` provides platform services
- `router` contains routes and lazy loading
- `layouts` contains the main app layout

### `src/pages`

Top-level pages built from widgets and features.

- `learn`
- `decks`
- `deck-editor`
- `deck-details`
- `browse`
- `progress`
- `settings`
- `account`

### `src/widgets`

Large page blocks with focused responsibility.
Examples include `LearnFlashcardsPanel`, `DecksOverviewPanel`, and `ProgressOverviewPanel`.

### `src/features`

User-facing features with isolated logic.
Examples include deck import, deck delete, rating controls, and theme switch.

### `src/entities`

Domain entities and related hooks.
Main entities are deck and word.

### `src/shared`

Reusable modules.

- `config` constants and tokens
- `ui` common UI components
- `lib` helper logic and settings hooks
- `core` platform-agnostic business use cases
- `platform` target-specific adapters
- `api` HTTP integrations including Supabase API for web mode

### `electron`

Desktop-only layer.

- `main.js` window lifecycle, menu, IPC, system operations
- `preload.cjs` safe API bridge for renderer
- `db` SQLite init, migrations, and services
- `services` integrity checks, DB path handling, legacy migration, Hub operations

## 5. App lifecycle

### Boot flow

1. `src/main.jsx` mounts React root.
2. `PlatformProvider` resolves services for the current target.
3. `App` applies startup accessibility and theme.
4. `AppRouter` renders `AppLayout` and route tree.
5. In production web mode, service worker registration runs.
6. In production web mode, route chunks preload for stronger offline navigation.

### Routing

The app uses `createBrowserRouter`.
Pages are lazy-loaded to keep startup bundle small.
`RouteErrorBoundary` and `RouteHydrateFallback` protect UX during load and errors.

## 6. Platform abstraction

This is one of the key architecture decisions.

UI components never need to know whether the app runs in desktop or web mode.
UI asks for services through one contract.

### How it works

1. `PlatformProvider` calls `getPlatformServices()`.
2. `@platform-target` resolves target implementation.
3. Desktop build uses Electron services.
4. Web build uses browser services.

### Service contract

- `deckRepository`
- `settingsRepository`
- `hubRepository`
- `srsRepository`
- `progressRepository`
- `systemRepository`
- `runtimeGateway`

### Why this matters

- Cleaner UI logic
- Fewer target-specific conditionals in components
- Easier migration and testing

## 7. Data storage

### Desktop storage

Desktop mode uses SQLite via `better-sqlite3`.

Main tables include:

- `decks`
- `words`
- `review_cards`
- `review_logs`
- `app_settings`
- `deck_folders`

On app start, `initDb()` runs schema checks and additive migrations.
Legacy columns are mapped into the current model when needed.

### Web storage

Web mode uses IndexedDB.

Main stores include:

- `decks`
- `words`
- `reviewCards`
- `reviewLogs`
- `settings`
- `syncQueue`

`syncQueue` is used for deferred Hub operations when offline.

### Settings persistence

Settings are persisted in local data storage on both targets.
Defaults and normalization keep upgrades stable between versions.

## 8. Deck package format and import/export

The app supports package-based deck exchange.
The main format is `lioralang.deck` version 1.
JSON import is also supported.

### What package data contains

- Deck metadata
- Deck languages
- Word list
- Optional tags and examples

### Import pipeline

- Parse payload
- Validate package format
- Validate required language mapping
- Normalize content
- Apply duplicate strategy
- Save into local storage

Supported duplicate strategies:

- `skip`
- `update`
- `keep_both`

Export uses shared core use cases, so behavior stays consistent across targets.

## 9. SRS logic

SRS rules are centralized in `shared/core/usecases/srs`.
Both desktop and web use the same scheduling logic.

### Card states

- `new`
- `learning`
- `review`
- `relearning`

### Rating options

- `again`
- `hard`
- `good`
- `easy`

### SRS settings

- New cards per day
- Max reviews per day
- Learning steps
- Easy bonus
- Lapse penalty

### Session building

1. Load deck words and review cards.
2. Compute due candidates by queue state.
3. Apply daily limits.
4. Select next card.
5. Build rating preview.

### Grade flow

When a card is graded:

1. Review card state is updated.
2. Review log entry is written.
3. Session snapshot is rebuilt.
4. UI receives next card and updated counters.

### Shuffle modes

- `off`
- `per_session`
- `always`

`per_session` uses a stable seed for one session.
`always` randomizes on each rebuild.

### Completion state

Session completion is explicit.
The app can return reasons like daily limit reached or empty due queue.
If daily limits are reached, extra session can be started.

## 10. Learn page behavior

`LearnFlashcardsPanel` is the main learning container.

It handles:

- Session load via `srsRepository`
- Card flip state
- Rating actions
- Deck selection persistence
- Auto-flip timer
- Keyboard shortcuts
- Learn progress persistence

Learn progress stores:

- Selected deck id
- Front/back side state
- Last card word id per deck

## 11. Deck pages

### Decks page

Shows local deck library and actions.
Main actions include import, export, publish, edit, delete, refresh.

### Deck editor page

Supports create and edit in one flow.
Validates deck languages, tags, and words.
Supports word pagination for performance and readability.

### Deck details page

Shows words in a deck with filtering and responsive table behavior.

## 12. Browse page and LioraLangHub

Browse uses `hubRepository` from platform services.
UI logic stays the same across targets.

### Desktop target

Hub operations run in Electron main process via IPC.
Renderer in desktop mode does not need direct Supabase transport.

### Web target

Web mode uses `@shared/api/hubDecksApi`.
Offline-like failures can queue operations in `syncQueue`.
Queued actions flush when network returns.

## 13. Progress page logic

Progress data is built from review cards and review logs.
The aggregation model is shared, which keeps metrics aligned across targets.

Main sections:

- KPI summary
- Weekly Review Activity
- Top Deck Activity
- Retention Split
- Milestones
- Daily Intensity

## 14. Settings page logic

Settings are grouped by task:

- General
- Learning Core
- Deck Defaults
- Workspace and Safety
- Advanced Desktop and Privacy
- Import and Export
- Storage and Integrity

`Storage and Integrity` actions are meaningful in desktop mode.
In web mode, unsupported actions return explicit messages.

### Reset behavior

Reset to defaults is supported.
Destructive actions use confirmation flow.

## 15. Theme, design tokens, and accessibility

Colors and visual tokens are centralized in `src/shared/config/variables.css`.
Light and dark theme use the same variable names with different values.

Accessibility options include:

- Font scale
- Compact mode
- Reduced motion
- High contrast mode

Pointer focus behavior is guarded so mouse interactions do not break keyboard flow.

## 16. Desktop shell details

`electron/main.js` controls window lifecycle, menu, and IPC handlers.

Key responsibilities:

- Create and manage main window
- Apply window theme
- Handle file associations for `.lioradeck`
- Route app-menu navigation to renderer
- Execute desktop-only operations in main process

`electron/preload.cjs` exposes a minimal trusted API surface as `window.electronAPI`.

## 17. Security and reliability

Current baseline protections:

- Limited preload bridge
- Input validation for import payloads
- Remote import size limits
- Language and package format validation
- Integrity checks and guided recovery flow
- Normalized and bounded user-provided fields

Recommended guardrails for future work:

- Never place sensitive credentials in client code
- Keep preload API narrow
- Do not execute untrusted deck content

## 18. Run and build commands

### Development

- `pnpm run dev` for desktop workflow
- `pnpm run dev:web` for browser workflow

### Production builds

- `pnpm run build:desktop`
- `pnpm run build:web`

### Local web preview

- `pnpm run preview`

### Desktop packaging

- `pnpm run dist:test`
- `pnpm run dist:test:mac`
- `pnpm run dist:test:win`

### Quality checks

- `pnpm run lint`
- `pnpm run check:boundaries`
- `pnpm run check:persistence`

## 19. Safe extension workflow

A practical sequence for new features:

1. Add platform-agnostic business logic to `shared/core` when possible.
2. Extend repository contract if new IO is needed.
3. Implement both desktop and web adapters.
4. Connect feature/widget UI.
5. Run desktop and web build checks.

For desktop-only features:

1. Keep logic in Electron main.
2. Expose only required IPC methods through preload.
3. Return explicit unsupported errors in web mode.

## 20. Current boundaries

- Desktop and web use different persistence transports.
- Core business logic is shared.
- Some desktop operations are intentionally unavailable in browser mode.
- Full account-based sync is still in progress.

## 21. Best files to read first

If you are new to this codebase, start with:

- `src/main.jsx`
- `src/app/App.jsx`
- `src/app/layouts/AppLayout.jsx`
- `src/app/router/routes.jsx`
- `src/app/providers/PlatformProvider/PlatformProvider.jsx`
- `src/shared/platform/createPlatformServices.js`
- `src/shared/core/usecases/srs/srsEngine.js`
- `src/shared/core/usecases/importExport/deckPackage.js`
- `src/widgets/LearnFlashcardsPanel/model/useLearnFlashcardsPanel.js`
- `src/widgets/DeckEditorPanel/model/useDeckEditorPanel.js`
- `src/widgets/SettingsDatabasePanel/model/useSettingsDatabasePanel.js`
- `electron/main.js`
- `electron/preload.cjs`

## 22. Short summary

LioraLang already has a strong base for long-term growth.
The biggest strengths are shared business logic, clear platform boundaries, local-first storage, and a practical path for desktop plus web evolution.
If this architecture discipline is kept, the project can scale without major rewrites.
