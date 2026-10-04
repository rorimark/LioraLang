# Web and desktop contract

**English** | [Русский](architecture-dual-platform.ru.md) | [Polski](architecture-dual-platform.pl.md)

UI uses the same services on both platforms. Transport differs: web uses browser storage, desktop uses the Electron API. Domain rules stay shared.

## Platform composition

1. Vite chooses `@platform-target` for the build mode.
2. `platform/target/web.js` or `desktop.js` creates services.
3. `PlatformProvider` from `@shared/providers` supplies them to the app.
4. UI models call `usePlatformService("serviceName")`.

Implementations:

- `packages/shared/src/platform/web/createWebPlatformServices.js`.
- `packages/shared/src/platform/electron/createElectronPlatformServices.js`.
- `packages/shared/src/providers/PlatformProvider/`.

## Available services

| Service | Purpose |
| --- | --- |
| `authRepository` | Account and authentication state |
| `deckRepository` | Decks, entries, import and export |
| `mediaRepository` | Images and change notifications |
| `settingsRepository` | App settings |
| `hubRepository` | Public decks and publishing |
| `srsRepository` | Queue and grade persistence |
| `progressRepository` | Statistics and deck learning state |
| `syncRepository` | Private library and progress exchange |
| `systemRepository` | Desktop database path, folders and integrity checks |
| `wordSuggestRepository` | Server suggestions and generation |
| `runtimeGateway` | Window, version, runtime events and updates |

Web cannot open database folders, relocate SQLite or install desktop updates. Adapters report unsupported capabilities clearly; UI should handle this instead of trying Electron from the browser.

Auth and AI use shared Supabase APIs. Hub currently uses the shared web implementation on desktop too. Not every desktop network call goes through IPC.

## Change rules

- Do not import `electron/` from `src/` or call `window.electronAPI` in components.
- Do not call `@shared/api` directly from pages, widgets or features.
- Put new normalization, SRS and format rules in the shared core first.
- Update both adapters and persistence checks when changing a contract.
- Label desktop-only system functions accordingly in UI.

Run `pnpm dev:web` for web and `pnpm dev` for desktop. Build with `pnpm build:web` and `pnpm build:desktop`. [Setup](onboarding.md) · [Storage](platforms-and-storage.md)
