# Setup, checks and releases

**English** | [Русский](onboarding.ru.md) | [Polski](onboarding.pl.md)

This guide covers LioraLang 0.9.1. The project uses Node.js, pnpm and Vitest. Bun is not the main build or test tool.

## Requirements

- Node.js 22.12 or newer; Node.js 24 works. Release CI uses Node.js 22.
- pnpm 10.33.0, matching release CI.
- Electron needs a graphical environment and native `better-sqlite3` compilation support, possibly OS build tools.
- Browser acceptance needs a separate Playwright and Chromium installation; they are not project dependencies.

Install pnpm if needed with `npm install --global pnpm@10.33.0`. Do not rewrite the lockfile with another major package-manager version incidentally.

## Install and run

```sh
git clone https://github.com/rorimark/LioraLang.git
cd LioraLang
pnpm install --frozen-lockfile
pnpm dev:web
```

Web runs at `http://localhost:5175`. The port is strict; free it or explicitly run Vite on another port. Do not terminate unrelated processes by a broad name match.

Desktop:

```sh
pnpm rebuild:native
pnpm dev
```

`dev` launches renderer and Electron. `dev:renderer` and `dev:electron` can run separately for debugging. Native rebuild targets the Electron version in `package.json`. For an ABI mismatch, rebuild rather than copying an arbitrary binary.

`setup:web` and `setup:desktop` are dependency-install shortcuts, not distinct platform configurators.

## Online features

Local editing and reviews need no Supabase. For account, Hub, sync and AI, create an uncommitted `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-publishable-key
```

These are public client settings. `VITE_` variables enter the bundle, so never put service role, Gemini keys or other secrets there.

`.env.web` and `.env.desktop` set `VITE_APP_TARGET`. Restart Vite after local env changes. Configure allowed authentication return URLs for localhost and production. Desktop OAuth uses the system browser and loopback.

[Supabase setup](../supabase/README.md) covers schemas and secrets. Client configuration alone does not configure the server function.

## Builds

| Command | Result |
| --- | --- |
| `pnpm build:web` | Web bundle, SSR, static landing pages and resource manifest |
| `pnpm build:desktop` | Renderer for packaged Electron |
| `pnpm build` | Alias for desktop build |
| `pnpm preview:web` | New web build, then preview on strict port 4175 |
| `pnpm dist:local:mac` | macOS ARM64 `.dmg` and `.zip` |
| `pnpm dist:local:win` | Windows x64 NSIS |
| `pnpm dist:local` | Both targets; needs a suitable cross-platform build environment |

Outputs are `dist/`, `dist-ssr/`, `release/`. Do not commit build artifacts as source. Building on one OS does not verify the other OS's installer.

## Fast checks

```sh
pnpm lint
pnpm check:boundaries
pnpm check:layers
pnpm check:i18n
pnpm test:run
```

`test` watches, `test:run` runs once, `test:coverage` records coverage. `:verbose` and `:report` variants change reporting. Tests do not prove real AI availability or production server configuration.

## SQLite and persistence

```sh
pnpm check:srs
pnpm check:persistence
pnpm check:media
pnpm check:subjects
```

These run through Electron with separate test data. `check:subjects` covers fields, import/export and session entries. Storage changes need both platforms, not just normalization unit tests.

## Browser acceptance

Scripts must resolve Playwright. For a separate install, set `NODE_PATH` to its module directory. `PLAYWRIGHT_CHROMIUM` can point to a Chromium executable. Browser and local-server execution must be permitted.

After `pnpm build:web`:

```sh
pnpm check:offline-programming
pnpm check:offline-knowledge
pnpm check:technology-appearances
```

Offline scenarios use production preview, cache online and disconnect. Technology checks exercise appearance variants. Build web immediately before them: both targets overwrite `dist/`.

AI scenarios start their own dev server and mock Supabase responses:

```sh
pnpm check:subject-assistant
pnpm check:subject-topic
```

They verify UI, fields, save, cancellation and preferences without consuming real allowance. They do not evaluate Gemini quality. Ports and environment details are in `scripts/acceptance/`; `ACCEPTANCE_PORT` overrides a busy port.

## Debugging

| Symptom | Inspect |
| --- | --- |
| Page error | Console, Network, widget model, RouteErrorBoundary |
| Subject field not saved | Profile, normalization, `saveDeck` payload, both stores |
| Wrong queue | SRS core, log, local day, revision and profileScope |
| AI failure | Function reply, session, flags, allowance, server secret, function logs |
| Offline JSON returns HTML | Manifest path, `vercel.json`, service worker |
| Packaged desktop fails | `app.asar` dependencies, SQLite ABI, main-process logs |

Record reproducible steps and error status. Remove tokens, secrets and personal data from reports. Do not clear a user database to fix persistence without a backup.

## Desktop releases

1. Update `package.json` and add `docs/releases/vX.Y.Z.md`, including user-visible changes and compatibility. Add Russian and Polish companion notes too.
2. Run relevant checks, both builds and the [smoke checklist](smoke-checklist.md).
3. Commit using Conventional Commits. Package version must match `vX.Y.Z`.
4. Run `.github/workflows/release.yml` through a tag or workflow_dispatch.
5. Verify macOS/Windows jobs, packaged dependency checks and publishing.
6. Check installers, `.blockmap`, `latest-mac.yml` and `latest.yml` on the release page.

The workflow uses Node.js 22, pnpm 10.33.0 and frozen lockfiles. Supabase client settings come from secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`. GitHub token grants publication rights.

`release:notes` drafts `release/RELEASE_NOTES.md` from Git history. `release:publish` publishes local artifacts with `gh`, writing to GitHub. Prefer the workflow with OS-specific runners. Neither script replaces useful primary notes in `docs/releases/`.

There is a release workflow, but no separate general CI workflow for the entire test suite. A successful release build does not mean all acceptance scenarios ran.

## Web and server

`vercel.json` configures web routing. Production serves bundles, static pages and JSON `/asset-manifest.json`; `/app/` routes serve the app shell. Verify updated versions and old-cache startup.

React deployments do not deploy Edge Functions or apply SQL migrations. Update the server separately. [Server workflow](../supabase/README.md) · [Commit rules](../rules/git-and-commits-rules.md)
