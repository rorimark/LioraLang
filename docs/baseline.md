# Baseline (2026-03-09)

## Commands

1. `pnpm run check:boundaries`
2. `pnpm run lint`
3. `pnpm run build:desktop`
4. `pnpm run build:web`

## Result

- `check:boundaries`: passed
- `lint`: passed
- `build:desktop`: passed
- `build:web`: passed

## Notes

- No direct `Electron`/`@shared/api` usage found outside `shared/platform`.

## Updated Build Snapshot (2026-03-09, migration continuation)

- `build:desktop`: passed
- `build:web`: passed
- `lint`: passed
- `check:boundaries`: passed

### Chunk sizes

- Desktop main chunk: `dist/assets/index-ve6mKuPD.js` - `326.51 kB` (gzip `104.16 kB`)
- Web main chunk: `dist/assets/index-bqpR-QFt.js` - `335.69 kB` (gzip `106.70 kB`)
- Hub lazy chunk: `dist/assets/hubDecksApi-Dxa0p5KV.js` - `179.85 kB` (gzip `48.27 kB`)

### Notes

- Chunk-size warning (`>500 kB`) is no longer present for both targets.
- Route-level lazy loading is active for all pages.
- Hub/Supabase code is lazy-loaded and no longer inflates the startup bundle.

## Updated Build Snapshot (2026-03-09, core extraction + web lazy repositories)

- `build:desktop`: passed
- `build:web`: passed
- `lint`: passed
- `check:boundaries`: passed

### Chunk sizes

- Desktop main chunk: `dist/assets/index-j5m85XRn.js` - `322.29 kB` (gzip `102.97 kB`)
- Web main chunk: `dist/assets/index-Db-pzCeR.js` - `338.61 kB` (gzip `108.42 kB`)
- Web lazy SRS chunk: `dist/assets/index-DqrNbOgx.js` - `12.11 kB` (gzip `3.96 kB`)
- Web lazy Progress chunk: `dist/assets/index-CHJMgw8Y.js` - `4.40 kB` (gzip `1.88 kB`)
- Hub lazy chunk: `dist/assets/hubDecksApi-Dxa0p5KV.js` - `179.85 kB` (gzip `48.27 kB`)

### Notes

- Import/export parsing and progress aggregation are moved to `shared/core/usecases`.
- Web `srsRepository` and `progressRepository` are lazy-loaded on first use.

## Updated Build Snapshot (2026-03-09, SRS core extraction)

- `build:desktop`: passed
- `build:web`: passed
- `lint`: passed
- `check:boundaries`: passed

### Chunk sizes

- Desktop main chunk: `dist/assets/index-j5m85XRn.js` - `322.29 kB` (gzip `102.97 kB`)
- Web main chunk: `dist/assets/index-Bm0N88tL.js` - `338.61 kB` (gzip `108.42 kB`)
- Web lazy SRS chunk: `dist/assets/index-IRvihUEx.js` - `12.85 kB` (gzip `4.16 kB`)
- Web lazy Progress chunk: `dist/assets/index-DNfNPym9.js` - `4.40 kB` (gzip `1.89 kB`)
- Hub lazy chunk: `dist/assets/hubDecksApi-Dxa0p5KV.js` - `179.85 kB` (gzip `48.27 kB`)

### Notes

- SRS rules/normalization/session selection moved to `shared/core/usecases/srs`.
- Web SRS repository now contains only IndexedDB transport + transaction flow.
- Random queue shuffle in `always` mode uses Fisher-Yates instead of `Array.sort(() => Math.random() - 0.5)`.

## Updated Build Snapshot (2026-03-09, import/export + LLH hardening)

- `build:desktop`: passed
- `build:web`: passed
- `lint`: passed
- `check:boundaries`: passed

### Chunk sizes

- Desktop main chunk: `dist/assets/index-sFkB6jQH.js` - `322.29 kB` (gzip `102.97 kB`)
- Web main chunk: `dist/assets/index-Bxfi8S_8.js` - `340.15 kB` (gzip `108.93 kB`)
- Web lazy SRS chunk: `dist/assets/index-DZ3pjcAj.js` - `12.90 kB` (gzip `4.18 kB`)
- Web lazy Progress chunk: `dist/assets/index-DVf9PSt6.js` - `4.40 kB` (gzip `1.89 kB`)
- Hub lazy chunk: `dist/assets/hubDecksApi-CYdtyaAm.js` - `180.65 kB` (gzip `48.65 kB`)

### Notes

- Import/export parsing is shared in `shared/core/usecases/importExport` for web and desktop.
- Added strict package checks (format/version/word count limits) and safer web import URL/file handling (size limits + timeout).
- LLH publish now avoids duplicate versions when checksum+word count match latest uploaded version.
