# Smoke Checklist

## Desktop (`pnpm dev`)

1. App window opens without runtime errors.
2. Decks list loads.
3. Deck create/edit/save works.
4. Learn session loads, card can be graded.
5. Settings save and persist.
6. Import/export flows open and complete.

## Web (`pnpm dev:web`)

1. App opens in browser.
2. Routes render (`Learn`, `Decks`, `Browse`, `Progress`, `Settings`).
3. Settings reads/writes without crash.
4. No desktop-only actions execute silently; errors are explicit.

## Build

1. `pnpm run check:boundaries`
2. `pnpm run lint`
3. `pnpm run build:desktop`
4. `pnpm run build:web`
