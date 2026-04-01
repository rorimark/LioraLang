# LioraLang Dual-Platform Architecture

## Goal

One codebase, two full targets:
- Electron desktop app
- Browser web app

## Core Rules

1. `src/**` does not import `electron/*` directly.
2. UI (`pages/widgets/features/entities`) does not import `@shared/api` directly.
3. Platform calls go through `@app/providers -> usePlatformService(...)`.
4. Only `packages/shared/src/platform/**` can adapt platform specifics.

## Runtime Composition

1. `PlatformProvider` is mounted in app root.
2. Provider resolves services via `@shared/platform`.
3. `@platform-target` alias is injected by Vite:
   - `desktop` target -> `packages/shared/src/platform/target/desktop.js`
   - `web` target -> `packages/shared/src/platform/target/web.js`

## Service Contract (current)

- `deckRepository`
- `settingsRepository`
- `hubRepository`
- `srsRepository`
- `progressRepository`
- `systemRepository`
- `runtimeGateway`

## Build Modes

- `pnpm dev` -> desktop renderer + electron shell.
- `pnpm dev:web` -> pure web mode.
- `pnpm build:desktop` -> production desktop renderer.
- `pnpm build:web` -> production web bundle.

## Migration Strategy

Strangler approach:
1. Keep old transport (`shared/api`) as compatibility layer.
2. Move page/widget hooks to `usePlatformService`.
3. Replace desktop fallbacks in web adapters with native web repositories.
4. Extract pure business logic to `shared/core`.
